import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { invoiceApi } from "../api/invoice.api";
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

// ── Page ──────────────────────────────────────────────────────────────────────

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">(
    "all",
  );
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user?.role !== "Auditor";

  const load = async () => {
    try {
      const data = await invoiceApi.getAll();
      setInvoices(data);
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
      const matchesSearch =
        !q ||
        inv.number.toLowerCase().includes(q) ||
        (inv.series ?? "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

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
      <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 fade-up flex-wrap">
          <div>
            <h1
              className="font-display text-2xl font-bold"
              style={{ color: "var(--text)" }}
            >
              Facturi
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
              {filtered.length} înregistrări
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-3 flex-wrap">
              <Link to="/invoices/upload" className="btn-secondary">
                Încarcă factură
              </Link>
              <Link to="/invoices/new" className="btn-primary">
                + Factură nouă
              </Link>
            </div>
          )}
        </div>

        {/* Filters */}
        <div
          className="flex flex-wrap gap-3 mb-5 fade-up"
          style={{ animationDelay: "60ms" }}
        >
          <input
            type="text"
            placeholder="Caută după număr, serie..."
            className="input"
            style={{ maxWidth: "18rem" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-1 flex-wrap">
            {(["all", ...ALL_STATUSES] as const).map((s) => {
              const isActive = statusFilter === s;
              const label = s === "all" ? "Toate" : STATUS_LABELS[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                  style={
                    isActive
                      ? {
                          background: "var(--blue)",
                          color: "#fff",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                        }
                      : {
                          background: "var(--bg-card)",
                          color: "var(--text-dim)",
                          border: "1px solid var(--border)",
                        }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div
          className="card overflow-hidden fade-up"
          style={{
            animationDelay: "120ms",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "640px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[
                    "Număr",
                    "Data emiterii",
                    "Scadență",
                    "Total",
                    "Plătit",
                    "Rest",
                    "Stare",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-mono uppercase tracking-wider px-4 py-3 font-medium"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded shimmer" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-sm"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {search || statusFilter !== "all"
                        ? "Nicio factură corespunzătoare filtrelor selectate."
                        : "Nicio factură încă. Creează prima factură!"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv, i) => (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="cursor-pointer transition-colors fade-up"
                      style={{
                        borderBottom: "1px solid var(--border)",
                        animationDelay: `${i * 35}ms`,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "")
                      }
                    >
                      <td className="px-4 py-3">
                        <span
                          className="font-mono text-xs font-semibold"
                          style={{ color: "var(--text)" }}
                        >
                          {inv.number}
                        </span>
                        {inv.series && (
                          <span
                            className="ml-1.5 text-[10px]"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {inv.series}
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {new Date(inv.issued_date).toLocaleDateString("ro-RO")}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {inv.due_date ? (
                          <span
                            style={{
                              color: isOverdue(inv)
                                ? "var(--red)"
                                : "var(--text-dim)",
                              fontWeight: isOverdue(inv) ? 600 : undefined,
                            }}
                          >
                            {new Date(inv.due_date).toLocaleDateString("ro-RO")}
                            {isOverdue(inv) && " ⚠"}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-dim)" }}>—</span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: "var(--text)" }}
                      >
                        {formatMoney(inv.total, inv.currency)}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: "var(--green)" }}
                      >
                        {formatMoney(inv.amount_paid, inv.currency)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span
                          style={{
                            color:
                              parseFloat(inv.amount_due) > 0
                                ? "var(--amber)"
                                : "var(--text-dim)",
                          }}
                        >
                          {formatMoney(inv.amount_due, inv.currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={STATUS_CLASSES[inv.status]}>
                          {STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canEdit && (inv.status === "Draft" || inv.status === "Paid") && (
                          <button
                            className="btn-danger py-1 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(inv);
                            }}
                          >
                            Șterge
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
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
