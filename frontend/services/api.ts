import axios from 'axios';
import { User, Team, VotingConfig } from '../types';

const API_BASE = 'http://localhost:5000/api';

// Create an axios instance with credentials support
const apiClient = axios.create({
    baseURL: API_BASE,
    withCredentials: true // send cookies with requests
});

export const api = {
    // Auth
    register: async (userData: any): Promise<{ success: boolean; message: string; user?: User }> => {
        const res = await apiClient.post(`/auth/register`, userData);
        return res.data;
    },

    login: async (identifier: string, passwordHash: string): Promise<{ success: boolean; message: string; user?: User; token?: string }> => {
        const res = await apiClient.post(`/auth/login`, { identifier, passwordHash });
        // No localStorage setItem needed, cookie is set automatically
        return res.data;
    },

    adminLogin: async (username: string, password: string): Promise<{ success: boolean; message: string; adminId?: string }> => {
        const res = await apiClient.post(`/auth/admin-login`, { username, password });
        return res.data;
    },

    logout: async (user: User): Promise<{ success: boolean; message: string }> => {
        try {
            await apiClient.post(`/auth/logout`, user);
            return { success: true, message: 'Logout Successful' };
        } catch (e) {
            return { success: false, message: 'Logout failed locally' };
        }
    },

    adminLogout: async (): Promise<{ success: boolean; message: string }> => {
        try {
            const res = await apiClient.post(`/auth/admin-logout`);
            return res.data;
        } catch (e) {
            return { success: false, message: 'Logout failed locally' };
        }
    },

    checkSession: async (): Promise<{ user: User | null, votesUsedToday?: number }> => {
        // No token check from localStorage needed
        try {
            const res = await apiClient.get(`/auth/me`);
            return res.data;
        } catch (error: any) {
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                return { user: null };
            }
            throw error;
        }
    },

    getUserById: async (id: string): Promise<User | null> => {
        const res = await apiClient.get(`/auth/${id}`);
        return res.data;
    },

    // Teams
    getTeams: async (): Promise<Team[]> => {
        const res = await apiClient.get(`/teams`);
        return res.data;
    },

    addTeam: async (team: any): Promise<Team> => {
        const res = await apiClient.post(`/teams`, team);
        return res.data;
    },

    updateTeam: async (id: string, updates: any): Promise<Team> => {
        const res = await apiClient.put(`/teams/${id}`, updates);
        return res.data;
    },

    deleteTeam: async (id: string): Promise<void> => {
        await apiClient.delete(`/teams/${id}`);
    },

    // Voting
    castVote: async (userId: string, votes: Record<string, number>): Promise<{ success: boolean; message: string }> => {
        const res = await apiClient.post(`/voting/cast`, { userId, votes });
        return res.data;
    },

    // Admin
    getAdminData: async (): Promise<{ users: User[], teams: Team[], config: VotingConfig, teamVotes: Record<string, number>, deviceCount: number }> => {
        const res = await apiClient.get(`/admin/dashboard`);
        return res.data;
    },

    updateConfig: async (config: any): Promise<VotingConfig> => {
        const res = await apiClient.post(`/admin/config`, config);
        return res.data;
    },

    revokeDevice: async (userId: string): Promise<{ success: boolean }> => {
        const res = await apiClient.post(`/admin/revoke-device`, { userId });
        return res.data;
    }
};
