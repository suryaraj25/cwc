import { User, Team, VotingConfig } from '../types';

const API_BASE = 'https://cwc-b4ir.onrender.com/api';
const DEVICE_ID_KEY = 'cwc_voting_device_id';

export const getThisDeviceId = (): string => {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
};

export const api = {
    // Auth
    register: async (userData: any): Promise<{ success: boolean; message: string; user?: User }> => {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        return res.json();
    },

    login: async (identifier: string, passwordHash: string, deviceId: string): Promise<{ success: boolean; message: string; user?: User }> => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, passwordHash, deviceId }),
        });
        return res.json();
    },

    adminLogin: async (username: string, password: string): Promise<{ success: boolean; message: string; adminId?: string }> => {
        const res = await fetch(`${API_BASE}/auth/admin-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        return res.json();
    },

    checkSession: async (deviceId: string): Promise<{ user: User | null }> => {
        const res = await fetch(`${API_BASE}/auth/me?deviceId=${deviceId}`);
        return res.json();
    },

    getUserById: async (id: string): Promise<User | null> => {
        const res = await fetch(`${API_BASE}/auth/${id}`);
        return res.json();
    },

    // Teams
    getTeams: async (): Promise<Team[]> => {
        const res = await fetch(`${API_BASE}/teams`);
        return res.json();
    },

    addTeam: async (team: any): Promise<Team> => {
        const res = await fetch(`${API_BASE}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(team),
        });
        return res.json();
    },

    updateTeam: async (id: string, updates: any): Promise<Team> => {
        const res = await fetch(`${API_BASE}/teams/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        return res.json();
    },

    deleteTeam: async (id: string): Promise<void> => {
        await fetch(`${API_BASE}/teams/${id}`, { method: 'DELETE' });
    },

    // Voting
    castVote: async (userId: string, votes: Record<string, number>): Promise<{ success: boolean; message: string }> => {
        const res = await fetch(`${API_BASE}/voting/cast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, votes }),
        });
        return res.json();
    },

    // Admin
    getAdminData: async (): Promise<{ users: User[], teams: Team[], config: VotingConfig, teamVotes: Record<string, number>, deviceCount: number }> => {
        const res = await fetch(`${API_BASE}/admin/dashboard`);
        return res.json();
    },

    updateConfig: async (config: any): Promise<VotingConfig> => {
        const res = await fetch(`${API_BASE}/admin/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        return res.json();
    },

    revokeDevice: async (userId: string): Promise<{ success: boolean }> => {
        const res = await fetch(`${API_BASE}/admin/revoke-device`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        return res.json();
    }
};
