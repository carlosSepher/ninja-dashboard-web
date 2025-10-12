import { Navigate, Outlet, useLocation } from "react-router-dom";

import { selectIsAuthenticated, useAuthStore } from "@/store/auth";

export const RequireAuth = () => {
  const location = useLocation();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-muted-foreground">
        Cargando sesion...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
