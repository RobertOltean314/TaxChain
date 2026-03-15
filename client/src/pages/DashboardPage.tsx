import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { pfGetAll } from "../api/persoanaFizica.api";
import { pjGetAll } from "../api/persoanaJuridica.api";
import { invoiceGetAll } from "../api/invoice.api";
import { partenerGetAll } from "../api/partener.api";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ pf: 0, pj: 0, facturi: 0, parteneri: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([pfGetAll(), pjGetAll(), invoiceGetAll(), partenerGetAll()])
      .then(([pf, pj, inv, par]) => setCounts({
        pf:       pf.status  === "fulfilled" ? pf.value.length  : 0,
        pj:       pj.status  === "fulfilled" ? pj.value.length  : 0,
        facturi:  inv.status === "fulfilled" ? inv.value.length : 0,
        parteneri:par.status === "fulfilled" ? par.value.length : 0,
      }))
      .finally(() => setLoading(false));
  }, []);

  const isAdminOrAuditor = user?.role === "Admin" || user?.role === "Auditor";

  const tiles = [
    { label: "Persoane Fizice",   value: counts.pf,        to: "/persoane-fizice",   color: "var(--blue)",   show: isAdminOrAuditor },
    { label: "Persoane Juridice", value: counts.pj,        to: "/persoane-juridice", color: "var(--violet)", show: isAdminOrAuditor },
    { label: "Parteneri",         value: counts.parteneri, to: "/parteneri",         color: "var(--amber)",  show: true },
    { label: "Facturi",           value: counts.facturi,   to: "/facturi",           color: "var(--green)",  show: true },
  ].filter((t) => t.show);

  return (
    <div className="p-8 fade-up">
      <div className="mb-8">
        <h1 className="font-display text-3xl mb-1" style={{ color: "var(--text)" }}>
          Bună{user?.display_name ? `, ${user.display_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>
          {new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" · "}<span style={{ color: "var(--amber)" }}>{user?.role}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {tiles.map((tile) => (
          <button key={tile.label} onClick={() => navigate(tile.to)}
            className="text-left rounded-xl border p-5 transition-all group"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = tile.color)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
            {loading
              ? <div className="h-8 w-12 rounded mb-1" style={{ background: "var(--bg-raised)" }} />
              : <p className="text-3xl font-bold font-mono mb-1" style={{ color: "var(--text)" }}>{tile.value}</p>
            }
            <p className="text-xs" style={{ color: "var(--text-sub)" }}>{tile.label}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "var(--text-dim)" }}>Wallet asociat</p>
        <p className="font-mono text-sm break-all" style={{ color: "var(--amber)" }}>{user?.assigned_wallet_address ?? "—"}</p>
      </div>
    </div>
  );
}
