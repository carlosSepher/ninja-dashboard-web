import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { type Location, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  selectAuthError,
  selectAuthLoading,
  selectIsAuthenticated,
  useAuthStore,
} from "@/store/auth";

interface LoginState {
  from?: Location;
}

const buildRedirect = (from?: Location | null) => {
  if (!from) {
    return "/";
  }
  const search = from.search ?? "";
  const hash = from.hash ?? "";
  return `${from.pathname}${search}${hash}` || "/";
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const clearError = useAuthStore((state) => state.clearError);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const loading = useAuthStore(selectAuthLoading);
  const authError = useAuthStore(selectAuthError);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const redirectTarget = useMemo(() => {
    const state = location.state as LoginState | undefined;
    return buildRedirect(state?.from ?? null);
  }, [location.state]);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, isHydrated, navigate, redirectTarget]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setFormError("Ingresa tu correo y contrasena");
      return;
    }

    setFormError(null);
    try {
      await login(email, password);
      navigate(redirectTarget, { replace: true });
    } catch {
      // El estado de error se gestiona en el store de autenticacion.
    }
  };

  const handleEmailChange = (value: string) => {
    if (formError) {
      setFormError(null);
    }
    if (authError) {
      clearError();
    }
    setEmail(value);
  };

  const handlePasswordChange = (value: string) => {
    if (formError) {
      setFormError(null);
    }
    if (authError) {
      clearError();
    }
    setPassword(value);
  };

  const errorMessage = formError ?? authError;

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 text-muted-foreground">
        Cargando sesion...
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold">Ninja Dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">Inicia sesion para continuar</p>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Correo electronico
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => handleEmailChange(event.target.value)}
                placeholder="tu@empresa.cl"
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Contrasena
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => handlePasswordChange(event.target.value)}
                placeholder="Ingresa tu contrasena"
                disabled={loading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
