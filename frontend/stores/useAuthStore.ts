import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, UserRole, AuthState } from '../types';
import { api } from '../services/api';

interface AuthStore extends AuthState {
    role: UserRole;
    user: User | null;
    adminId: string | null;
    adminRole: string | null;
    isLoading: boolean;
    login: (user: User) => void;
    adminLogin: (adminId: string, role: string) => void;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            role: UserRole.GUEST,
            user: null,
            adminId: null,
            adminRole: null, // Add adminRole
            isLoading: true, // Start loading by default to prevent premature redirects

            login: (user: User) => {
                set({ role: UserRole.STUDENT, user, adminId: null, adminRole: null });
            },

            adminLogin: (adminId: string, role: string) => {
                set({ role: UserRole.ADMIN, user: null, adminId, adminRole: role });
            },

            logout: async () => {
                const { role, user } = get();
                try {
                    if (role === UserRole.STUDENT && user) {
                        await api.logout(user);
                    } else if (role === UserRole.ADMIN) {
                        await api.adminLogout();
                    }
                } catch (error) {
                    console.error('Logout failed:', error);
                }

                // Clear local state
                set({ role: UserRole.GUEST, user: null, adminId: null, adminRole: null });
                localStorage.removeItem('cwc_voting_user_id');
            },

            checkSession: async () => {
                set({ isLoading: true });
                const currentRole = get().role;

                try {
                    // Check Admin Session
                    if (currentRole === UserRole.ADMIN) {
                        const { success, role } = await api.checkAdminSession();
                        if (success) {
                            // Update role if changed (or set initially if missing)
                            set({ isLoading: false, adminRole: role });
                            return;
                        } else {
                            // Session invalid, clear state
                            set({ role: UserRole.GUEST, user: null, adminId: null, adminRole: null, isLoading: false });
                            return;
                        }
                    }

                    // For students, check session via API
                    const { user } = await api.checkSession();
                    if (user) {
                        set({ role: UserRole.STUDENT, user, adminId: null, adminRole: null, isLoading: false });
                    } else {
                        // If we had an optimistic user but validation failed, clear it
                        set({ role: UserRole.GUEST, user: null, adminId: null, adminRole: null, isLoading: false });
                    }
                } catch (error) {
                    console.error('Session check failed', error);
                    set({ role: UserRole.GUEST, user: null, adminId: null, isLoading: false });
                }
            },
        }),
        {
            name: 'auth-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
            partialize: (state) => ({ role: state.role, user: state.user, adminId: state.adminId }), // Don't persist isLoading
        }
    )
);
