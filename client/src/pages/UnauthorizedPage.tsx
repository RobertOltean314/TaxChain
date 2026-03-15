import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="text-center fade-up">
        <p className="font-display text-8xl mb-4" style={{ color: "var(--border)" }}>403</p>
        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Acces interzis</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-sub)" }}>Nu ai permisiunile necesare pentru această pagină.</p>
        <button onClick={() => navigate(user ? "/dashboard" : "/login")}
          className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
          style={{ color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-dim)" }}>
          {user ? "← Dashboard" : "← Autentificare"}
        </button>
      </div>
    </div>
  );
}
