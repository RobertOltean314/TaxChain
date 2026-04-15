import { NavLink, useNavigate } from "react-router-dom";
import { useLayoutEffect, useState } from "react";
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
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    const stored = window.localStorage.getItem("taxchain-theme");
    if (stored === "dark" || stored === "light") {
      return stored;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "dark";
  });

  useLayoutEffect(() => {
    document.body.classList.toggle("theme-dark", theme === "dark");
    document.body.classList.toggle("theme-light", theme === "light");
    window.localStorage.setItem("taxchain-theme", theme);
  }, [theme]);

  const handleLogout = async () => {
    await logout();
    toast("Ai fost deconectat", "info");
    navigate("/login");
  };

  const primaryNav = user?.role === "Auditor" ? AUDITOR_NAV : TAXPAYER_NAV;
  const adminNav = user?.role === "Admin" ? ADMIN_EXTRA_NAV : [];

  return (
    <div className="min-h-screen flex bg-surface text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-surface-border bg-surface-raised shadow-sm">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-surface-border">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-2xl tracking-tight text-[var(--text)]">
              Tax<span className="text-blue-700">Chain</span>
            </span>
            <button
              type="button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
                background: "var(--bg-card)",
              }}
            >
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--text-sub)] max-w-[200px]">
            Facturare și gestiune fiscală modernă.
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          <NavSection items={primaryNav} />

          {adminNav.length > 0 && (
            <>
              <div className="my-3 border-t border-surface-border" />
              <p className="px-4 text-[10px] text-slate-500 uppercase tracking-widest mb-2">
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
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-red-700 hover:bg-red-50 transition-all duration-150"
          >
            <span className="text-base leading-none">⏻</span>
            <span>Deconectare</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-surface p-6">
        <div className="max-w-7xl mx-auto min-h-[calc(100vh-3rem)]">
          {children}
        </div>
      </main>
    </div>
  );
}
