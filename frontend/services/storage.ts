import { User, Team, VotingConfig, DeviceRegistry, VotingConfig as ConfigType } from '../types';
import { STORAGE_KEYS, INITIAL_TEAMS, DUMMY_USERS, DUMMY_DEVICES } from '../constants';

// --- Helpers ---
const generateUUID = () => crypto.randomUUID();

const DEFAULT_CONFIG: VotingConfig = {
  isVotingOpen: false,
  startTime: null,
  endTime: null,
  dailyQuota: 100,
};

const getLocalStorage = <T>(key: string, initialValue: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored || stored === "undefined" || stored === "null") {
    localStorage.setItem(key, JSON.stringify(initialValue));
    return initialValue;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error(`Error parsing storage for ${key}, resetting.`, e);
    localStorage.setItem(key, JSON.stringify(initialValue));
    return initialValue;
  }
};

const setLocalStorage = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Error saving to localStorage", e);
  }
};

// --- Initialization ---

export const initializeStorage = () => {
  // Check if users exist. If empty array (from previous empty init), seed with dummy data.
  const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
  let users: User[] = [];
  
  if (!storedUsers || storedUsers === '[]') {
      users = DUMMY_USERS;
      setLocalStorage(STORAGE_KEYS.USERS, DUMMY_USERS);
      
      // Also seed devices if users are being seeded
      const storedDevices = localStorage.getItem(STORAGE_KEYS.DEVICES);
      if (!storedDevices || storedDevices === '{}') {
          setLocalStorage(STORAGE_KEYS.DEVICES, DUMMY_DEVICES);
      }
  } else {
      users = getLocalStorage<User[]>(STORAGE_KEYS.USERS, []);
      getLocalStorage<DeviceRegistry>(STORAGE_KEYS.DEVICES, {});
  }
  
  getLocalStorage<Team[]>(STORAGE_KEYS.TEAMS, INITIAL_TEAMS);
  getLocalStorage<ConfigType>(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);

  // Ensure this browser has a unique hardware ID
  let deviceId = localStorage.getItem(STORAGE_KEYS.CURRENT_DEVICE_ID);
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem(STORAGE_KEYS.CURRENT_DEVICE_ID, deviceId);
  }
};

export const getThisDeviceId = (): string => {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_DEVICE_ID) || 'unknown-device';
};

// --- Session Management ---

export const getSessionUser = (): User | null => {
  try {
    const devices = getLocalStorage<DeviceRegistry>(STORAGE_KEYS.DEVICES, {});
    const currentDeviceId = getThisDeviceId();
    const userId = devices[currentDeviceId];

    if (!userId) return null;

    const users = getLocalStorage<User[]>(STORAGE_KEYS.USERS, []);
    return users.find(u => u.id === userId) || null;
  } catch (e) {
    console.error("Session restore failed", e);
    return null;
  }
};

// --- User Services ---

export const registerUser = (userData: Omit<User, 'id' | 'boundDeviceId' | 'votes'>): { success: boolean; message: string; user?: User } => {
  const users = getLocalStorage<User[]>(STORAGE_KEYS.USERS, []);
  const devices = getLocalStorage<DeviceRegistry>(STORAGE_KEYS.DEVICES, {});
  const currentDeviceId = getThisDeviceId();

  // 1. Check if email/rollNo already exists
  if (users.find(u => u.email === userData.email || u.rollNo === userData.rollNo)) {
    return { success: false, message: 'User with this Email or Roll No already exists.' };
  }

  // 2. Check if this device is already bound to another user
  const existingUserOnDevice = devices[currentDeviceId];
  if (existingUserOnDevice) {
    // Check if the user ID actually exists in users array (cleanup orphan bindings)
    const userExists = users.some(u => u.id === existingUserOnDevice);
    if (userExists) {
        return { success: false, message: 'This device is already registered to another account. One device, one account policy.' };
    }
  }

  // 3. Create User
  const newUser: User = {
    ...userData,
    id: generateUUID(),
    boundDeviceId: currentDeviceId,
    votes: {},
    lastVotedAt: undefined
  };

  users.push(newUser);
  devices[currentDeviceId] = newUser.id;

  setLocalStorage(STORAGE_KEYS.USERS, users);
  setLocalStorage(STORAGE_KEYS.DEVICES, devices);

  return { success: true, message: 'Registration Successful', user: newUser };
};

export const loginUser = (identifier: string, passwordHash: string): { success: boolean; message: string; user?: User } => {
  const users = getLocalStorage<User[]>(STORAGE_KEYS.USERS, []);
  const devices = getLocalStorage<DeviceRegistry>(STORAGE_KEYS.DEVICES, {});
  const currentDeviceId = getThisDeviceId();

  // 1. Find User
  const user = users.find(u => (u.email === identifier || u.rollNo === identifier) && u.passwordHash === passwordHash);
  
  if (!user) {
    return { success: false, message: 'Invalid Credentials.' };
  }

  // 2. Check Device Lock
  if (user.boundDeviceId && user.boundDeviceId !== currentDeviceId) {
    return { success: false, message: 'Security Alert: This account is locked to another device. Contact Admin to reset.' };
  }

  // 3. Check if device is being used by another user
  const deviceOwnerId = devices[currentDeviceId];
  if (deviceOwnerId && deviceOwnerId !== user.id) {
     return { success: false, message: 'Security Alert: This device is already bound to another account.' };
  }

  // 4. Bind if not bound (e.g. after admin reset)
  if (!user.boundDeviceId) {
    if (deviceOwnerId && deviceOwnerId !== user.id) {
       return { success: false, message: 'Device unavailable for binding.' };
    }
    user.boundDeviceId = currentDeviceId;
    devices[currentDeviceId] = user.id;
    
    // Update storage
    const updatedUsers = users.map(u => u.id === user.id ? user : u);
    setLocalStorage(STORAGE_KEYS.USERS, updatedUsers);
    setLocalStorage(STORAGE_KEYS.DEVICES, devices);
  }

  return { success: true, message: 'Login Successful', user };
};

export const getUserById = (userId: string): User | undefined => {
  const users = getLocalStorage<User[]>(STORAGE_KEYS.USERS, []);
  return users.find(u => u.id === userId);
};

// --- Voting Services ---

export const castVotes = (userId: string, newVotes: Record<string, number>): { success: boolean; message: string } => {
  const users = getLocalStorage<User[]>(STORAGE_KEYS.USERS, []);
  const config = getLocalStorage<ConfigType>(STORAGE_KEYS.CONFIG, { isVotingOpen: false } as ConfigType);

  // 1. Check Global Switch
  if (!config.isVotingOpen) {
    return { success: false, message: 'Voting is currently closed by Admin.' };
  }

  // 2. Check Time Window
  if (config.startTime && config.endTime) {
      const now = new Date();
      const start = new Date(config.startTime);
      const end = new Date(config.endTime);
      if (now < start || now > end) {
          return { success: false, message: 'Voting is only allowed between the scheduled times.' };
      }
  }

  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) return { success: false, message: 'User not found.' };

  const user = users[userIndex];

  // 3. CHECK: Has user voted today?
  if (user.lastVotedAt) {
    const lastDate = new Date(user.lastVotedAt).toDateString();
    const todayDate = new Date().toDateString();
    if (lastDate === todayDate) {
      return { success: false, message: 'You have already utilized your voting chance for today. Please come back tomorrow.' };
    }
  }

  const totalNewVotes = Object.values(newVotes).reduce((a, b) => a + b, 0);
  if (totalNewVotes > config.dailyQuota) {
    return { success: false, message: `Cannot exceed ${config.dailyQuota} votes per day.` };
  }
  if (totalNewVotes === 0) {
    return { success: false, message: `You must cast at least one vote.` };
  }

  // ACCUMULATE VOTES
  const currentVotes = user.votes || {};
  Object.entries(newVotes).forEach(([teamId, count]) => {
    if (currentVotes[teamId]) {
      currentVotes[teamId] += count;
    } else {
      currentVotes[teamId] = count;
    }
  });

  users[userIndex].votes = currentVotes;
  users[userIndex].lastVotedAt = new Date().toISOString();
  
  setLocalStorage(STORAGE_KEYS.USERS, users);

  return { success: true, message: 'Votes confirmed and locked successfully.' };
};

// --- Team Management Services ---

export const addTeam = (team: Omit<Team, 'id'>) => {
  const teams = getLocalStorage<Team[]>(STORAGE_KEYS.TEAMS, INITIAL_TEAMS);
  const newTeam: Team = { ...team, id: generateUUID() };
  teams.push(newTeam);
  setLocalStorage(STORAGE_KEYS.TEAMS, teams);
  return newTeam;
};

export const updateTeam = (teamId: string, updates: Partial<Team>) => {
  const teams = getLocalStorage<Team[]>(STORAGE_KEYS.TEAMS, INITIAL_TEAMS);
  const updatedTeams = teams.map(t => t.id === teamId ? { ...t, ...updates } : t);
  setLocalStorage(STORAGE_KEYS.TEAMS, updatedTeams);
};

export const deleteTeam = (teamId: string) => {
  const teams = getLocalStorage<Team[]>(STORAGE_KEYS.TEAMS, INITIAL_TEAMS);
  const updatedTeams = teams.filter(t => t.id !== teamId);
  setLocalStorage(STORAGE_KEYS.TEAMS, updatedTeams);
};

// --- Admin Services ---

export const getAdminData = () => {
  const users = getLocalStorage<User[]>(STORAGE_KEYS.USERS, []);
  const teams = getLocalStorage<Team[]>(STORAGE_KEYS.TEAMS, INITIAL_TEAMS);
  const config = getLocalStorage<ConfigType>(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
  const devices = getLocalStorage<DeviceRegistry>(STORAGE_KEYS.DEVICES, {});

  // Calculate stats
  const teamVotes: Record<string, number> = {};
  teams.forEach(t => teamVotes[t.id] = 0);
  
  users.forEach(u => {
    Object.entries(u.votes).forEach(([teamId, count]) => {
      // Only count votes for teams that currently exist (handle deleted teams)
      if (teamVotes[teamId] !== undefined) {
        teamVotes[teamId] += count;
      }
    });
  });

  return { users, teams, config, teamVotes, devices };
};

export const updateConfig = (newConfig: Partial<ConfigType>) => {
  const config = getLocalStorage<ConfigType>(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
  const updated = { ...config, ...newConfig };
  setLocalStorage(STORAGE_KEYS.CONFIG, updated);
  return updated;
};

export const revokeDevice = (userId: string) => {
  const users = getLocalStorage<User[]>(STORAGE_KEYS.USERS, []);
  const devices = getLocalStorage<DeviceRegistry>(STORAGE_KEYS.DEVICES, {});
  
  const user = users.find(u => u.id === userId);
  if (!user) return false;

  if (user.boundDeviceId) {
    // Remove from devices map
    delete devices[user.boundDeviceId];
    // Clear user binding
    user.boundDeviceId = null;
    
    const updatedUsers = users.map(u => u.id === userId ? user : u);
    setLocalStorage(STORAGE_KEYS.USERS, updatedUsers);
    setLocalStorage(STORAGE_KEYS.DEVICES, devices);
    return true;
  }
  return false;
};