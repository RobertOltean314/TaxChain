import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useToast } from "./Toast";

// ── Nav item definitions per role ────────────────────────────────────────────
// `to` uses English routes (/invoices, /partners, /reports).
// `label` stays Romanian — it is displayed to the user.

const TAXPAYER_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "⬡" },
  { to: "/invoices", label: "Facturi", icon: "◉" },
  { to: "/partners", label: "Parteneri", icon: "◈" },
  { to: "/reports", label: "Rapoarte", icon: "◫" },
];

const ADMIN_EXTRA_NAV = [
  { to: "/persoane-fizice", label: "Persoane Fizice", icon: "◈" },
  { to: "/persoane-juridice", label: "Persoane Juridice", icon: "◆" },
];

const AUDITOR_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "⬡" },
  { to: "/invoices", label: "Facturi", icon: "◉" },
  { to: "/partners", label: "Parteneri", icon: "◈" },
  { to: "/reports", label: "Rapoarte", icon: "◫" },
  { to: "/persoane-fizice", label: "Persoane Fizice", icon: "◈" },
  { to: "/persoane-juridice", label: "Persoane Juridice", icon: "◆" },
];

function NavSection({
  items,
}: {
  items: { to: string; label: string; icon: string }[];
}) {
  return (
    <>
      {items.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
              isActive
                ? "bg-brand/10 text-brand border border-brand/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`
          }
        >
          <span className="text-base leading-none">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    toast("Ai fost deconectat", "info");
    navigate("/login");
  };

  const primaryNav = user?.role === "Auditor" ? AUDITOR_NAV : TAXPAYER_NAV;
  const adminNav = user?.role === "Admin" ? ADMIN_EXTRA_NAV : [];

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-surface-border bg-surface-raised/50">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-surface-border">
          <span className="font-display text-xl text-white tracking-tight">
            Tax<span className="text-brand">Chain</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          <NavSection items={primaryNav} />

          {adminNav.length > 0 && (
            <>
              <div className="my-2 border-t border-surface-border" />
              <p className="px-3 text-[10px] text-slate-600 uppercase tracking-widest mb-1">
                Administrare
              </p>
              <NavSection items={adminNav} />
            </>
          )}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-surface-border">
          <div className="px-3 py-2 mb-2">
            <div className="text-xs text-slate-500 truncate">
              {user?.display_name ?? user?.email ?? "Utilizator"}
            </div>
            <div className="text-xs font-mono text-slate-600 truncate mt-0.5">
              {user?.role}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400
                       hover:text-danger hover:bg-danger/5 transition-all duration-150"
          >
            <span className="text-base leading-none">⏻</span>
            <span>Deconectare</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
