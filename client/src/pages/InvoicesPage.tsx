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

function formatRON(amount: string) {
  const n = parseFloat(amount);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
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
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl text-white mb-1">Facturi</h1>
            <p className="text-sm text-slate-400">
              {filtered.length} înregistrări
            </p>
          </div>
          {canEdit && (
            <Link to="/invoices/new" className="btn-primary">
              + Factură nouă
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="text"
            placeholder="Caută după număr, serie..."
            className="input-field max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-brand text-white"
                  : "bg-surface-raised text-slate-400 border border-surface-border hover:text-white"
              }`}
            >
              Toate
            </button>
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-brand text-white"
                    : "bg-surface-raised text-slate-400 border border-surface-border hover:text-white"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
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
                      className="text-left text-xs text-slate-500 uppercase tracking-wider px-4 py-3 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-surface-border/50">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-surface-border rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      {search || statusFilter !== "all"
                        ? "Nicio factură corespunzătoare"
                        : "Nicio factură încă. Creează prima factură!"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="border-b border-surface-border/50 hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-white text-xs">
                          {inv.number}
                        </span>
                        {inv.series && (
                          <span className="ml-1.5 text-[10px] text-slate-500">
                            {inv.series}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {inv.issued_date}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {inv.due_date ? (
                          <span
                            className={
                              isOverdue(inv)
                                ? "text-danger font-medium"
                                : "text-slate-400"
                            }
                          >
                            {inv.due_date}
                            {isOverdue(inv) && " ⚠"}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300 text-xs">
                        {formatRON(inv.total)}
                      </td>
                      <td className="px-4 py-3 font-mono text-success text-xs">
                        {formatRON(inv.amount_paid)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span
                          className={
                            parseFloat(inv.amount_due) > 0
                              ? "text-warning"
                              : "text-slate-600"
                          }
                        >
                          {formatRON(inv.amount_due)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={STATUS_CLASSES[inv.status]}>
                          {STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canEdit && inv.status === "Draft" && (
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
