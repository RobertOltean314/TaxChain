import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { invoiceGetById, invoiceSetStatus, invoiceSetPayment, invoiceDelete } from "../api/invoice.api";
import { partenerGetById } from "../api/partener.api";
import { Confirm } from "../components/ui/Confirm";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../auth/useAuth";
import { Spinner, BtnBack, Badge, fmtNum, fmtDate } from "../components/ui/ui";
import type { Invoice, InvoiceLine, InvoiceStatus, Partner } from "../types";
import { DOC_TYPE_LABELS, STATUS_LABELS, VAT_LABELS, NEXT_STATUSES } from "../types";

// Colour per next-status button
const NEXT_COLORS: Record<InvoiceStatus, string> = {
  Draft:     "var(--text-sub)",
  Issued:    "var(--blue)",
  Sent:      "var(--violet)",
  Paid:      "var(--green)",
  Cancelled: "var(--red)",
};

export default function InvoiceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();

  const [invoice, setInvoice]     = useState<Invoice | null>(null);
  const [lines, setLines]         = useState<InvoiceLine[]>([]);
  const [partner, setPartner]     = useState<Partner | null>(null);
  const [loading, setLoading]     = useState(true);

  const [payAmt, setPayAmt]         = useState("");
  const [savingPay, setSavingPay]   = useState(false);
  const [nextTarget, setNextTarget] = useState<InvoiceStatus | null>(null);
  const [transiting, setTransiting] = useState(false);
  const [showDel, setShowDel]       = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const canWrite = user?.role === "Admin" || user?.role === "Taxpayer";

  useEffect(() => {
    if (!id) return;
    invoiceGetById(id)
      .then(({ invoice: inv, lines: ln }) => {
        setInvoice(inv);
        setLines(ln);
        if (inv.partner_id) {
          partenerGetById(inv.partner_id).then(setPartner).catch(() => {});
        }
      })
      .catch(() => { toast("Eroare la încărcare.", "err"); navigate("/facturi"); })
      .finally(() => setLoading(false));
  }, [id]);

  // Status transition
  const doTransition = async () => {
    if (!invoice || !nextTarget) return;
    setTransiting(true);
    try {
      const updated = await invoiceSetStatus(invoice.id, { status: nextTarget });
      setInvoice(updated);
      toast(`Stare → ${STATUS_LABELS[nextTarget]}`, "ok");
    } catch (e: any) {
      toast(e?.response?.data?.error ?? "Eroare la actualizarea stării.", "err");
    } finally { setTransiting(false); setNextTarget(null); }
  };

  // Payment — body must be { amount: number } per InvoicePaymentRequest in Rust
  const doPayment = async () => {
    if (!invoice) return;
    const amount = parseFloat(payAmt);
    if (isNaN(amount) || amount <= 0) { toast("Sumă invalidă.", "err"); return; }
    setSavingPay(true);
    try {
      const updated = await invoiceSetPayment(invoice.id, { amount });
      setInvoice(updated);
      setPayAmt("");
      toast("Plată înregistrată.", "ok");
    } catch (e: any) {
      toast(e?.response?.data?.error ?? "Eroare la înregistrarea plății.", "err");
    } finally { setSavingPay(false); }
  };

  // Delete
  const doDelete = async () => {
    if (!invoice) return;
    setDeleting(true);
    try {
      await invoiceDelete(invoice.id);
      toast("Factură ștearsă.", "ok");
      navigate("/facturi");
    } catch (e: any) {
      toast(e?.response?.data?.error ?? "Eroare la ștergere.", "err");
    } finally { setDeleting(false); setShowDel(false); }
  };

  if (loading) return <div className="p-8"><Spinner /></div>;
  if (!invoice) return null;

  const numStr = `${invoice.series ? invoice.series + "-" : ""}${invoice.number}`;
  const nextStatuses = NEXT_STATUSES[invoice.status];
  const canPayment = canWrite &&
    invoice.status !== "Draft" &&
    invoice.status !== "Cancelled" &&
    invoice.amount_due > 0;

  return (
    <div className="p-8 max-w-4xl mx-auto fade-up">
      <BtnBack onClick={() => navigate("/facturi")} />

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-3xl" style={{ color: "var(--text)" }}>{numStr}</h1>
            <Badge value={invoice.status} variant="invoice" />
          </div>
          <p className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>
            {DOC_TYPE_LABELS[invoice.document_type]} · emis {fmtDate(invoice.issued_date)}
          </p>
        </div>
        {canWrite && invoice.status === "Draft" && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => navigate(`/facturi/${invoice.id}/editare`)}
              className="px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors"
              style={{ color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-dim)" }}>
              Editează
            </button>
            <button onClick={() => setShowDel(true)}
              className="px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors"
              style={{ color: "var(--red)", background: "var(--red-bg)", borderColor: "var(--red)" }}>
              Șterge
            </button>
          </div>
        )}
      </div>

      {/* ── Lifecycle ── */}
      {canWrite && nextStatuses.length > 0 && (
        <div className="rounded-xl border p-4 mb-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--text-dim)" }}>
            Tranziții disponibile
          </p>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((next) => (
              <button key={next} onClick={() => setNextTarget(next)}
                className="px-4 py-1.5 text-xs font-mono rounded-lg border transition-all"
                style={{
                  color: NEXT_COLORS[next],
                  borderColor: `${NEXT_COLORS[next]}60`,
                  background: `${NEXT_COLORS[next]}15`,
                }}>
                → {STATUS_LABELS[next]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Total factură", v: fmtNum(invoice.total, invoice.currency),      color: "var(--text)" },
          { label: "TVA total",     v: fmtNum(invoice.total_vat, invoice.currency),  color: "var(--text-sub)" },
          { label: "Achitat",       v: fmtNum(invoice.amount_paid, invoice.currency),color: "var(--green)" },
          { label: "Rest de plată", v: fmtNum(invoice.amount_due, invoice.currency), color: invoice.amount_due > 0 ? "var(--red)" : "var(--green)" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <p className="text-xs font-mono mb-1" style={{ color: "var(--text-dim)" }}>{c.label}</p>
            <p className="text-lg font-bold font-mono" style={{ color: c.color }}>{c.v}</p>
          </div>
        ))}
      </div>

      {/* ── Meta ── */}
      <div className="rounded-xl border p-5 mb-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>Detalii</p>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3 text-sm">
          {[
            { k: "Partener",      v: partner?.denumire ?? invoice.partner_id },
            { k: "Data emiterii", v: fmtDate(invoice.issued_date) },
            { k: "Scadență",      v: invoice.due_date ? fmtDate(invoice.due_date) : "—" },
            { k: "Valută",        v: invoice.currency },
            { k: "Termeni",       v: invoice.payment_terms ?? "—" },
            ...(invoice.notes ? [{ k: "Note", v: invoice.notes }] : []),
          ].map((item) => (
            <div key={item.k}>
              <dt className="text-xs font-mono mb-0.5" style={{ color: "var(--text-dim)" }}>{item.k}</dt>
              <dd style={{ color: "var(--text)" }}>{item.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── Lines table ── */}
      <div className="rounded-xl border overflow-hidden mb-5" style={{ borderColor: "var(--border)" }}>
        <div className="px-5 py-3 border-b" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>Rânduri factură</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full" style={{ background: "var(--bg-card)" }}>
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                {["#", "Descriere", "Cod", "UM", "Cant.", "Preț", "Disc.%", "TVA", "Subtotal", "TVA val.", "Total rând"].map((h, i) => (
                  <th key={h}
                    className={`px-3 py-2.5 text-xs font-mono uppercase tracking-wider whitespace-nowrap ${i > 2 ? "text-right" : "text-left"}`}
                    style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-3 py-3 text-xs font-mono" style={{ color: "var(--text-dim)" }}>{l.position}</td>
                  <td className="px-3 py-3 text-sm" style={{ color: "var(--text)" }}>{l.description}</td>
                  <td className="px-3 py-3 text-xs font-mono" style={{ color: "var(--text-sub)" }}>{l.product_code ?? "—"}</td>
                  <td className="px-3 py-3 text-xs font-mono" style={{ color: "var(--text-sub)" }}>{l.unit}</td>
                  {[l.quantity, l.unit_price, l.discount_percent].map((v, vi) => (
                    <td key={vi} className="px-3 py-3 text-sm font-mono text-right" style={{ color: "var(--text)" }}>{v}</td>
                  ))}
                  <td className="px-3 py-3 text-xs font-mono text-right" style={{ color: "var(--text-sub)" }}>{VAT_LABELS[l.vat_rate]}</td>
                  <td className="px-3 py-3 text-sm font-mono text-right" style={{ color: "var(--text)" }}>{fmtNum(l.line_subtotal)}</td>
                  <td className="px-3 py-3 text-sm font-mono text-right" style={{ color: "var(--text-sub)" }}>{fmtNum(l.line_vat)}</td>
                  <td className="px-3 py-3 text-sm font-mono text-right font-bold" style={{ color: "var(--amber)" }}>
                    {fmtNum(l.line_total)} {invoice.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Payment panel ── */}
      {canPayment && (
        <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
            Înregistrează plată
          </p>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-48 max-w-xs">
              <label className="block text-xs font-mono mb-1.5" style={{ color: "var(--text-sub)" }}>
                Sumă ({invoice.currency}) — rest: {fmtNum(invoice.amount_due)}
              </label>
              <input
                type="number" step="0.01" min="0.01"
                value={payAmt} onChange={(e) => setPayAmt(e.target.value)}
                placeholder={fmtNum(invoice.amount_due)}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono border outline-none transition-colors"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--green)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <button onClick={doPayment} disabled={savingPay || !payAmt}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50"
              style={{ color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green)" }}>
              {savingPay && <span className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--green)" }} />}
              Înregistrează
            </button>
            <button onClick={() => setPayAmt(String(invoice.amount_due.toFixed(2)))}
              className="text-xs font-mono transition-colors" style={{ color: "var(--text-dim)" }}>
              plată integrală →
            </button>
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      <Confirm
        open={!!nextTarget}
        title="Confirmă tranziție"
        body={`Schimbi starea în "${nextTarget ? STATUS_LABELS[nextTarget] : ""}"?`}
        ok="Confirmă"
        danger={nextTarget === "Cancelled"}
        loading={transiting}
        onOk={doTransition}
        onCancel={() => setNextTarget(null)}
      />
      <Confirm
        open={showDel}
        title="Șterge factură"
        body={`Ștergi definitiv factura "${numStr}"? Acțiunea este ireversibilă.`}
        ok="Șterge"
        loading={deleting}
        onOk={doDelete}
        onCancel={() => setShowDel(false)}
      />
    </div>
  );
}
