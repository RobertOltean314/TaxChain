import { NavLink, useNavigate } from "react-router-dom";
import { useLayoutEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { useEntity } from "../../auth/useEntity";
import { useToast } from "./Toast";

// ── Nav item definitions per role ────────────────────────────────────────────

const TAXPAYER_NAV = [
  { to: "/dashboard", label: "Dashboard",  icon: "⬡" },
  { to: "/invoices",  label: "Facturi",    icon: "◉" },
  { to: "/partners",  label: "Parteneri",  icon: "◈" },
  { to: "/reports",   label: "Rapoarte",   icon: "◫" },
];

const ADMIN_EXTRA_NAV = [
  { to: "/persoane-fizice",    label: "Persoane Fizice",    icon: "◈" },
  { to: "/persoane-juridice",  label: "Persoane Juridice",  icon: "◆" },
  { to: "/jurnal-audit",       label: "Jurnal Audit",       icon: "◎" },
];

const AUDITOR_NAV = [
  { to: "/dashboard",    label: "Dashboard",      icon: "⬡" },
  { to: "/panou-auditor", label: "Panou Auditor", icon: "⬕" },
  { to: "/jurnal-audit",  label: "Jurnal Audit",  icon: "◎" },
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

// ── Logo ──────────────────────────────────────────────────────────────────────

function Logo({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <span
      className={`font-display font-bold tracking-tight ${size === "lg" ? "text-2xl" : "text-xl"}`}
    >
      <span className="text-gradient">Tax</span>
      <span style={{ color: "var(--text)" }}>Chain</span>
    </span>
  );
}

// ── Theme toggle button ───────────────────────────────────────────────────────

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all"
      style={{
        borderColor: "var(--border)",
        color: "var(--text-dim)",
        background: "transparent",
      }}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { activeEntity } = useEntity();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("taxchain-theme");
    if (stored === "dark" || stored === "light") return stored;
    return "dark";
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useLayoutEffect(() => {
    document.body.classList.toggle("theme-dark",  theme === "dark");
    document.body.classList.toggle("theme-light", theme === "light");
    window.localStorage.setItem("taxchain-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const handleLogout = async () => {
    await logout();
    toast("Ai fost deconectat", "info");
    navigate("/login");
  };

  const primaryNav = user?.role === "Auditor" ? AUDITOR_NAV : TAXPAYER_NAV;
  const adminNav   = user?.role === "Admin"   ? ADMIN_EXTRA_NAV : [];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "var(--bg)", color: "var(--text)" }}>

      {/* ── Mobile top bar ── */}
      <div
        className="lg:hidden sticky top-0 z-30"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((s) => !s)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
                background: "var(--bg-card)",
              }}
            >
              {mobileMenuOpen ? "Închide" : "Meniu"}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            className="px-4 pb-4 flex flex-col gap-1"
            style={{
              borderTop: "1px solid var(--border)",
              animation: "fadeUp 0.2s var(--ease-out-expo) both",
            }}
          >
            {user?.role !== "Auditor" && (
              <NavLink
                to="/entities"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors"
                style={{
                  background: "color-mix(in srgb, var(--blue) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--blue) 25%, transparent)",
                }}
              >
                <span className="text-xs" style={{ color: "var(--blue)" }}>⇄</span>
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: activeEntity ? "var(--text)" : "var(--text-dim)" }}
                >
                  {activeEntity ? activeEntity.name : "Nicio entitate selectată"}
                </span>
              </NavLink>
            )}
            <div className="pt-2">
              <NavSection items={primaryNav} />
            </div>
            {adminNav.length > 0 && (
              <>
                <div className="my-2" style={{ borderTop: "1px solid var(--border)" }} />
                <p className="px-3 text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-dim)" }}>
                  Administrare
                </p>
                <NavSection items={adminNav} />
              </>
            )}
            <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
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

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:flex lg:w-64 shrink-0 flex-col"
        style={{
          borderRight: "1px solid var(--border)",
          background: "var(--bg-card)",
          position: "relative",
        }}
      >
        {/* Gradient accent bar at top */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background: "linear-gradient(90deg, var(--blue) 0%, var(--violet) 100%)",
          }}
        />

        {/* Logo + theme toggle */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <Logo />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <p className="mt-2.5 text-xs" style={{ color: "var(--text-dim)" }}>
            Facturare și gestiune fiscală modernă.
          </p>
        </div>

        {/* Entity switcher */}
        {user?.role !== "Auditor" && (
          <NavLink
            to="/entities"
            className="mx-3 mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
            style={({ isActive }) => ({
              background: isActive
                ? "color-mix(in srgb, var(--blue) 14%, transparent)"
                : "color-mix(in srgb, var(--blue) 7%, transparent)",
              border: "1px solid color-mix(in srgb, var(--blue) 25%, transparent)",
            })}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs"
              style={{
                background: "linear-gradient(135deg, var(--blue), var(--violet))",
                color: "#fff",
              }}
            >
              {activeEntity
                ? activeEntity.name.charAt(0).toUpperCase()
                : "?"}
            </div>
            <div className="flex-1 min-w-0">
              {activeEntity ? (
                <>
                  <p
                    className="text-[10px] font-mono uppercase tracking-wider"
                    style={{ color: "var(--blue)" }}
                  >
                    {activeEntity.type === "PF" ? "Pers. Fizică" : "Pers. Juridică"}
                  </p>
                  <p
                    className="text-xs font-semibold truncate mt-0.5"
                    style={{ color: "var(--text)" }}
                  >
                    {activeEntity.name}
                  </p>
                </>
              ) : (
                <>
                  <p
                    className="text-[10px] font-mono uppercase tracking-wider"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Entitate
                  </p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-dim)" }}>
                    Nicio entitate selectată
                  </p>
                </>
              )}
            </div>
            <span className="text-xs shrink-0" style={{ color: "var(--blue)" }}>⇄</span>
          </NavLink>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
          <p
            className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest"
            style={{ color: "var(--text-dim)" }}
          >
            Navigare
          </p>
          <NavSection items={primaryNav} />

          {adminNav.length > 0 && (
            <>
              <div className="my-3 mx-1" style={{ borderTop: "1px solid var(--border)" }} />
              <p
                className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest"
                style={{ color: "var(--text-dim)" }}
              >
                Administrare
              </p>
              <NavSection items={adminNav} />
            </>
          )}
        </nav>

        {/* User section */}
        <div className="px-3 py-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1"
            style={{ background: "var(--bg-hover)" }}
          >
            {/* Avatar initial */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--blue), var(--violet))",
                color: "#fff",
              }}
            >
              {(user?.display_name ?? user?.email ?? "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold truncate"
                style={{ color: "var(--text)" }}
              >
                {user?.display_name ?? user?.email ?? "Utilizator"}
              </p>
              <p
                className="text-[10px] font-mono truncate"
                style={{ color: "var(--text-dim)" }}
              >
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
            style={{ color: "var(--text-dim)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--red)";
              e.currentTarget.style.background = "color-mix(in srgb, var(--red) 8%, transparent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-dim)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span className="text-base leading-none">⏻</span>
            <span>Deconectare</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main
        className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8"
        style={{ background: "var(--bg)" }}
      >
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
