import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

const NAV = [
  { to: "/dashboard",         icon: "⊞", label: "Dashboard",         roles: ["Admin","Taxpayer","Auditor"] },
  { to: "/persoane-fizice",   icon: "◉", label: "Persoane Fizice",   roles: ["Admin","Auditor"] },
  { to: "/persoane-juridice", icon: "▣", label: "Persoane Juridice", roles: ["Admin","Auditor"] },
  { to: "/parteneri",         icon: "◇", label: "Parteneri",         roles: ["Admin","Taxpayer","Auditor"] },
  { to: "/facturi",           icon: "◈", label: "Facturi",           roles: ["Admin","Taxpayer","Auditor"] },
] as const;

export default function AppLayout() {
  const { user, doLogout } = useAuth();
  const items = NAV.filter((n) => user && (n.roles as readonly string[]).includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* ── Sidebar ── */}
      <aside className="w-52 flex-shrink-0 flex flex-col"
        style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}>

        {/* Brand */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="font-display text-2xl" style={{ color: "var(--amber)" }}>TaxChain</span>
          <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-dim)" }}>
            Platformă fiscală
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              style={({ isActive }) => isActive
                ? { background: "var(--amber-bg)", color: "var(--amber)", borderLeft: "2px solid var(--amber)", paddingLeft: "10px" }
                : { color: "var(--text-sub)" }
              }
              onMouseEnter={(e) => { if (!(e.currentTarget as any)._active) e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { if (!(e.currentTarget as any)._active) e.currentTarget.style.color = "var(--text-sub)"; }}
            >
              <span className="text-sm opacity-70">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 font-mono"
              style={{ background: "var(--amber-bg)", color: "var(--amber)", border: "1px solid var(--amber-dim)" }}>
              {(user?.display_name ?? user?.email ?? "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>
                {user?.display_name ?? user?.email ?? "Utilizator"}
              </p>
              <p className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>{user?.role}</p>
            </div>
          </div>
          <button onClick={doLogout}
            className="w-full text-xs font-medium rounded-lg px-2 py-1.5 text-left transition-colors"
            style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--red)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}>
            ⏻ Deconectare
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
