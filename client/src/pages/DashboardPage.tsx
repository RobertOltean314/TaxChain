import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { invoiceApi } from "../api/invoice.api";
import { partnerApi } from "../api/partner.api";
import { bnrApi } from "../api/bnr.api";
import { AppLayout } from "../components/ui/AppLayout";
import type { Invoice, InvoiceStatus, Partner } from "../types";

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
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCurrency(n: number, currency: string) {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: currency || "RON",
    maximumFractionDigits: 2,
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

// ── Count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic — decelerates naturally
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

type Accent = "default" | "warning" | "success" | "danger";

const ACCENT_COLORS: Record<Accent, string> = {
  default: "var(--text)",
  warning: "var(--amber)",
  success: "var(--green)",
  danger: "var(--red)",
};

function StatCard({
  label,
  rawValue,
  displayValue,
  currency = false,
  sub,
  accent = "default",
  to,
  index = 0,
}: {
  label: string;
  rawValue?: number;
  displayValue?: string;
  currency?: boolean;
  sub?: string;
  accent?: Accent;
  to?: string;
  index?: number;
}) {
  const animated = useCountUp(rawValue ?? 0);
  const shown =
    displayValue !== undefined
      ? displayValue
      : rawValue !== undefined
        ? currency
          ? formatRON(animated)
          : String(Math.round(animated))
        : "—";

  const color = ACCENT_COLORS[accent];

  const content = (
    <div
      className="card card-interactive p-5 fade-up"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <p
        className="text-xs font-mono uppercase tracking-wider mb-3"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </p>
      <p
        className="font-display text-2xl font-bold tracking-tight number-in"
        style={{ color, animationDelay: `${index * 55 + 150}ms` }}
      >
        {shown}
      </p>
      {sub && (
        <p className="text-xs mt-1.5" style={{ color: "var(--text-dim)" }}>
          {sub}
        </p>
      )}
    </div>
  );

  return to ? (
    <Link to={to} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

// ── Recent invoice row ────────────────────────────────────────────────────────

function InvoiceRow({
  inv,
  index,
}: {
  inv: Invoice;
  index: number;
}) {
  return (
    <Link
      to={`/invoices/${inv.id}`}
      className="px-5 py-3.5 flex items-center gap-4 transition-colors fade-up"
      style={{
        animationDelay: `${index * 45}ms`,
        borderBottom: "1px solid var(--border)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--bg-hover)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
          {inv.number}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
          {new Date(inv.issued_date).toLocaleDateString("ro-RO")}
        </p>
      </div>
      <span className={STATUS_CLASSES[inv.status]} style={{ flexShrink: 0 }}>
        {STATUS_LABELS[inv.status]}
      </span>
      <div className="text-right shrink-0">
        <p
          className="font-mono text-sm font-medium"
          style={{ color: "var(--text)" }}
        >
          {formatCurrency(parseFloat(inv.total), inv.currency)}
        </p>
        {parseFloat(inv.amount_due) > 0 && inv.status !== "Paid" && (
          <p className="font-mono text-xs mt-0.5" style={{ color: "var(--amber)" }}>
            rest {formatCurrency(parseFloat(inv.amount_due), inv.currency)}
          </p>
        )}
      </div>
      <span className="text-xs" style={{ color: "var(--text-dim)" }}>→</span>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const FALLBACK_EUR = 5.0;
const FALLBACK_USD = 4.6;

export function DashboardPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eurRate, setEurRate] = useState(FALLBACK_EUR);
  const [usdRate, setUsdRate] = useState(FALLBACK_USD);

  useEffect(() => {
    (async () => {
      try {
        const [invs, partnerList] = await Promise.all([
          invoiceApi.getAll(),
          partnerApi.getAll(),
        ]);
        setInvoices(invs);
        setPartners(partnerList);
      } catch {
        // non-fatal
      } finally {
        setIsLoading(false);
      }
    })();

    // Fetch today's BNR rates — failures fall back to hardcoded approximations
    bnrApi.getRate("EUR").then((r) => setEurRate(parseFloat(r.rate))).catch(() => {});
    bnrApi.getRate("USD").then((r) => setUsdRate(parseFloat(r.rate))).catch(() => {});
  }, []);

  function toRON(amount: number, currency: string): number {
    if (currency === "EUR") return amount * eurRate;
    if (currency === "USD") return amount * usdRate;
    return amount; // RON or unknown → treat as RON
  }

  const quarterStart = currentQuarterStart();
  const activeInvoices = invoices.filter((inv) => inv.status !== "Cancelled");

  const totalReceivables = activeInvoices
    .filter((inv) => inv.status !== "Paid")
    .reduce((sum, inv) => sum + toRON(parseFloat(inv.amount_due), inv.currency), 0);

  const overdueCount = activeInvoices.filter(isOverdue).length;

  const vatThisQuarter = activeInvoices
    .filter(
      (inv) =>
        inv.status !== "Draft" && new Date(inv.issued_date) >= quarterStart,
    )
    .reduce((sum, inv) => sum + toRON(parseFloat(inv.total_vat), inv.currency), 0);

  const incomeThisQuarter = activeInvoices
    .filter(
      (inv) =>
        new Date(inv.issued_date) >= quarterStart &&
        inv.transaction_type === "Income",
    )
    .reduce((sum, inv) => sum + toRON(parseFloat(inv.total), inv.currency), 0);

  const expenseThisQuarter = activeInvoices
    .filter(
      (inv) =>
        new Date(inv.issued_date) >= quarterStart &&
        inv.transaction_type === "Expense",
    )
    .reduce((sum, inv) => sum + toRON(parseFloat(inv.total), inv.currency), 0);

  const netThisQuarter = incomeThisQuarter - expenseThisQuarter;

  const recentInvoices = [...invoices]
    .sort(
      (a, b) =>
        new Date(b.issued_date).getTime() - new Date(a.issued_date).getTime(),
    )
    .slice(0, 5);

  const entityName = user?.display_name ?? user?.email ?? "Contul tău";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bună dimineața";
    if (h < 18) return "Bună ziua";
    return "Bună seara";
  })();

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* Greeting */}
        <div className="mb-8 fade-up">
          <p
            className="text-sm font-mono mb-1"
            style={{ color: "var(--text-dim)" }}
          >
            {greeting},
          </p>
          <h1 className="font-display text-3xl" style={{ color: "var(--text)" }}>
            {entityName}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
            Rol:{" "}
            <span className="font-mono" style={{ color: "var(--blue)" }}>
              {user?.role}
            </span>
            {user?.assigned_wallet_address && (
              <>
                {" · "}
                <span className="font-mono text-xs" style={{ color: "var(--text-dim)" }}>
                  {user.assigned_wallet_address.slice(0, 6)}…
                  {user.assigned_wallet_address.slice(-4)}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Metric cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="h-3 rounded shimmer mb-3 w-24" />
                <div className="h-7 rounded shimmer w-32" />
                <div className="h-3 rounded shimmer mt-2 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="De încasat"
              rawValue={totalReceivables}
              currency
              sub="facturi neachitate"
              accent="default"
              to="/invoices"
              index={0}
            />
            <StatCard
              label="Scadente restante"
              rawValue={overdueCount}
              sub={overdueCount > 0 ? "necesită atenție" : "totul la zi"}
              accent={overdueCount > 0 ? "danger" : "success"}
              to="/invoices"
              index={1}
            />
            <StatCard
              label="TVA trimestrial"
              rawValue={vatThisQuarter}
              currency
              sub="total colectat"
              to="/reports"
              index={2}
            />
            <StatCard
              label="Venituri trim."
              rawValue={incomeThisQuarter}
              currency
              sub="bazat pe facturi"
              accent="success"
              index={3}
            />
            <StatCard
              label="Cheltuieli trim."
              rawValue={expenseThisQuarter}
              currency
              sub="bazat pe facturi"
              accent={expenseThisQuarter > incomeThisQuarter ? "danger" : "warning"}
              index={4}
            />
            <StatCard
              label="Sold trimestrial"
              rawValue={Math.abs(netThisQuarter)}
              currency
              sub={netThisQuarter >= 0 ? "venit net" : "pierdere netă"}
              accent={netThisQuarter >= 0 ? "success" : "danger"}
              index={5}
            />
            <StatCard
              label="Parteneri"
              rawValue={partners.length}
              sub="în agendă"
              to="/partners"
              index={6}
            />
          </div>
        )}

        {/* Currency note */}
        {!isLoading && invoices.some((inv) => inv.currency !== "RON") && (
          <p className="text-xs mb-6 fade-up" style={{ color: "var(--text-dim)", animationDelay: "180ms" }}>
            * Sumele agregate sunt convertite în RON la cursul BNR (EUR: {eurRate.toFixed(4)}, USD: {usdRate.toFixed(4)}). Facturile individuale afișează moneda originală.
          </p>
        )}

        {/* Quick actions */}
        {user?.role !== "Auditor" && (
          <div
            className="mb-8 fade-up"
            style={{ animationDelay: "200ms" }}
          >
            <p
              className="text-xs font-mono uppercase tracking-wider mb-3"
              style={{ color: "var(--text-dim)" }}
            >
              Acțiuni rapide
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/invoices/new" className="btn-primary">
                + Factură nouă
              </Link>
              <Link to="/partners/new" className="btn-secondary">
                + Partener nou
              </Link>
              <Link to="/reports" className="btn-secondary">
                Rapoarte →
              </Link>
            </div>
          </div>
        )}

        {/* Recent invoices */}
        <div className="fade-up" style={{ animationDelay: "260ms" }}>
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-xs font-mono uppercase tracking-wider"
              style={{ color: "var(--text-dim)" }}
            >
              Facturi recente
            </p>
            <Link
              to="/invoices"
              className="text-xs font-medium transition-colors"
              style={{ color: "var(--blue)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.textDecoration = "underline")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.textDecoration = "none")
              }
            >
              Vezi toate →
            </Link>
          </div>

          {isLoading ? (
            <div className="card overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="px-5 py-4 flex items-center gap-4"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="flex-1 h-3 rounded shimmer" />
                  <div className="h-3 w-16 rounded shimmer" />
                  <div className="h-3 w-20 rounded shimmer" />
                </div>
              ))}
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
                Nicio factură încă.
              </p>
              {user?.role !== "Auditor" && (
                <Link to="/invoices/new" className="btn-primary">
                  Creează prima factură
                </Link>
              )}
            </div>
          ) : (
            <div
              className="card overflow-hidden"
              style={{ boxShadow: "var(--shadow-md)" }}
            >
              {recentInvoices.map((inv, i) => (
                <InvoiceRow key={inv.id} inv={inv} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
