import { create } from "zustand";

import type { UserSchema } from "#/shared/api";

type AuthState = {
  user: UserSchema | null;
  isLoading: boolean;
  setUser: (user: UserSchema | null) => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
