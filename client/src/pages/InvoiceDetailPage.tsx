import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { invoiceApi } from "../api/invoice.api";
import { partnerApi } from "../api/partner.api";
import { AppLayout } from "../components/ui/AppLayout";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../auth/useAuth";
import type { Invoice, InvoiceLine, InvoiceStatus, Partner } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  Draft:     "Ciornă",
  Issued:    "Emisă",
  Sent:      "Trimisă",
  Paid:      "Plătită",
  Cancelled: "Anulată",
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  Draft:     "var(--text-dim)",
  Issued:    "var(--blue)",
  Sent:      "var(--accent, #7c3aed)",
  Paid:      "var(--green)",
  Cancelled: "var(--red)",
};

const TRANSITIONS: Partial<
  Record<InvoiceStatus, { next: InvoiceStatus; label: string; loadingLabel: string }>
> = {
  Draft:  { next: "Issued", label: "Emite factura",                          loadingLabel: "Se procesează..." },
  Issued: { next: "Sent",   label: "Marchează trimisă",                      loadingLabel: "Se procesează..." },
  Sent:   { next: "Paid",   label: "Marchează plătită & ancorează on-chain", loadingLabel: "Ancorare pe blockchain (~30s)..." },
};

const TYPE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  Income:  { label: "Venit",      color: "var(--green)", bg: "color-mix(in srgb, var(--green) 12%, transparent)" },
  Expense: { label: "Cheltuială", color: "var(--red)",   bg: "color-mix(in srgb, var(--red)   12%, transparent)" },
};

const STEPPER_STEPS: InvoiceStatus[] = ["Draft", "Issued", "Sent", "Paid"];

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

function formatQty(value: string) {
  const n = parseFloat(value);
  return isNaN(n) ? value : new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 4 }).format(n);
}

// ── Status stepper ────────────────────────────────────────────────────────────

function StatusStepper({ status }: { status: InvoiceStatus }) {
  if (status === "Cancelled") {
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold self-start"
        style={{
          background: "color-mix(in srgb, var(--red) 10%, transparent)",
          color: "var(--red)",
          border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)",
        }}
      >
        ✕ Anulată
      </div>
    );
  }

  const currentIdx = STEPPER_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STEPPER_STEPS.map((s, idx) => {
        const isPast    = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const dotColor  = isPast ? "var(--green)" : isCurrent ? STATUS_COLORS[s] : "var(--border)";
        const lineColor = isPast ? "var(--green)" : "var(--border)";
        return (
          <div key={s} className="flex items-center gap-1">
            {idx > 0 && (
              <div className="w-6 h-px shrink-0" style={{ background: lineColor }} />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full shrink-0 transition-all"
                style={{ background: dotColor, boxShadow: isCurrent ? `0 0 6px ${dotColor}` : undefined }}
              />
              <span
                className="text-xs whitespace-nowrap"
                style={{
                  color:      isCurrent ? STATUS_COLORS[s] : isPast ? "var(--text-dim)" : "var(--border)",
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {STATUS_LABELS[s]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = user?.role !== "Auditor";

  const [invoice, setInvoice]     = useState<Invoice | null>(null);
  const [lines, setLines]         = useState<InvoiceLine[]>([]);
  const [partner, setPartner]     = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [paymentAmount, setPaymentAmount]         = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isAdvancingStatus, setIsAdvancingStatus]   = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const { invoice: inv, lines: invLines } = await invoiceApi.getById(id);
      setInvoice(inv);
      setLines(invLines);
      try {
        const p = await partnerApi.getById(inv.partner_id);
        setPartner(p);
      } catch {
        // Non-fatal
      }
    } catch {
      toast("Eroare la încărcarea facturii");
      navigate("/invoices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleAdvanceStatus = async (nextStatus: InvoiceStatus) => {
    if (!invoice) return;
    setIsAdvancingStatus(true);
    try {
      const updated = await invoiceApi.updateStatus(invoice.id, nextStatus);
      setInvoice(updated);
      if (nextStatus === "Paid" && updated.tx_hash) {
        toast("Factura marcată plătită și ancorată pe blockchain!");
      } else if (nextStatus === "Paid") {
        toast("Factura marcată plătită. Ancorarea blockchain a eșuat — reîncercați mai târziu.");
      } else {
        toast(`Starea facturii actualizată: ${STATUS_LABELS[nextStatus]}`);
      }
    } catch {
      toast("Eroare la actualizarea stării");
    } finally {
      setIsAdvancingStatus(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice) return;
    setIsAdvancingStatus(true);
    try {
      const updated = await invoiceApi.updateStatus(invoice.id, "Cancelled");
      setInvoice(updated);
      toast("Factura a fost anulată");
    } catch {
      toast("Eroare la anulare");
    } finally {
      setIsAdvancingStatus(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!invoice || !paymentAmount) return;
    setIsRecordingPayment(true);
    try {
      const updated = await invoiceApi.recordPayment(invoice.id, paymentAmount);
      setInvoice(updated);
      setPaymentAmount("");
      toast("Plată înregistrată");
    } catch {
      toast("Eroare la înregistrarea plății");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  if (isLoading || !invoice) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--blue)", borderTopColor: "transparent" }}
          />
        </div>
      </AppLayout>
    );
  }

  const transition      = TRANSITIONS[invoice.status];
  const canCancel       = canEdit && invoice.status !== "Paid" && invoice.status !== "Cancelled";
  const canRecordPayment = canEdit && (invoice.status === "Issued" || invoice.status === "Sent") && parseFloat(invoice.amount_due) > 0;
  const type            = TYPE_STYLE[invoice.transaction_type ?? ""];
  const isOverdue       = invoice.due_date && invoice.status !== "Paid" && invoice.status !== "Cancelled" && new Date(invoice.due_date) < new Date();

  return (
    <AppLayout>
      <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-5">

        {/* ── Header ── */}
        <div className="fade-up">
          <button
            onClick={() => navigate("/invoices")}
            className="flex items-center gap-1.5 text-xs mb-4 transition-colors group"
            style={{ color: "var(--text-dim)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "inherit" }}>
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Înapoi la Facturi
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1
                  className="font-display text-2xl font-bold font-mono"
                  style={{ color: "var(--text)" }}
                >
                  {invoice.number}
                  {invoice.series && (
                    <span className="ml-2 text-base font-normal" style={{ color: "var(--text-dim)" }}>
                      / {invoice.series}
                    </span>
                  )}
                </h1>
                {invoice.tx_hash && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    title={`Ancorată pe Sepolia · bloc #${invoice.block_number}`}
                    style={{ background: "color-mix(in srgb, #6F00FF 12%, transparent)", color: "#6F00FF", border: "1px solid color-mix(in srgb, #6F00FF 25%, transparent)" }}
                  >
                    ⛓ on-chain
                  </span>
                )}
                {type && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: type.bg, color: type.color }}
                  >
                    {type.label}
                  </span>
                )}
              </div>
              <StatusStepper status={invoice.status} />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && invoice.status === "Draft" && (
                <button
                  onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                  className="btn-secondary text-sm"
                >
                  Editează
                </button>
              )}
              {canEdit && transition && (
                <button
                  onClick={() => handleAdvanceStatus(transition.next)}
                  disabled={isAdvancingStatus}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {isAdvancingStatus ? (
                    <>
                      <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                      {transition.loadingLabel}
                    </>
                  ) : transition.label}
                </button>
              )}
              {canCancel && invoice.status !== "Draft" && (
                <button
                  onClick={handleCancelInvoice}
                  disabled={isAdvancingStatus}
                  className="btn-danger text-sm"
                >
                  Anulează
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Info row: partner + dates + financial ── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 fade-up"
          style={{ animationDelay: "40ms" }}
        >
          {/* Partner */}
          <div className="card p-4 space-y-3">
            <p
              className="text-[10px] font-mono uppercase tracking-wider font-medium"
              style={{ color: "var(--text-dim)" }}
            >
              Partener
            </p>
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                {partner?.denumire ?? "—"}
              </p>
              {partner?.cod_fiscal && (
                <p className="font-mono text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
                  {partner.cod_fiscal}
                </p>
              )}
              {partner?.adresa && (
                <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
                  {partner.adresa}
                </p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="card p-4 space-y-3">
            <p
              className="text-[10px] font-mono uppercase tracking-wider font-medium"
              style={{ color: "var(--text-dim)" }}
            >
              Date
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>Emisă</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text)" }}>
                  {new Date(invoice.issued_date).toLocaleDateString("ro-RO")}
                </p>
              </div>
              {invoice.due_date && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>Scadentă</p>
                  <p
                    className="text-sm font-medium mt-0.5"
                    style={{ color: isOverdue ? "var(--red)" : "var(--text)", fontWeight: isOverdue ? 600 : undefined }}
                  >
                    {new Date(invoice.due_date).toLocaleDateString("ro-RO")}
                    {isOverdue && <span className="ml-1.5 text-xs">⚠ Restantă</span>}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Financial summary */}
          <div className="card p-4 space-y-3">
            <p
              className="text-[10px] font-mono uppercase tracking-wider font-medium"
              style={{ color: "var(--text-dim)" }}
            >
              Rezumat financiar
            </p>
            <div>
              <p
                className="font-display text-2xl font-bold font-mono"
                style={{ color: "var(--text)" }}
              >
                {formatMoney(invoice.total, invoice.currency)}
              </p>
              <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-dim)" }}>
                {invoice.currency !== "RON" ? invoice.currency : ""} · incl. TVA {formatMoney(invoice.total_vat, invoice.currency)}
              </p>
            </div>
            <div className="space-y-1.5 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--text-dim)" }}>Subtotal</span>
                <span className="font-mono" style={{ color: "var(--text)" }}>
                  {formatMoney(invoice.subtotal, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--text-dim)" }}>TVA</span>
                <span className="font-mono" style={{ color: "var(--text)" }}>
                  {formatMoney(invoice.total_vat, invoice.currency)}
                </span>
              </div>
              {parseFloat(invoice.amount_paid) > 0 && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-dim)" }}>Plătit</span>
                  <span className="font-mono font-semibold" style={{ color: "var(--green)" }}>
                    {formatMoney(invoice.amount_paid, invoice.currency)}
                  </span>
                </div>
              )}
              {parseFloat(invoice.amount_due) > 0 && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-dim)" }}>Rest de plată</span>
                  <span className="font-mono font-semibold" style={{ color: "var(--amber, #f59e0b)" }}>
                    {formatMoney(invoice.amount_due, invoice.currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Blockchain anchor status ── */}
        {invoice.status === "Paid" && (
          <div
            className="card p-4 fade-up"
            style={{
              animationDelay: "80ms",
              border: invoice.tx_hash
                ? "1px solid color-mix(in srgb, #6F00FF 25%, transparent)"
                : "1px solid color-mix(in srgb, var(--amber, #f59e0b) 25%, transparent)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{invoice.tx_hash ? "⛓" : "⏳"}</span>
              <p
                className="text-xs font-mono uppercase tracking-wider font-semibold"
                style={{ color: invoice.tx_hash ? "#6F00FF" : "var(--amber, #f59e0b)" }}
              >
                {invoice.tx_hash ? "Ancorată pe Blockchain (Sepolia)" : "Ancorare în curs sau eșuată"}
              </p>
            </div>

            {invoice.tx_hash ? (
              <div className="space-y-2 text-xs" style={{ color: "var(--text-dim)" }}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div>
                    <span>Bloc </span>
                    <span className="font-mono font-semibold" style={{ color: "var(--text)" }}>
                      #{invoice.block_number?.toLocaleString("ro-RO")}
                    </span>
                  </div>
                  {invoice.anchored_at && (
                    <div>
                      <span>Marcat </span>
                      <span className="font-mono" style={{ color: "var(--text)" }}>
                        {new Date(invoice.anchored_at).toLocaleString("ro-RO")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-mono text-[11px] truncate"
                    style={{ maxWidth: "300px", color: "var(--text-dim)" }}
                  >
                    {invoice.tx_hash}
                  </span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${invoice.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-lg font-medium shrink-0 transition-opacity"
                    style={{
                      background: "color-mix(in srgb, var(--blue) 10%, transparent)",
                      color: "var(--blue)",
                      border: "1px solid color-mix(in srgb, var(--blue) 25%, transparent)",
                    }}
                  >
                    Etherscan ↗
                  </a>
                </div>
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                  Hash-ul SHA-256 al acestei facturi a fost înscris imutabil pe Sepolia.
                  Oricine poate verifica autenticitatea ei fără a accesa datele originale.
                </p>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                Factura a fost marcată plătită dar ancorarea pe blockchain nu a reușit.
                Aceasta nu afectează valabilitatea facturii. Contactați suportul dacă problema persistă.
              </p>
            )}
          </div>
        )}

        {/* ── Lines table ── */}
        <div
          className="card overflow-hidden fade-up"
          style={{ animationDelay: "120ms", boxShadow: "var(--shadow-md)" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-[10px] font-mono uppercase tracking-wider font-medium" style={{ color: "var(--text-dim)" }}>
              Linii factură
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: "640px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["#", "Descriere", "UM", "Cant.", "Preț unitar", "Disc.%", "TVA", "Subtotal", "TVA val.", "Total"].map((h) => (
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
                {lines.map((l) => (
                  <tr key={l.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-3.5 font-mono text-xs" style={{ color: "var(--text-dim)" }}>
                      {l.position}
                    </td>
                    <td className="px-4 py-3.5" style={{ maxWidth: "200px" }}>
                      <p className="font-medium" style={{ color: "var(--text)" }}>{l.description}</p>
                      {l.product_code && (
                        <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--text-dim)" }}>
                          {l.product_code}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5" style={{ color: "var(--text-dim)" }}>{l.unit}</td>
                    <td className="px-4 py-3.5 font-mono" style={{ color: "var(--text)" }}>
                      {formatQty(l.quantity)}
                    </td>
                    <td className="px-4 py-3.5 font-mono" style={{ color: "var(--text)" }}>
                      {formatMoney(l.unit_price, invoice.currency)}
                    </td>
                    <td className="px-4 py-3.5 font-mono" style={{ color: "var(--text-dim)" }}>
                      {parseFloat(l.discount_percent) > 0 ? `${l.discount_percent}%` : "—"}
                    </td>
                    <td className="px-4 py-3.5" style={{ color: "var(--text-dim)" }}>{l.vat_rate}</td>
                    <td className="px-4 py-3.5 font-mono text-right" style={{ color: "var(--text-dim)" }}>
                      {formatMoney(l.line_subtotal, invoice.currency)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-right" style={{ color: "var(--text-dim)" }}>
                      {formatMoney(l.line_vat, invoice.currency)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-right font-semibold" style={{ color: "var(--text)" }}>
                      {formatMoney(l.line_total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Notes / payment terms ── */}
        {(invoice.notes || invoice.payment_terms) && (
          <div
            className="card p-4 space-y-3 fade-up"
            style={{ animationDelay: "160ms" }}
          >
            {invoice.payment_terms && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--text-dim)" }}>
                  Termene plată
                </p>
                <p className="text-sm" style={{ color: "var(--text)" }}>{invoice.payment_terms}</p>
              </div>
            )}
            {invoice.notes && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--text-dim)" }}>
                  Observații
                </p>
                <p className="text-sm" style={{ color: "var(--text)" }}>{invoice.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Record payment ── */}
        {canRecordPayment && (
          <div
            className="card p-4 fade-up"
            style={{ animationDelay: "200ms" }}
          >
            <p className="text-[10px] font-mono uppercase tracking-wider mb-3" style={{ color: "var(--text-dim)" }}>
              Înregistrează plată
            </p>
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-xs">
                <label className="text-xs mb-1 block" style={{ color: "var(--text-dim)" }}>
                  Suma ({invoice.currency})
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input font-mono"
                  placeholder={invoice.amount_due}
                  min="0"
                  step="0.01"
                />
              </div>
              <button
                onClick={handleRecordPayment}
                disabled={isRecordingPayment || !paymentAmount}
                className="btn-primary"
              >
                {isRecordingPayment ? "Se înregistrează..." : "Înregistrează"}
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
