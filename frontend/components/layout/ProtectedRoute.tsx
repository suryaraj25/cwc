import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import { UserRole } from "../../types";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
}) => {
  const { user, role, isLoading, checkSession } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Ensure session is checked on mount (especially for deep links/refresh)
    // Although App.tsx calls it, redundant checks are safe/cheap or we rely on App.tsx
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-indigo-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-slate-400 font-mono text-sm animate-pulse">
          VERIFYING CREDENTIALS...
        </p>
      </div>
    );
  }

  // If role is not allowed, redirect
  if (!allowedRoles.includes(role)) {
    // If guest, go to login. If logged in but wrong role, maybe home?
    if (role === UserRole.GUEST) {
      // Redirect to specific login based on what they tried to access?
      // For now, default to landing or specific login pages if we differentiate
      return <Navigate to="/" state={{ from: location }} replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
