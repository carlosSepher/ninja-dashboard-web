import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { login as loginRequest } from "@/services/authService";
import { apiClient } from "@/services/apiClient";

interface AuthState {
  token: string | null;
  email: string | null;
  loading: boolean;
  error: string | null;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  handleUnauthorized: () => void;
}

const createSafeStorage = () =>
  createJSONStorage(() => {
    if (typeof window === "undefined") {
      return {
        length: 0,
        clear: () => undefined,
        getItem: () => null,
        key: () => null,
        removeItem: () => undefined,
        setItem: () => undefined,
      } as Storage;
    }
    return window.localStorage;
  });

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      email: null,
      loading: false,
      error: null,
      isHydrated: typeof window === "undefined",
      async login(rawEmail, password) {
        const email = rawEmail.trim().toLowerCase();
        set({ loading: true, error: null });
        try {
          const { accessToken, tokenType } = await loginRequest({ email, password });
          if (tokenType.toLowerCase() !== "bearer") {
            throw new Error("Tipo de token no soportado");
          }
          apiClient.setAuthToken(accessToken);
          set({ token: accessToken, email, loading: false, error: null });
        } catch (error) {
          const message = (error as Error).message || "No se pudo iniciar sesion";
          set({ loading: false, error: message });
          throw new Error(message);
        }
      },
      logout() {
        apiClient.setAuthToken(null);
        set({ token: null, email: null, error: null, loading: false });
      },
      clearError() {
        if (get().error) {
          set({ error: null });
        }
      },
      handleUnauthorized() {
        apiClient.setAuthToken(null);
        set({ token: null, email: null, loading: false, error: "Tu sesion expiro. Ingresa nuevamente." });
      },
    }),
    {
      name: "ninja-dashboard-auth",
      storage: createSafeStorage(),
      partialize: (state) => ({ token: state.token, email: state.email }),
    },
  ),
);

if (typeof window !== "undefined") {
  useAuthStore.persist.onFinishHydration((state) => {
    if (state?.token) {
      apiClient.setAuthToken(state.token);
    }
    useAuthStore.setState({ isHydrated: true });
  });

  if (useAuthStore.persist.hasHydrated()) {
    const token = useAuthStore.getState().token;
    if (token) {
      apiClient.setAuthToken(token);
    }
    useAuthStore.setState({ isHydrated: true });
  }
}

apiClient.onUnauthorized(() => {
  useAuthStore.getState().handleUnauthorized();
});

export const selectIsAuthenticated = (state: AuthState) => Boolean(state.token);
export const selectAuthEmail = (state: AuthState) => state.email;
export const selectAuthError = (state: AuthState) => state.error;
export const selectAuthLoading = (state: AuthState) => state.loading;
