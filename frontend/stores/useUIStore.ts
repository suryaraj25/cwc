import { create } from 'zustand';

interface UIStore {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    // Add other global UI states here (sidebar open, etc.)
}

export const useUIStore = create<UIStore>((set) => ({
    theme: 'dark', // Default to dark for this app style
    toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));
