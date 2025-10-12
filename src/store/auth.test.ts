import { afterEach, describe, expect, it } from "vitest";

import { useAuthStore } from "@/store/auth";

const RESET_STATE = {
  token: null,
  email: null,
  error: null,
  loading: false,
  isHydrated: true,
};

describe("useAuthStore", () => {
  afterEach(() => {
    useAuthStore.setState(RESET_STATE);
  });

  it("clears session data on unauthorized", () => {
    useAuthStore.setState({ token: "token", email: "user@example.com", error: null });

    useAuthStore.getState().handleUnauthorized();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.email).toBeNull();
    expect(state.error).toBe("Tu sesion expiro. Ingresa nuevamente.");
  });
});
