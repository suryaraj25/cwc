import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, UserRole, AuthState } from '../types';
import { api } from '../services/api';

interface AuthStore extends AuthState {
    isLoading: boolean;
    login: (user: User) => void;
    adminLogin: (adminId: string) => void;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            role: UserRole.GUEST,
            user: null,
            adminId: null,
            isLoading: true, // Start loading by default to prevent premature redirects

            login: (user: User) => {
                set({ role: UserRole.STUDENT, user, adminId: null });
            },

            adminLogin: (adminId: string) => {
                set({ role: UserRole.ADMIN, user: null, adminId });
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
                set({ role: UserRole.GUEST, user: null, adminId: null });
                localStorage.removeItem('cwc_voting_user_id');
            },

            checkSession: async () => {
                set({ isLoading: true });
                try {
                    const { user } = await api.checkSession();
                    if (user) {
                        set({ role: UserRole.STUDENT, user, adminId: null, isLoading: false });
                    } else {
                        // If we had an optimistic user but validation failed, clear it
                        const currentRole = get().role;
                        if (currentRole === UserRole.STUDENT) {
                            set({ role: UserRole.GUEST, user: null, isLoading: false });
                        } else {
                            set({ isLoading: false });
                        }
                    }
                } catch (error) {
                    console.error('Session check failed', error);
                    // If error (e.g. 401), ensure we are guest
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
