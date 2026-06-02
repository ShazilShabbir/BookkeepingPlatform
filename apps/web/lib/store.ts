import { create } from 'zustand';
import type { User } from 'bookkeeping-shared';

interface UserStore {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));

interface ClientStore {
  clientId: string | null;
  setClientId: (id: string) => void;
}

export const useClientStore = create<ClientStore>((set) => ({
  clientId: null,
  setClientId: (id) => set({ clientId: id }),
}));
