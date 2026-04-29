import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { invoiceApi } from "../api/invoice.api";
import { partnerApi } from "../api/partner.api";
import { AppLayout } from "../components/ui/AppLayout";
import { Confirm } from "../components/ui/Confirm";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../auth/useAuth";
import {
  ALL_STATUSES,
  STATUS_CLASSES,
  STATUS_LABELS,
  type Invoice,
  type InvoiceStatus,
  type Partner,
} from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(amount: string, currency = "RON") {
  const n = parseFloat(amount);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function isOverdue(inv: Invoice): boolean {
  if (!inv.due_date) return false;
  if (inv.status === "Paid" || inv.status === "Cancelled") return false;
  return new Date(inv.due_date) < new Date();
}

const TYPE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  Income:  { label: "Venit",      color: "var(--green)", bg: "color-mix(in srgb, var(--green) 12%, transparent)" },
  Expense: { label: "Cheltuială", color: "var(--red)",   bg: "color-mix(in srgb, var(--red)   12%, transparent)" },
};

// ── Stat pill ──────────────────────────────────────────────────────────────────

function StatPill({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div
      className="flex flex-col px-4 py-2.5 rounded-xl text-center min-w-[80px]"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <span
        className="font-display text-xl font-bold font-mono"
        style={{ color: accent ?? "var(--text)" }}
      >
        {value}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-wider mt-0.5" style={{ color: "var(--text-dim)" }}>
        {label}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user?.role !== "Auditor";

  const partnerMap = useMemo(
    () => new Map(partners.map((p) => [p.id, p])),
    [partners],
  );

  const load = async () => {
    try {
      const [data, partnerList] = await Promise.all([
        invoiceApi.getAll(),
        partnerApi.getAll(),
      ]);
      setInvoices(data);
      setPartners(partnerList);
    } catch {
      toast("Eroare la încărcarea facturilor");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter((inv) => {
      const partner = partnerMap.get(inv.partner_id);
      const matchesSearch =
        !q ||
        inv.number.toLowerCase().includes(q) ||
        (inv.series ?? "").toLowerCase().includes(q) ||
        (partner?.denumire ?? "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter, partnerMap]);

  // Stats
  const stats = useMemo(() => ({
    total:   invoices.length,
    pending: invoices.filter((i) => ["Draft", "Issued", "Sent"].includes(i.status)).length,
    paid:    invoices.filter((i) => i.status === "Paid").length,
    overdue: invoices.filter(isOverdue).length,
  }), [invoices]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await invoiceApi.delete(deleteTarget.id);
      toast(`Factura ${deleteTarget.number} a fost ștearsă`);
      setDeleteTarget(null);
      load();
    } catch {
      toast("Eroare la ștergere");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 fade-up flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: "var(--text)" }}>
              Facturi
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-dim)" }}>
              Gestionează facturile emise și primite
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              <Link to="/invoices/upload" className="btn-secondary text-sm">
                Încarcă XML / PDF
              </Link>
              <Link to="/invoices/new" className="btn-primary text-sm">
                + Factură nouă
              </Link>
            </div>
          )}
        </div>

        {/* ── Stats bar ── */}
        <div className="flex flex-wrap gap-3 fade-up" style={{ animationDelay: "40ms" }}>
          <StatPill label="Total" value={stats.total} />
          <StatPill label="În curs" value={stats.pending} accent="var(--blue)" />
          <StatPill label="Plătite" value={stats.paid} accent="var(--green)" />
          {stats.overdue > 0 && (
            <StatPill label="Restante" value={stats.overdue} accent="var(--red)" />
          )}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 fade-up" style={{ animationDelay: "80ms" }}>
          <input
            type="text"
            placeholder="Caută după număr, serie, partener..."
            className="input"
            style={{ maxWidth: "22rem" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            {(["all", ...ALL_STATUSES] as const).map((s) => {
              const isActive = statusFilter === s;
              const label = s === "all" ? "Toate" : STATUS_LABELS[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
                  style={
                    isActive
                      ? { background: "var(--blue)", color: "#fff" }
                      : { color: "var(--text-dim)" }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
          {(search || statusFilter !== "all") && (
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              {filtered.length} rezultate
            </span>
          )}
        </div>

        {/* ── Table ── */}
        <div
          className="card overflow-hidden fade-up"
          style={{ animationDelay: "120ms", boxShadow: "var(--shadow-md)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "700px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Număr / Partener", "Dată", "Scadență", "Tip", "Total", "Stare", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] font-mono uppercase tracking-wider px-4 py-3 font-medium"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 rounded shimmer" style={{ width: j === 0 ? "70%" : "50%" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
                        {search || statusFilter !== "all" ? "Nicio factură găsită" : "Nicio factură încă"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                        {search || statusFilter !== "all"
                          ? "Încearcă să modifici filtrele sau căutarea."
                          : "Creează prima factură sau încarcă un fișier XML / PDF."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv, i) => {
                    const partner = partnerMap.get(inv.partner_id);
                    const type = TYPE_STYLE[inv.transaction_type ?? ""];
                    const overdue = isOverdue(inv);
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="cursor-pointer transition-colors row-stagger"
                        style={{
                          borderBottom: "1px solid var(--border)",
                          animationDelay: `${i * 30}ms`,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                      >
                        {/* Number + partner */}
                        <td className="px-4 py-3.5">
                          <p className="font-mono text-xs font-semibold" style={{ color: "var(--text)" }}>
                            {inv.number}
                            {inv.tx_hash && (
                              <span
                                className="ml-1.5 text-[10px]"
                                title={`Ancorată pe Sepolia · bloc #${inv.block_number}`}
                                style={{ color: "#6F00FF" }}
                              >
                                ⛓
                              </span>
                            )}
                          </p>
                          <p className="text-xs mt-0.5 truncate" style={{ maxWidth: "180px", color: "var(--text-dim)" }}>
                            {partner?.denumire ?? "—"}
                          </p>
                        </td>

                        {/* Issued date */}
                        <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color: "var(--text-dim)" }}>
                          {new Date(inv.issued_date).toLocaleDateString("ro-RO")}
                        </td>

                        {/* Due date */}
                        <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                          {inv.due_date ? (
                            <span style={{ color: overdue ? "var(--red)" : "var(--text-dim)", fontWeight: overdue ? 600 : undefined }}>
                              {new Date(inv.due_date).toLocaleDateString("ro-RO")}
                              {overdue && <span className="ml-1">⚠</span>}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-dim)" }}>—</span>
                          )}
                        </td>

                        {/* Transaction type */}
                        <td className="px-4 py-3.5">
                          {type ? (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: type.bg, color: type.color }}
                            >
                              {type.label}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-dim)" }}>—</span>
                          )}
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold" style={{ color: "var(--text)" }}>
                          {formatMoney(inv.total, inv.currency)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <span className={STATUS_CLASSES[inv.status]}>
                            {STATUS_LABELS[inv.status]}
                          </span>
                        </td>

                        {/* Delete */}
                        <td className="px-4 py-3.5 text-right">
                          {canEdit && (inv.status === "Draft" || inv.status === "Paid") && (
                            <button
                              className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded-lg transition-all"
                              style={{
                                color: "var(--red)",
                                border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)",
                                background: "color-mix(in srgb, var(--red) 5%, transparent)",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(inv);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "1";
                              }}
                            >
                              Șterge
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Confirm
        isOpen={!!deleteTarget}
        title="Confirmare ștergere"
        message={
          deleteTarget
            ? `Ești sigur că vrei să ștergi factura "${deleteTarget.number}"? Această acțiune este ireversibilă.`
            : ""
        }
        confirmLabel="Șterge"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
