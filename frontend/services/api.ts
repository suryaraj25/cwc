import axios from 'axios';
import { User, Team, VotingConfig } from '../types';

const API_BASE = 'http://localhost:5000/api';

// Create an axios instance with credentials support
const apiClient = axios.create({
    baseURL: API_BASE,
    withCredentials: true // send cookies with requests
});

// Add response interceptor to handle unauthorized errors globally
// Interceptor removed to prevent auto-redirects on 401 (e.g. during checkSession)
// apiClient.interceptors.response.use...

export const api = {
    // Auth
    register: async (userData: any): Promise<{ success: boolean; message: string; user?: User }> => {
        const res = await apiClient.post(`/auth/register`, userData);
        return res.data;
    },

    login: async (identifier: string, passwordHash: string): Promise<{ success: boolean; message: string; user?: User; token?: string }> => {
        try {
            const res = await apiClient.post(`/auth/login`, { identifier, passwordHash });
            return res.data;
        } catch (error: any) {
            if (error.response && error.response.data) {
                return error.response.data;
            }
            throw error;
        }
    },

    adminLogin: async (username: string, password: string): Promise<{ success: boolean; message: string; adminId?: string; role?: string; admin?: User }> => {
        try {
            const res = await apiClient.post(`/auth/admin-login`, { username, password });
            return res.data;
        } catch (error: any) {
            if (error.response && error.response.data) {
                return error.response.data;
            }
            throw error;
        }
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

    checkAdminSession: async (): Promise<{ success: boolean; adminId?: string; role?: string }> => {
        try {
            const res = await apiClient.get(`/auth/admin-me`);
            return res.data;
        } catch (error: any) {
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                return { success: false };
            }
            throw error;
        }
    },

    getUserById: async (id: string): Promise<User | null> => {
        const res = await apiClient.get(`/auth/${id}`);
        return res.data;
    },

    changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
        try {
            const res = await apiClient.post(`/auth/change-password`, { currentPassword, newPassword });
            return res.data;
        } catch (error: any) {
            if (error.response && error.response.data) {
                return error.response.data;
            }
            throw error;
        }
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
    getVotingConfig: async (): Promise<VotingConfig> => {
        // Authenticated request to get user-specific quota if logged in
        const res = await apiClient.get(`/voting/config`);
        return res.data;
    },

    castVote: async (userId: string, votes: Record<string, number>): Promise<{ success: boolean; message: string }> => {
        const res = await apiClient.post(`/voting/cast`, { userId, votes });
        return res.data;
    },

    // Admin
    getAdminData: async (search = ''): Promise<{ users: User[], totalUsers: number, teams: Team[], config: VotingConfig, teamVotes: Record<string, number>, deviceCount: number }> => {
        const res = await apiClient.get(`/admin/dashboard?search=${encodeURIComponent(search)}`);
        return res.data;
    },

    updateConfig: async (config: any): Promise<VotingConfig> => {
        const res = await apiClient.post(`/admin/config`, config);
        return res.data;
    },

    revokeDevice: async (userId: string): Promise<{ success: boolean }> => {
        const res = await apiClient.post(`/admin/revoke-device`, { userId });
        return res.data;
    },

    deleteUserVotes: async (userId: string): Promise<{ success: boolean; message: string }> => {
        const res = await apiClient.delete(`/admin/users/${userId}/votes`);
        return res.data;
    },

    deleteUserTeamVotes: async (userId: string, teamId: string): Promise<{ success: boolean; message: string }> => {
        const res = await apiClient.delete(`/admin/users/${userId}/votes/${teamId}`);
        return res.data;
    },

    resetPassword: async (userId: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
        const res = await apiClient.post(`/admin/reset-password`, { userId, newPassword });
        return res.data;
    },

    deleteUser: async (userId: string): Promise<{ success: boolean; message: string }> => {
        const res = await apiClient.delete(`/admin/users/${userId}`);
        return res.data;
    },

    forceLogoutUser: async (userId: string): Promise<{ success: boolean; message: string }> => {
        const res = await apiClient.post(`/admin/logout-user`, { userId });
        return res.data;
    },

    // Admin Management
    getAdmins: async (): Promise<{ success: boolean; admins: any[] }> => {
        const res = await apiClient.get('/admin/admins');
        return res.data;
    },

    createAdmin: async (data: any): Promise<{ success: boolean; message: string; admin: any }> => {
        const res = await apiClient.post('/admin/admins', data);
        return res.data;
    },

    deleteAdmin: async (adminId: string): Promise<{ success: boolean; message: string }> => {
        const res = await apiClient.delete(`/admin/admins/${adminId}`);
        return res.data;
    },

    resetAdminPassword: async (adminId: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
        const res = await apiClient.post('/admin/admins/reset-password', { adminId, newPassword });
        return res.data;
    },

    forceLogoutAdmin: async (adminId: string): Promise<{ success: boolean; message: string }> => {
        const res = await apiClient.post('/admin/admins/logout', { adminId });
        return res.data;
    },

    getTransactions: async (page = 1, limit = 20, search = ''): Promise<{ transactions: any[], total: number, currentPage: number, totalPages: number }> => {
        const res = await apiClient.get(`/admin/transactions?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        return res.data;
    },

    getAuditLogs: async (page = 1, limit = 20, search = ''): Promise<{ logs: any[], total: number, currentPage: number, totalPages: number }> => {
        const res = await apiClient.get(`/admin/audit-logs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        return res.data;
    },

    checkEmail: async (email: string): Promise<{ success: boolean; isWhitelisted: boolean }> => {
        try {
            const res = await apiClient.get(`/auth/check-email?email=${encodeURIComponent(email)}`);
            return res.data;
        } catch (error: any) {
            return { success: false, isWhitelisted: false };
        }
    },

    // Leaderboard
    getLeaderboard: async (): Promise<any> => {
        const res = await apiClient.get(`/leaderboard`);
        return res.data;
    },

    getLeaderboardByDateRange: async (startDate: string, endDate: string): Promise<any> => {
        const res = await apiClient.get(`/leaderboard/range?startDate=${startDate}&endDate=${endDate}`);
        return res.data;
    },

    getDailyLeaderboard: async (date?: string): Promise<any> => {
        const url = date ? `/leaderboard/daily?date=${date}` : `/leaderboard/daily`;
        const res = await apiClient.get(url);
        return res.data;
    },

    // Admin: Leaderboard Management
    submitTeamScore: async (teamId: string, scores: { advantage: number, main: number, special: number, elimination: number, immunity: number }, date?: string, notes?: string): Promise<any> => {
        const res = await apiClient.post(`/leaderboard/scores`, { teamId, ...scores, date, notes });
        return res.data;
    },

    getAdminScores: async (teamId?: string, startDate?: string, endDate?: string, page = 1, limit = 20): Promise<any> => {
        let url = `/leaderboard/scores?page=${page}&limit=${limit}`;
        if (teamId) url += `&teamId=${teamId}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        const res = await apiClient.get(url);
        return res.data;
    },

    deleteTeamScore: async (scoreId: string): Promise<any> => {
        const res = await apiClient.delete(`/leaderboard/scores/${scoreId}`);
        return res.data;
    },

    getScoresSummary: async (): Promise<any> => {
        const res = await apiClient.get(`/leaderboard/scores-summary`);
        return res.data;
    },
    // Whitelist Management
    getWhitelist: async (): Promise<any[]> => {
        const res = await apiClient.get("/admin/whitelist");
        return res.data.emails;
    },

    addToWhitelist: async (emails: string[]): Promise<any> => {
        const res = await apiClient.post("/admin/whitelist", { emails });
        return res.data;
    },

    removeFromWhitelist: async (id: string): Promise<any> => {
        const res = await apiClient.delete(`/admin/whitelist/${id}`);
        return res.data;
    },

    // Blacklist Management
    getBlacklist: async (): Promise<any[]> => {
        const res = await apiClient.get("/admin/blacklist");
        return res.data.users;
    },

    removeFromBlacklist: async (id: string): Promise<any> => {
        const res = await apiClient.delete(`/admin/blacklist/${id}`);
        return res.data;
    },

    // User Approval & Blocking
    getPendingUsers: async (): Promise<User[]> => {
        const res = await apiClient.get("/admin/users/pending");
        return res.data.users;
    },

    approveUser: async (userId: string): Promise<any> => {
        const res = await apiClient.post(`/admin/users/${userId}/approve`);
        return res.data;
    },

    assignTeam: async (userId: string, teamId: string | null): Promise<any> => {
        const res = await apiClient.post(`/admin/users/${userId}/assign-team`, { teamId });
        return res.data;
    },

    blockUser: async (userId: string, reason?: string): Promise<any> => {
        const res = await apiClient.post(`/admin/users/${userId}/block`, {
            reason,
        });
        return res.data;
    },
};
