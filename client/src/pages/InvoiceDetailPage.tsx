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

const DOC_TYPE_LABELS: Record<string, string> = {
  TaxInvoice:   "FACTURĂ FISCALĂ",
  Proforma:     "FACTURĂ PROFORMĂ",
  CreditNote:   "FACTURĂ STORNO",
  Receipt:      "CHITANȚĂ",
  DeliveryNote: "AVIZ DE ÎNSOȚIRE",
};

const VAT_LABELS: Record<string, string> = {
  Standard: "19%",
  Reduced9: "9%",
  Reduced5: "5%",
  Exempt:   "Scutit",
};

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generateInvoicePdf(invoice: Invoice, lines: InvoiceLine[], partner: Partner | null) {
  const entityName   = localStorage.getItem("tc_entity_name")   ?? "—";
  const entityFiscal = localStorage.getItem("tc_entity_fiscal")  ?? "";

  const isIncome = invoice.transaction_type === "Income";
  const furnizor   = isIncome
    ? { name: entityName, fiscal: entityFiscal, addr: null as string | null, tel: null as string | null, email: null as string | null }
    : { name: partner?.denumire ?? "—", fiscal: partner?.cod_fiscal ?? "", addr: partner?.adresa ?? null, tel: partner?.telefon ?? null, email: partner?.email ?? null };
  const beneficiar = isIncome
    ? { name: partner?.denumire ?? "—", fiscal: partner?.cod_fiscal ?? "", addr: partner?.adresa ?? null, tel: partner?.telefon ?? null, email: partner?.email ?? null, iban: partner?.iban ?? null }
    : { name: entityName, fiscal: entityFiscal, addr: null as string | null, tel: null as string | null, email: null as string | null, iban: null as string | null };

  const fmt = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? v : new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("ro-RO") : "—";

  const overdue = !!(invoice.due_date && invoice.status !== "Paid" && invoice.status !== "Cancelled" && new Date(invoice.due_date) < new Date());
  const amountPaid = parseFloat(invoice.amount_paid) || 0;
  const amountDue  = parseFloat(invoice.amount_due)  || 0;

  // Group lines by VAT rate for summary
  const vatGroups: Record<string, { base: number; vat: number }> = {};
  for (const l of lines) {
    if (!vatGroups[l.vat_rate]) vatGroups[l.vat_rate] = { base: 0, vat: 0 };
    vatGroups[l.vat_rate].base += parseFloat(l.line_subtotal) || 0;
    vatGroups[l.vat_rate].vat  += parseFloat(l.line_vat)      || 0;
  }

  const partyCard = (role: string, name: string, fiscal: string, addr: string | null, tel: string | null, email: string | null, iban?: string | null) => `
    <div class="party">
      <div class="party-role">${role}</div>
      <div class="party-name">${escHtml(name)}</div>
      ${fiscal ? `<div class="party-detail">CIF/CNP: <strong>${escHtml(fiscal)}</strong></div>` : ""}
      ${addr   ? `<div class="party-detail">${escHtml(addr)}</div>` : ""}
      ${tel    ? `<div class="party-detail">Tel: ${escHtml(tel)}</div>` : ""}
      ${email  ? `<div class="party-detail">Email: ${escHtml(email)}</div>` : ""}
      ${iban   ? `<div class="party-detail">IBAN: ${escHtml(iban)}</div>` : ""}
    </div>`;

  const linesHtml = lines.map((l) => `
    <tr>
      <td>${l.position}</td>
      <td>${escHtml(l.description)}${l.product_code ? `<br><span style="font-size:7pt;color:#9ca3af">${escHtml(l.product_code)}</span>` : ""}</td>
      <td>${escHtml(l.unit)}</td>
      <td class="right mono">${parseFloat(l.quantity).toLocaleString("ro-RO", { maximumFractionDigits: 4 })}</td>
      <td class="right mono">${fmt(l.unit_price)}</td>
      <td class="right">${parseFloat(l.discount_percent) > 0 ? escHtml(l.discount_percent) + "%" : "—"}</td>
      <td class="right">${VAT_LABELS[l.vat_rate] ?? l.vat_rate}</td>
      <td class="right mono">${fmt(l.line_subtotal)}</td>
      <td class="right mono">${fmt(l.line_vat)}</td>
      <td class="right mono bold">${fmt(l.line_total)}</td>
    </tr>`).join("");

  const vatSummaryHtml = Object.entries(vatGroups).map(([rate, { base, vat }]) => `
    <tr>
      <td>TVA ${VAT_LABELS[rate] ?? rate}</td>
      <td class="right mono">${new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2 }).format(base)}</td>
      <td class="right mono">${new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2 }).format(vat)}</td>
    </tr>`).join("");

  const blockchainHtml = invoice.tx_hash ? `
    <div class="blockchain">
      <div class="blockchain-title">⛓ Ancorată pe Blockchain Ethereum (Sepolia Testnet)</div>
      <div class="blockchain-hash">TX: ${escHtml(invoice.tx_hash)}</div>
      <div class="blockchain-info">Bloc #${invoice.block_number?.toLocaleString("ro-RO") ?? "—"} · ${invoice.anchored_at ? new Date(invoice.anchored_at).toLocaleString("ro-RO") : ""}</div>
      <div class="blockchain-info" style="margin-top:4px;font-size:6.5pt;opacity:0.8">Hash-ul SHA-256 al acestei facturi a fost înscris imutabil pe blockchain. Autenticitatea poate fi verificată independent.</div>
    </div>` : "";

  const html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <title>${DOC_TYPE_LABELS[invoice.document_type] ?? "Factură"} ${invoice.series ?? ""} ${escHtml(invoice.number)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#1f2937;background:#fff;padding:18mm 20mm 14mm}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}
    .brand-name{font-size:21pt;font-weight:800;color:#4f46e5;letter-spacing:-0.5px}
    .brand-tag{font-size:7.5pt;color:#9ca3af;margin-top:2px}
    .inv-title{text-align:right}
    .inv-type{font-size:13pt;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.5px}
    .inv-num{font-size:11pt;font-weight:700;color:#4f46e5;margin-top:3px;font-family:'Courier New',monospace}
    .divider{height:3px;background:linear-gradient(90deg,#4f46e5,#7c3aed,#c4b5fd);margin:14px 0;border-radius:2px}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px}
    .party{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:13px 15px}
    .party-role{font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#9ca3af;margin-bottom:7px}
    .party-name{font-size:11pt;font-weight:700;color:#111827;line-height:1.3;margin-bottom:4px}
    .party-detail{font-size:8pt;color:#6b7280;margin-top:2px;line-height:1.5}
    .meta-row{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:18px}
    .meta-cell{padding:9px 13px;background:#fff}
    .meta-cell:not(:last-child){border-right:1px solid #e5e7eb}
    .meta-label{font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-bottom:4px}
    .meta-value{font-size:10pt;font-weight:600;color:#111827}
    .meta-value.ov{color:#dc2626}
    table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:8.5pt}
    thead tr{background:#4f46e5}
    thead th{padding:7px 8px;text-align:left;font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#fff;white-space:nowrap}
    thead th.right{text-align:right}
    tbody tr:nth-child(even){background:#f9fafb}
    tbody td{padding:7px 8px;color:#374151;vertical-align:top;border-bottom:1px solid #f3f4f6}
    tbody td.right{text-align:right}
    tbody td.mono{font-family:'Courier New',monospace}
    tbody td.bold{font-weight:700}
    tfoot td{padding:6px 8px;background:#eef2ff;font-weight:700;font-size:9pt;border-top:2px solid #4f46e5}
    tfoot td.right{text-align:right}
    .totals-wrap{display:flex;justify-content:flex-end;margin-bottom:18px}
    .totals{min-width:260px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
    .tr{display:flex;justify-content:space-between;align-items:center;padding:7px 13px;font-size:9.5pt}
    .tr+.tr{border-top:1px solid #f3f4f6}
    .tr .lbl{color:#6b7280;font-size:8.5pt}
    .tr .val{font-family:'Courier New',monospace;font-size:9pt;font-weight:600}
    .tr.grand{background:#4f46e5;color:#fff;padding:10px 13px}
    .tr.grand .lbl{color:rgba(255,255,255,.85);font-size:9pt;font-weight:700}
    .tr.grand .val{font-size:12pt;font-weight:800}
    .tr.paid .val{color:#16a34a}
    .tr.due  .val{color:#d97706}
    .vat-wrap{margin-bottom:18px}
    .sec-title{font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#9ca3af;margin-bottom:7px}
    .vt{width:auto;min-width:300px}
    .vt thead tr{background:#f3f4f6}
    .vt thead th{color:#374151}
    .vt tbody td{background:#fff}
    .blockchain{background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:11px 14px;margin-bottom:14px}
    .blockchain-title{font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#7c3aed;margin-bottom:5px}
    .blockchain-hash{font-family:'Courier New',monospace;font-size:7.5pt;color:#6d28d9;word-break:break-all;margin-bottom:3px}
    .blockchain-info{font-size:7.5pt;color:#7c3aed}
    .note-box{font-size:8.5pt;color:#374151;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:12px}
    .note-lbl{font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#92400e;margin-bottom:5px}
    .footer{border-top:1px solid #e5e7eb;padding-top:14px;margin-top:22px}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px}
    .sig-label{font-size:7.5pt;font-weight:600;text-transform:uppercase;color:#9ca3af;letter-spacing:.1em;margin-bottom:34px}
    .sig-line{border-top:1px solid #374151;padding-top:5px;font-size:8pt;color:#374151}
    .generated{text-align:center;font-size:6.5pt;color:#d1d5db;margin-top:14px}
    @media print{body{padding:8mm 10mm 6mm}@page{margin:6mm;size:A4}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-name">TaxChain</div>
      <div class="brand-tag">Platforma fiscală inteligentă &middot; taxchain.ro</div>
    </div>
    <div class="inv-title">
      <div class="inv-type">${DOC_TYPE_LABELS[invoice.document_type] ?? "Factură"}</div>
      <div class="inv-num">${invoice.series ? escHtml(invoice.series) + "&nbsp;" : ""}${escHtml(invoice.number)}</div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="parties">
    ${partyCard("Furnizor / Emitent", furnizor.name, furnizor.fiscal, furnizor.addr, furnizor.tel, furnizor.email)}
    ${partyCard("Beneficiar / Client", beneficiar.name, beneficiar.fiscal, beneficiar.addr, beneficiar.tel, beneficiar.email, (beneficiar as {iban?: string|null}).iban)}
  </div>

  <div class="meta-row">
    <div class="meta-cell"><div class="meta-label">Data emiterii</div><div class="meta-value">${fmtDate(invoice.issued_date)}</div></div>
    <div class="meta-cell"><div class="meta-label">Data scadenței</div><div class="meta-value${overdue ? " ov" : ""}">${fmtDate(invoice.due_date)}${overdue ? " ⚠" : ""}</div></div>
    <div class="meta-cell"><div class="meta-label">Monedă</div><div class="meta-value">${escHtml(invoice.currency)}</div></div>
    <div class="meta-cell"><div class="meta-label">Status</div><div class="meta-value">${STATUS_LABELS[invoice.status]}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th><th>Descriere</th><th>UM</th>
        <th class="right">Cant.</th><th class="right">Preț unitar</th><th class="right">Disc.%</th>
        <th class="right">TVA</th><th class="right">Bază (${escHtml(invoice.currency)})</th>
        <th class="right">TVA val. (${escHtml(invoice.currency)})</th><th class="right">Total (${escHtml(invoice.currency)})</th>
      </tr>
    </thead>
    <tbody>${linesHtml}</tbody>
    <tfoot>
      <tr>
        <td colspan="7"></td>
        <td class="right">${fmt(invoice.subtotal)}</td>
        <td class="right">${fmt(invoice.total_vat)}</td>
        <td class="right">${fmt(invoice.total)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="tr"><span class="lbl">Subtotal (bază impozabilă)</span><span class="val">${fmt(invoice.subtotal)} ${escHtml(invoice.currency)}</span></div>
      <div class="tr"><span class="lbl">TVA total</span><span class="val">${fmt(invoice.total_vat)} ${escHtml(invoice.currency)}</span></div>
      <div class="tr grand"><span class="lbl">TOTAL DE PLATĂ</span><span class="val">${fmt(invoice.total)} ${escHtml(invoice.currency)}</span></div>
      ${amountPaid > 0 ? `<div class="tr paid"><span class="lbl">Achitat</span><span class="val">${fmt(invoice.amount_paid)} ${escHtml(invoice.currency)}</span></div>` : ""}
      ${amountDue  > 0 ? `<div class="tr due"><span class="lbl">Rest de plată</span><span class="val">${fmt(invoice.amount_due)} ${escHtml(invoice.currency)}</span></div>` : ""}
    </div>
  </div>

  ${Object.keys(vatGroups).length > 0 ? `
  <div class="vat-wrap">
    <div class="sec-title">Centralizator TVA</div>
    <table class="vt">
      <thead><tr><th>Cota TVA</th><th class="right">Bază impozabilă (${escHtml(invoice.currency)})</th><th class="right">TVA (${escHtml(invoice.currency)})</th></tr></thead>
      <tbody>${vatSummaryHtml}</tbody>
    </table>
  </div>` : ""}

  ${blockchainHtml}

  ${invoice.payment_terms ? `<div class="note-box"><div class="note-lbl">Termene de plată</div>${escHtml(invoice.payment_terms)}</div>` : ""}
  ${invoice.notes ? `<div class="note-box"><div class="note-lbl">Observații</div>${escHtml(invoice.notes)}</div>` : ""}

  <div class="footer">
    <div class="sig-grid">
      <div>
        <div class="sig-label">Furnizor &mdash; ${escHtml(furnizor.name)}</div>
        <div class="sig-line">Semnătură și ștampilă</div>
      </div>
      <div>
        <div class="sig-label">Beneficiar &mdash; ${escHtml(beneficiar.name)}</div>
        <div class="sig-line">Semnătură de primire</div>
      </div>
    </div>
  </div>

  <div class="generated">Generat de TaxChain &middot; ${new Date().toLocaleString("ro-RO")} &middot; Document generat electronic, valabil fără semnătură olografă conform legislației în vigoare.</div>

  <script>window.onload=()=>{window.print();}<\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

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
  Issued: { next: "Sent",   label: "Marchează trimisă & ancorează on-chain", loadingLabel: "Ancorare pe blockchain (~30s)..." },
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

// ── Reusable blockchain anchor card ──────────────────────────────────────────

function AnchorCard({
  label,
  txHash,
  blockNumber,
  anchoredAt,
  failedMessage,
  animationDelay,
}: {
  label: string;
  txHash: string | null;
  blockNumber: number | null;
  anchoredAt: string | null;
  failedMessage: string;
  animationDelay?: string;
}) {
  return (
    <div
      className="card p-4 fade-up"
      style={{
        animationDelay,
        border: txHash
          ? "1px solid color-mix(in srgb, #6F00FF 25%, transparent)"
          : "1px solid color-mix(in srgb, var(--amber, #f59e0b) 25%, transparent)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{txHash ? "⛓" : "⏳"}</span>
        <p
          className="text-xs font-mono uppercase tracking-wider font-semibold"
          style={{ color: txHash ? "#6F00FF" : "var(--amber, #f59e0b)" }}
        >
          {txHash ? label : "Ancorare în curs sau eșuată"}
        </p>
      </div>

      {txHash ? (
        <div className="space-y-2 text-xs" style={{ color: "var(--text-dim)" }}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div>
              <span>Bloc </span>
              <span className="font-mono font-semibold" style={{ color: "var(--text)" }}>
                #{blockNumber?.toLocaleString("ro-RO")}
              </span>
            </div>
            {anchoredAt && (
              <div>
                <span>Marcat </span>
                <span className="font-mono" style={{ color: "var(--text)" }}>
                  {new Date(anchoredAt).toLocaleString("ro-RO")}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-mono text-[11px] truncate"
              style={{ maxWidth: "300px", color: "var(--text-dim)" }}
            >
              {txHash}
            </span>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
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
          {failedMessage} Aceasta nu afectează valabilitatea facturii.
        </p>
      )}
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
      if (nextStatus === "Sent" && updated.sent_tx_hash) {
        toast("Factura marcată trimisă și ancorată pe blockchain!");
      } else if (nextStatus === "Sent") {
        toast("Factura marcată trimisă. Ancorarea blockchain a eșuat — reîncercați mai târziu.");
      } else if (nextStatus === "Paid" && updated.tx_hash) {
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
                {(invoice.sent_tx_hash || invoice.tx_hash) && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    title={invoice.tx_hash
                      ? `Ancorat la trimitere și la plată · Sepolia`
                      : `Ancorat la trimitere · Sepolia bloc #${invoice.sent_block_number}`}
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
              <button
                onClick={() => generateInvoicePdf(invoice, lines, partner)}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "inherit" }}>
                  <path d="M3 12h10M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export PDF
              </button>
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

        {/* ── Blockchain anchor — Sent ── */}
        {(invoice.status === "Sent" || invoice.status === "Paid") && (
          <AnchorCard
            label="Ancorat la trimitere (Sepolia)"
            txHash={invoice.sent_tx_hash}
            blockNumber={invoice.sent_block_number}
            anchoredAt={invoice.sent_anchored_at}
            failedMessage="Factura a fost marcată trimisă dar ancorarea pe blockchain nu a reușit."
            animationDelay="80ms"
          />
        )}

        {/* ── Blockchain anchor — Paid ── */}
        {invoice.status === "Paid" && (
          <AnchorCard
            label="Ancorat la plată (Sepolia)"
            txHash={invoice.tx_hash}
            blockNumber={invoice.block_number}
            anchoredAt={invoice.anchored_at}
            failedMessage="Factura a fost marcată plătită dar ancorarea pe blockchain nu a reușit."
            animationDelay="100ms"
          />
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
