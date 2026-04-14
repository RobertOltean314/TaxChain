import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { invoiceApi } from "../api/invoice.api";
import { partnerApi } from "../api/partner.api";
import { AppLayout } from "../components/ui/AppLayout";
import type { Invoice, InvoiceStatus } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  Draft: "Ciornă",
  Issued: "Emisă",
  Sent: "Trimisă",
  Paid: "Plătită",
  Cancelled: "Anulată",
};

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  Draft: "badge bg-slate-700/50 text-slate-400",
  Issued: "badge bg-brand/15 text-brand",
  Sent: "badge bg-accent/15 text-accent",
  Paid: "badge badge-activ",
  Cancelled: "badge badge-radiata",
};

function formatRON(n: number) {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
  }).format(n);
}

function currentQuarterStart(): Date {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3, 1);
}

function isOverdue(inv: Invoice): boolean {
  if (!inv.due_date) return false;
  if (inv.status === "Paid" || inv.status === "Cancelled") return false;
  return new Date(inv.due_date) < new Date();
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  to,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "default" | "warning" | "success" | "danger";
  to?: string;
}) {
  const colorMap = {
    default: "text-white",
    warning: "text-warning",
    success: "text-success",
    danger: "text-danger",
  };
  const content = (
    <div className="card p-5 flex-1 min-w-[160px]">
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <p className={`font-display text-2xl ${colorMap[accent ?? "default"]}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
  return to ? (
    <Link
      to={to}
      className="flex-1 min-w-[160px] hover:opacity-90 transition-opacity"
    >
      {content}
    </Link>
  ) : (
    <div className="flex-1 min-w-[160px]">{content}</div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [partnerCount, setPartnerCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [invs, partners] = await Promise.all([
          invoiceApi.getAll(),
          partnerApi.getAll(),
        ]);
        setInvoices(invs);
        setPartnerCount(partners.length);
      } catch {
        // counts stay null — non-fatal
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ── Compute metrics ──────────────────────────────────────────────────────

  const quarterStart = currentQuarterStart();

  const activeInvoices = invoices.filter((inv) => inv.status !== "Cancelled");

  const totalReceivables = activeInvoices
    .filter((inv) => inv.status !== "Paid")
    .reduce((sum, inv) => sum + parseFloat(inv.amount_due), 0);

  const overdueCount = activeInvoices.filter(isOverdue).length;

  const vatThisQuarter = activeInvoices
    .filter(
      (inv) =>
        inv.status !== "Draft" && new Date(inv.issued_date) >= quarterStart,
    )
    .reduce((sum, inv) => sum + parseFloat(inv.total_vat), 0);

  const recentInvoices = [...invoices]
    .sort(
      (a, b) =>
        new Date(b.issued_date).getTime() - new Date(a.issued_date).getTime(),
    )
    .slice(0, 5);

  const entityName = user?.display_name ?? user?.email ?? "Contul tău";

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="font-display text-3xl text-white mb-1">
            {entityName}
          </h1>
          <p className="text-sm text-slate-400">
            Rol: <span className="text-brand font-mono">{user?.role}</span>
            {" · "}
            Wallet:{" "}
            <span className="font-mono text-slate-500 text-xs">
              {user?.assigned_wallet_address.slice(0, 10)}…
            </span>
          </p>
        </div>

        {/* Metric cards */}
        {isLoading ? (
          <div className="flex gap-4 mb-8 flex-wrap">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-5 flex-1 min-w-[160px]">
                <div className="h-3 bg-surface-border rounded animate-pulse mb-3 w-24" />
                <div className="h-7 bg-surface-border rounded animate-pulse w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 mb-8 flex-wrap">
            <StatCard
              label="De încasat"
              value={formatRON(totalReceivables)}
              sub="facturi neachitate"
              accent="default"
              to="/invoices"
            />
            <StatCard
              label="Scadente restante"
              value={String(overdueCount)}
              sub={overdueCount > 0 ? "necesită atenție" : "totul la zi"}
              accent={overdueCount > 0 ? "danger" : "success"}
              to="/invoices"
            />
            <StatCard
              label="TVA trim. curent"
              value={formatRON(vatThisQuarter)}
              sub="total colectat"
              accent="default"
              to="/reports"
            />
            <StatCard
              label="Parteneri"
              value={String(partnerCount ?? "—")}
              sub="în agendă"
              to="/partners"
            />
          </div>
        )}

        {/* Quick actions */}
        {user?.role !== "Auditor" && (
          <div className="mb-8">
            <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              Acțiuni rapide
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/invoices/new" className="btn-primary">
                + Factură nouă
              </Link>
              <Link to="/partners/new" className="btn-secondary">
                + Partener nou
              </Link>
            </div>
          </div>
        )}

        {/* Recent invoices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs text-slate-500 uppercase tracking-wider">
              Facturi recente
            </h2>
            <Link to="/invoices" className="text-xs text-brand hover:underline">
              Vezi toate →
            </Link>
          </div>

          {isLoading ? (
            <div className="card divide-y divide-surface-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-4">
                  <div className="h-3 bg-surface-border rounded animate-pulse flex-1" />
                  <div className="h-3 bg-surface-border rounded animate-pulse w-20" />
                </div>
              ))}
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-slate-500 text-sm mb-3">Nicio factură încă.</p>
              {user?.role !== "Auditor" && (
                <Link to="/invoices/new" className="btn-primary">
                  Creează prima factură
                </Link>
              )}
            </div>
          ) : (
            <div className="card divide-y divide-surface-border/50">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="px-4 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-white text-xs font-medium truncate">
                      {inv.number}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {inv.issued_date}
                    </p>
                  </div>
                  <span className={STATUS_CLASSES[inv.status]}>
                    {STATUS_LABELS[inv.status]}
                  </span>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm text-white">
                      {formatRON(parseFloat(inv.total))}
                    </p>
                    {parseFloat(inv.amount_due) > 0 &&
                      inv.status !== "Paid" && (
                        <p className="font-mono text-[11px] text-warning">
                          rest {formatRON(parseFloat(inv.amount_due))}
                        </p>
                      )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
