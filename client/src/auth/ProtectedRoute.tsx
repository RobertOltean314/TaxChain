import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useEntity } from "./useEntity";
import type { UserResponse } from "../types";

const ENTITY_EXEMPT_PATHS = ["/entities", "/onboarding", "/login", "/unauthorized"];

// Paths that Auditors are allowed to access
const AUDITOR_ALLOWED_PATHS = ["/dashboard", "/panou-auditor", "/jurnal-audit", "/profil"];

interface ProtectedRouteProps {
  allowedRoles?: UserResponse["role"][];
}

/**
 * Checks authentication and role access.
 *
 * Additionally, if a Taxpayer user has not yet linked a PF or PJ entity
 * (both IDs are null), they are redirected to /onboarding regardless of
 * which protected route they tried to access — except if they're already
 * on /onboarding (avoids redirect loop).
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { activeEntity, isLoading: entityLoading } = useEntity();
  const location = useLocation();

  if (isLoading || entityLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Se încarcă...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Auditor gate: Auditors can only access their allowed paths
  if (user.role === "Auditor") {
    const isAuditorAllowed = AUDITOR_ALLOWED_PATHS.some((p) =>
      location.pathname.startsWith(p),
    );
    if (!isAuditorAllowed) {
      return <Navigate to="/panou-auditor" replace />;
    }
    return <Outlet />;
  }

  // Onboarding gate: Taxpayer with no linked entity must complete onboarding
  const needsOnboarding =
    user.role === "Taxpayer" &&
    user.persoana_fizica_id === null &&
    user.persoana_juridica_id === null &&
    location.pathname !== "/onboarding";

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // Entity gate: all authenticated users must have an active entity selected
  // unless they are on an exempt path (entities picker, onboarding, etc.)
  const isExempt = ENTITY_EXEMPT_PATHS.some((p) => location.pathname.startsWith(p));
  if (!activeEntity && !isExempt) {
    return <Navigate to="/entities" replace />;
  }

  return <Outlet />;
}
