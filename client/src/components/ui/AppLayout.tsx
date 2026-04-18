import { NavLink, useNavigate } from "react-router-dom";
import { useLayoutEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { useEntity } from "../../auth/useEntity";
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
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="nav-icon text-base leading-none">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { activeEntity } = useEntity();
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface text-slate-900">
      <div className="lg:hidden sticky top-0 z-30 border-b border-surface-border bg-surface-raised">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="font-display text-xl tracking-tight text-[var(--text)]">
              Tax<span className="text-blue-700">Chain</span>
            </div>
            <p className="text-xs text-[var(--text-sub)]">Facturare modernă.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((state) => !state)}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
                background: "var(--bg-card)",
              }}
            >
              {mobileMenuOpen ? "Închide" : "Meniu"}
            </button>
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
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav
            className="px-4 pb-4 border-t border-surface-border flex flex-col gap-1"
            style={{ animation: "fadeUp 0.2s var(--ease-out-expo) both" }}
          >
            <NavLink
              to="/entities"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 transition-colors"
              style={{
                background: "color-mix(in srgb, var(--blue) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--blue) 25%, transparent)",
              }}
            >
              <span className="text-xs" style={{ color: "var(--blue)" }}>⇄</span>
              <span className="text-sm font-medium truncate" style={{ color: activeEntity ? "var(--text)" : "var(--text-dim)" }}>
                {activeEntity ? activeEntity.name : "Nicio entitate selectată"}
              </span>
            </NavLink>
            <div className="pt-2">
              <NavSection items={primaryNav} />
            </div>
            {adminNav.length > 0 && (
              <>
                <div className="my-2 border-t border-surface-border" />
                <p className="px-3 text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                  Administrare
                </p>
                <NavSection items={adminNav} />
              </>
            )}
            <div className="mt-2 border-t border-surface-border pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="nav-item w-full text-left"
                style={{ color: "var(--red)" }}
              >
                <span className="nav-icon text-base leading-none">⏻</span>
                <span>Deconectare</span>
              </button>
            </div>
          </nav>
        )}
      </div>

      <aside className="hidden lg:flex lg:w-72 shrink-0 flex-col border-r border-surface-border bg-surface-raised shadow-sm">
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

        {/* Entity switcher */}
        <NavLink
          to="/entities"
          className="mx-3 my-2 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
          style={({ isActive }) => ({
            background: isActive
              ? "color-mix(in srgb, var(--blue) 12%, transparent)"
              : "color-mix(in srgb, var(--blue) 6%, transparent)",
            border: "1px solid color-mix(in srgb, var(--blue) 25%, transparent)",
          })}
        >
          <div className="flex-1 min-w-0">
            {activeEntity ? (
              <>
                <p className="text-[10px] font-mono uppercase tracking-wider mb-0.5" style={{ color: "var(--blue)" }}>
                  {activeEntity.type === "PF" ? "Persoană Fizică" : "Persoană Juridică"}
                </p>
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                  {activeEntity.name}
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-mono uppercase tracking-wider mb-0.5" style={{ color: "var(--text-dim)" }}>
                  Entitate
                </p>
                <p className="text-sm font-medium" style={{ color: "var(--text-dim)" }}>
                  Nicio entitate selectată
                </p>
              </>
            )}
          </div>
          <span className="text-xs" style={{ color: "var(--blue)" }}>⇄</span>
        </NavLink>

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

      <main className="flex-1 overflow-auto bg-surface p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
