export interface User {
  id: string; // generated UUID
  name: string;
  rollNo: string;
  dept: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  year: string;
  passwordHash: string; // In real app, hash. Here, plain text for simulation.
  boundDeviceId: string | null;
  votes: Record<string, number>; // teamId -> count
  lastVotedAt?: string;
  currentSessionToken?: string;
  mustChangePassword?: boolean;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface VotingConfig {
  isVotingOpen: boolean;
  startTime: string | null;
  endTime: string | null;
  dailyQuota: number;
}

export interface DeviceRegistry {
  [deviceId: string]: string; // deviceId -> userId
}

export enum UserRole {
  GUEST = 'GUEST',
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN'
}

export interface AuthState {
  role: UserRole;
  user: User | null;
  adminId: string | null;
}

export interface AdminUser {
  username: string;
  role: 'SERVER';
}
