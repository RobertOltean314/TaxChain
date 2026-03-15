import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";

interface Props { roles: string[]; }

export default function ProtectedRoute({ roles }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg)" }}>
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--amber)" }} />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
