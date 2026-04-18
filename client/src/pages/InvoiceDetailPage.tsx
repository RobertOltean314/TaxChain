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

// Valid forward transitions shown as action buttons
const TRANSITIONS: Partial<
  Record<InvoiceStatus, { next: InvoiceStatus; label: string }>
> = {
  Draft: { next: "Issued", label: "Emite factura" },
  Issued: { next: "Sent", label: "Marchează trimisă" },
  Sent: { next: "Paid", label: "Marchează plătită" },
};

function formatRON(amount: string) {
  const n = parseFloat(amount);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
  }).format(n);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isReadOnly = user?.role === "Auditor";
  const canEdit = user?.role !== "Auditor";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isAdvancingStatus, setIsAdvancingStatus] = useState(false);

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
        // Non-fatal — partner name falls back to ID
      }
    } catch {
      toast("Eroare la încărcarea facturii");
      navigate("/invoices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleAdvanceStatus = async (nextStatus: InvoiceStatus) => {
    if (!invoice) return;
    setIsAdvancingStatus(true);
    try {
      const updated = await invoiceApi.updateStatus(invoice.id, nextStatus);
      setInvoice(updated);
      toast(`Starea facturii actualizată: ${STATUS_LABELS[nextStatus]}`);
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
        <div className="p-8 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const transition = TRANSITIONS[invoice.status];
  const canCancel =
    canEdit && invoice.status !== "Paid" && invoice.status !== "Cancelled";
  const canRecordPayment =
    canEdit &&
    (invoice.status === "Issued" || invoice.status === "Sent") &&
    parseFloat(invoice.amount_due) > 0;

  return (
    <AppLayout>
      <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/invoices")}
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              ← Înapoi
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl text-white">
                  {invoice.number}
                </h1>
                <span className={STATUS_CLASSES[invoice.status]}>
                  {STATUS_LABELS[invoice.status]}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Emisă: {invoice.issued_date}
                {invoice.due_date && ` · Scadentă: ${invoice.due_date}`}
              </p>
            </div>
          </div>

          {canEdit && invoice.status === "Draft" && (
            <button
              onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
              className="btn-secondary"
            >
              Editează
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* ── Parties & financials ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                Partener
              </p>
              <p className="text-white font-medium text-sm">
                {partner?.denumire ?? invoice.partner_id}
              </p>
              {partner?.cod_fiscal && (
                <p className="text-xs font-mono text-slate-400">
                  {partner.cod_fiscal}
                </p>
              )}
              {partner?.adresa && (
                <p className="text-xs text-slate-500 mt-1">{partner.adresa}</p>
              )}
            </div>
            <div className="card p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                Rezumat financiar
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="font-mono text-slate-300">
                    {formatRON(invoice.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">TVA</span>
                  <span className="font-mono text-slate-300">
                    {formatRON(invoice.total_vat)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-1 border-t border-surface-border">
                  <span className="text-white">Total</span>
                  <span className="font-mono text-white">
                    {formatRON(invoice.total)}
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-slate-400">Plătit</span>
                  <span className="font-mono text-success">
                    {formatRON(invoice.amount_paid)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Rest de plată</span>
                  <span
                    className={`font-mono ${parseFloat(invoice.amount_due) > 0 ? "text-warning" : "text-slate-600"}`}
                  >
                    {formatRON(invoice.amount_due)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Lines ── */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-surface-border">
                    {[
                      "#",
                      "Descriere",
                      "UM",
                      "Cant.",
                      "Preț unitar",
                      "Disc.%",
                      "TVA",
                      "Subtotal",
                      "TVA val.",
                      "Total",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[10px] text-slate-500 uppercase px-4 py-3 font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-surface-border/40"
                    >
                      <td className="px-4 py-3 text-slate-500">{l.position}</td>
                      <td className="px-4 py-3 text-white max-w-[180px]">
                        <p className="font-medium">{l.description}</p>
                        {l.product_code && (
                          <p className="font-mono text-[10px] text-slate-500">
                            {l.product_code}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{l.unit}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {l.quantity}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {l.unit_price}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {l.discount_percent}%
                      </td>
                      <td className="px-4 py-3 text-slate-400">{l.vat_rate}</td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-right">
                        {l.line_subtotal}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-right">
                        {l.line_vat}
                      </td>
                      <td className="px-4 py-3 font-mono text-white font-medium text-right">
                        {l.line_total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Notes ── */}
          {(invoice.notes || invoice.payment_terms) && (
            <div className="card p-4 space-y-2">
              {invoice.payment_terms && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Termene plată
                  </p>
                  <p className="text-sm text-slate-300 mt-1">
                    {invoice.payment_terms}
                  </p>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Observații
                  </p>
                  <p className="text-sm text-slate-300 mt-1">{invoice.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Actions ── */}
          {canEdit && (
            <div className="card p-5 space-y-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                Acțiuni
              </p>

              <div className="flex flex-wrap gap-3">
                {transition && (
                  <button
                    onClick={() => handleAdvanceStatus(transition.next)}
                    disabled={isAdvancingStatus}
                    className="btn-primary"
                  >
                    {isAdvancingStatus ? "Se procesează..." : transition.label}
                  </button>
                )}
                {canCancel && invoice.status !== "Draft" && (
                  <button
                    onClick={handleCancelInvoice}
                    disabled={isAdvancingStatus}
                    className="btn-danger"
                  >
                    Anulează factura
                  </button>
                )}
              </div>

              {canRecordPayment && (
                <div className="flex items-end gap-3 pt-2 border-t border-surface-border">
                  <div className="flex-1 max-w-xs">
                    <label className="input-label">
                      Înregistrează plată (RON)
                    </label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="input-field font-mono"
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
                    {isRecordingPayment
                      ? "Se înregistrează..."
                      : "Înregistrează"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
