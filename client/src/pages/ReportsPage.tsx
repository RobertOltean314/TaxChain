import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "../components/ui/AppLayout";
import { invoiceApi } from "../api/invoice.api";
import { partnerApi } from "../api/partner.api";
import { bnrApi } from "../api/bnr.api";
import { reportApi } from "../api/report.api";
import { useToast } from "../components/ui/Toast";
import { useEntity } from "../auth/useEntity";
import { PageHeader, Button, Spinner } from "../components/ui/ui";
import type { Invoice, Partner, VatSummary } from "../types";

// ── Formatare ──────────────────────────────────────────────────────────────

function formatRON(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "0,00 RON";
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function toCsv(value: string | number) {
  const text = String(value ?? "");
  return text.includes(",") || text.includes("\n") || text.includes('"')
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

// ── Tipuri perioadă ────────────────────────────────────────────────────────

type PeriodType = "all" | "year" | "quarter" | "month";

const QUARTER_LABELS: Record<number, string> = {
  1: "Trimestrul I (Ian–Mar)",
  2: "Trimestrul II (Apr–Iun)",
  3: "Trimestrul III (Iul–Sep)",
  4: "Trimestrul IV (Oct–Dec)",
};

const MONTH_LABELS: Record<number, string> = {
  1: "Ianuarie",
  2: "Februarie",
  3: "Martie",
  4: "Aprilie",
  5: "Mai",
  6: "Iunie",
  7: "Iulie",
  8: "August",
  9: "Septembrie",
  10: "Octombrie",
  11: "Noiembrie",
  12: "Decembrie",
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  Income: "Venit",
  Expense: "Cheltuială",
  Nedefinit: "Nedefinit",
};

// ── Constante fiscale 2025 ─────────────────────────────────────────────────

const SALARIU_MINIM = 4_050; // RON/lună
const CAS_BASE_MAX = 24 * SALARIU_MINIM;   // 97,200 RON/an — plafon CAS
const CASS_BASE_MAX = 60 * SALARIU_MINIM;  // 243,000 RON/an — plafon CASS
const MICRO_THRESHOLD_EUR = 500_000;

interface PfaTax {
  netIncome: number;
  cas: number;
  cass: number;
  impozitVenit: number;
  totalObligatii: number;
  netDupaTaxe: number;
}

interface SrlTax {
  revenue: number;
  expenses: number;
  profit: number;
  isMicro: boolean;
  taxRate: number;
  taxBase: number;
  tax: number;
  netDupaTaxe: number;
  dividendWithholding: number;
}

function computePfaTax(incomeNetRon: number, expenseNetRon: number): PfaTax {
  const netIncome = Math.max(0, incomeNetRon - expenseNetRon);
  const casBase = Math.min(netIncome, CAS_BASE_MAX);
  const cassBase = Math.min(netIncome, CASS_BASE_MAX);
  const cas = casBase * 0.25;
  const cass = cassBase * 0.10;
  const impozitVenit = Math.max(0, netIncome - cas - cass) * 0.10;
  const totalObligatii = cas + cass + impozitVenit;
  return { netIncome, cas, cass, impozitVenit, totalObligatii, netDupaTaxe: netIncome - totalObligatii };
}

function computeSrlTax(revenueRon: number, expensesRon: number, eurRate: number): SrlTax {
  const microThresholdRon = MICRO_THRESHOLD_EUR * eurRate;
  const isMicro = revenueRon <= microThresholdRon;
  const profit = revenueRon - expensesRon;
  const taxRate = isMicro ? 0.03 : 0.16;
  const taxBase = isMicro ? revenueRon : Math.max(0, profit);
  const tax = taxBase * taxRate;
  const netDupaTaxe = profit - tax;
  const dividendWithholding = Math.max(0, netDupaTaxe) * 0.08;
  return { revenue: revenueRon, expenses: expensesRon, profit, isMicro, taxRate, taxBase, tax, netDupaTaxe, dividendWithholding };
}

function getPeriodLabel(
  periodType: PeriodType,
  year: number,
  quarter: number,
  month: number,
): string {
  if (periodType === "all") return "Toate perioadele";
  if (periodType === "year") return `Anul ${year}`;
  if (periodType === "quarter") return `${QUARTER_LABELS[quarter]} ${year}`;
  return `${MONTH_LABELS[month]} ${year}`;
}

function getQuarterDeadline(year: number, quarter: number): string {
  const deadlines: Record<number, string> = {
    1: `25 Aprilie ${year}`,
    2: `25 Iulie ${year}`,
    3: `25 Octombrie ${year}`,
    4: `25 Ianuarie ${year + 1}`,
  };
  return deadlines[quarter];
}

function getMonthDeadline(year: number, month: number): string {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `25 ${MONTH_LABELS[nextMonth]} ${nextYear}`;
}

// ── Filtrare facturi după perioadă ─────────────────────────────────────────

function periodToDateRange(
  periodType: PeriodType,
  year: number,
  quarter: number,
  month: number,
): [string, string] {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (periodType === "year") {
    return [`${year}-01-01`, `${year}-12-31`];
  }
  if (periodType === "quarter") {
    const fromMonth = (quarter - 1) * 3 + 1;
    const toMonth = quarter * 3;
    const lastDay = new Date(year, toMonth, 0).getDate();
    return [`${year}-${pad(fromMonth)}-01`, `${year}-${pad(toMonth)}-${lastDay}`];
  }
  if (periodType === "month") {
    const lastDay = new Date(year, month, 0).getDate();
    return [`${year}-${pad(month)}-01`, `${year}-${pad(month)}-${lastDay}`];
  }
  // "all" — use a wide range
  return ["2000-01-01", `${year}-12-31`];
}

function filterByPeriod(
  invoices: Invoice[],
  periodType: PeriodType,
  year: number,
  quarter: number,
  month: number,
): Invoice[] {
  if (periodType === "all") return invoices;

  return invoices.filter((inv) => {
    const date = new Date(inv.issued_date);
    const invYear = date.getFullYear();
    const invMonth = date.getMonth() + 1;

    if (periodType === "year") return invYear === year;
    if (periodType === "quarter") {
      const q = Math.ceil(invMonth / 3);
      return invYear === year && q === quarter;
    }
    if (periodType === "month") {
      return invYear === year && invMonth === month;
    }
    return true;
  });
}

// ── Export CSV ─────────────────────────────────────────────────────────────

function buildD394Csv(d394Rows: ReturnType<typeof buildD394Rows>): string {
  const header = [
    "Partener",
    "Cod Fiscal",
    "Tip Tranzacție",
    "Nr. Facturi",
    "Valoare Totală (RON)",
    "TVA Total (RON)",
  ];
  const rows = d394Rows.map((row) => [
    toCsv(row.partnerName),
    toCsv(row.partnerFiscal),
    toCsv(TRANSACTION_TYPE_LABELS[row.transactionType] ?? row.transactionType),
    row.invoiceCount,
    row.total.toFixed(2),
    row.vat.toFixed(2),
  ]);
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function buildD394Rows(invoices: Invoice[], partnerMap: Map<string, Partner>, toRON: (amount: number, currency: string) => number) {
  const aggregation = new Map<
    string,
    {
      partnerId: string;
      partnerName: string;
      partnerFiscal: string;
      transactionType: string;
      invoiceCount: number;
      total: number;
      vat: number;
    }
  >();

  invoices
    .filter((inv) => inv.status === "Paid")
    .forEach((invoice) => {
      const key = `${invoice.partner_id}::${invoice.transaction_type ?? "Nedefinit"}`;
      const partner = partnerMap.get(invoice.partner_id);
      const total = toRON(parseFloat(invoice.total) || 0, invoice.currency);
      const vat = toRON(parseFloat(invoice.total_vat) || 0, invoice.currency);
      const existing = aggregation.get(key);

      if (existing) {
        aggregation.set(key, {
          ...existing,
          invoiceCount: existing.invoiceCount + 1,
          total: existing.total + total,
          vat: existing.vat + vat,
        });
      } else {
        aggregation.set(key, {
          partnerId: invoice.partner_id,
          partnerName: partner?.denumire ?? "Necunoscut",
          partnerFiscal: partner?.cod_fiscal ?? "-",
          transactionType: invoice.transaction_type ?? "Nedefinit",
          invoiceCount: 1,
          total,
          vat,
        });
      }
    });

  return Array.from(aggregation.values()).sort((a, b) =>
    a.partnerName.localeCompare(b.partnerName),
  );
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Export PDF (prin fereastră de tipărire) ────────────────────────────────

function exportToPdf(
  periodLabel: string,
  summary: ReturnType<typeof buildSummary>,
  d394Rows: ReturnType<typeof buildD394Rows>,
) {
  const vatNet = summary.incomeVat - summary.expenseVat;
  const profitBrut = summary.incomeGross - summary.expenseGross;

  const rowsHtml = d394Rows
    .map(
      (row) => `
      <tr>
        <td>${row.partnerName}</td>
        <td>${row.partnerFiscal}</td>
        <td>${TRANSACTION_TYPE_LABELS[row.transactionType] ?? row.transactionType}</td>
        <td style="text-align:right">${row.invoiceCount}</td>
        <td style="text-align:right">${row.total.toFixed(2)}</td>
        <td style="text-align:right">${row.vat.toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <title>Raport Fiscal TaxChain — ${periodLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    .period { color: #555; font-size: 11px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .card { border: 1px solid #ccc; border-radius: 6px; padding: 12px; }
    .card-label { font-size: 10px; color: #666; text-transform: uppercase; }
    .card-value { font-size: 16px; font-weight: bold; margin-top: 4px; }
    .net-positive { color: #166534; }
    .net-negative { color: #991b1b; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    th { background: #f0f0f0; text-align: left; padding: 6px 8px; border: 1px solid #ccc; }
    td { padding: 5px 8px; border: 1px solid #ddd; }
    tr:nth-child(even) td { background: #fafafa; }
    .footer { margin-top: 24px; font-size: 10px; color: #999; }
    .vat-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
  </style>
</head>
<body>
  <h1>Raport Fiscal TaxChain</h1>
  <p class="period">Perioadă: ${periodLabel} · Generat: ${new Date().toLocaleDateString("ro-RO")} · Doar facturi plătite</p>

  <h2>Sumar Financiar</h2>
  <div class="grid">
    <div class="card">
      <div class="card-label">Venituri Brute</div>
      <div class="card-value">${summary.incomeGross.toFixed(2)} RON</div>
    </div>
    <div class="card">
      <div class="card-label">Cheltuieli Brute</div>
      <div class="card-value">${summary.expenseGross.toFixed(2)} RON</div>
    </div>
    <div class="card">
      <div class="card-label">Profit Brut Estimat</div>
      <div class="card-value ${profitBrut >= 0 ? "net-positive" : "net-negative"}">${profitBrut.toFixed(2)} RON</div>
    </div>
  </div>

  <h2>Registru TVA</h2>
  <div class="vat-row"><span>TVA Colectat (Venituri)</span><strong>${summary.incomeVat.toFixed(2)} RON</strong></div>
  <div class="vat-row"><span>TVA Deductibil (Cheltuieli)</span><strong>${summary.expenseVat.toFixed(2)} RON</strong></div>
  <div class="vat-row" style="font-weight:bold; font-size:13px;">
    <span>TVA de Plată (Net)</span>
    <strong class="${vatNet >= 0 ? "net-negative" : "net-positive"}">${vatNet.toFixed(2)} RON</strong>
  </div>

  <h2>Export D394 — Tranzacții per Partener (Plătite)</h2>
  <table>
    <thead>
      <tr>
        <th>Partener</th><th>Cod Fiscal</th><th>Tip</th>
        <th style="text-align:right">Nr. Facturi</th>
        <th style="text-align:right">Valoare (RON)</th>
        <th style="text-align:right">TVA (RON)</th>
      </tr>
    </thead>
    <tbody>${rowsHtml || '<tr><td colspan="6" style="text-align:center">Fără date</td></tr>'}</tbody>
  </table>

  <div class="footer">
    Generat de TaxChain · Toate valorile sunt exprimate în RON ·
    Raportul include doar facturi cu statusul "Plătit" ·
    Acest document are caracter informativ și nu înlocuiește declarațiile fiscale oficiale.
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    alert("Permiteți ferestrele pop-up pentru a exporta PDF-ul.");
    URL.revokeObjectURL(url);
    return;
  }
  win.addEventListener("load", () => {
    win.print();
    URL.revokeObjectURL(url);
  });
}

// ── Calcul sumar (doar facturi Plătite) ───────────────────────────────────

function buildSummary(invoices: Invoice[], toRON: (amount: number, currency: string) => number) {
  const result = {
    totalInvoices: invoices.length,
    paidCount: 0,
    incomeCount: 0,
    expenseCount: 0,
    incomeGross: 0,
    expenseGross: 0,
    incomeVat: 0,
    expenseVat: 0,
  };

  invoices
    .filter((inv) => inv.status === "Paid")
    .forEach((invoice) => {
      result.paidCount += 1;
      const total = toRON(parseFloat(invoice.total) || 0, invoice.currency);
      const vat = toRON(parseFloat(invoice.total_vat) || 0, invoice.currency);
      if (invoice.transaction_type === "Expense") {
        result.expenseCount += 1;
        result.expenseGross += total;
        result.expenseVat += vat;
      } else if (invoice.transaction_type === "Income") {
        result.incomeCount += 1;
        result.incomeGross += total;
        result.incomeVat += vat;
      }
    });

  return result;
}

// ── Componentă card sumară ─────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  highlight,
  index = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "positive" | "negative" | "neutral";
  index?: number;
}) {
  const valueColor =
    highlight === "positive"
      ? "var(--green)"
      : highlight === "negative"
        ? "var(--red)"
        : "var(--text)";

  return (
    <div
      className="card p-5 fade-up"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <p
        className="text-xs font-mono uppercase tracking-wider mb-3 truncate"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </p>
      <p
        className="font-display text-xl sm:text-2xl font-bold tracking-tight font-mono number-in truncate"
        style={{ color: valueColor, animationDelay: `${index * 55 + 150}ms` }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1.5 truncate" style={{ color: "var(--text-dim)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Pagina principală ──────────────────────────────────────────────────────

export function ReportsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { activeEntity } = useEntity();

  const [eurRate, setEurRate] = useState(5.0);
  const [usdRate, setUsdRate] = useState(4.6);

  const toRON = useCallback(
    (amount: number, currency: string) => {
      if (currency === "EUR") return amount * eurRate;
      if (currency === "USD") return amount * usdRate;
      return amount;
    },
    [eurRate, usdRate],
  );

  const [activeView, setActiveView] = useState<"summary" | "d300">("summary");
  const [d300Data, setD300Data] = useState<VatSummary | null>(null);
  const [d300Loading, setD300Loading] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  const [periodType, setPeriodType] = useState<PeriodType>("quarter");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  useEffect(() => {
    (async () => {
      try {
        const [invoiceList, partnerList] = await Promise.all([
          invoiceApi.getAll(),
          partnerApi.getAll(),
        ]);
        setInvoices(invoiceList);
        setPartners(partnerList);
      } catch {
        toast("Eroare la încărcarea datelor pentru rapoarte.", "err");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        const [eur, usd] = await Promise.all([
          bnrApi.getRate("EUR"),
          bnrApi.getRate("USD"),
        ]);
        setEurRate(parseFloat(eur.rate));
        setUsdRate(parseFloat(usd.rate));
      } catch {
        // keep fallback rates
      }
    })();
  }, []);

  useEffect(() => {
    if (activeView !== "d300") return;
    const [from, to] = periodToDateRange(periodType, selectedYear, selectedQuarter, selectedMonth);
    setD300Loading(true);
    reportApi
      .getVatSummary(from, to)
      .then(setD300Data)
      .catch(() => toast("Eroare la încărcarea datelor D300.", "err"))
      .finally(() => setD300Loading(false));
  }, [activeView, periodType, selectedYear, selectedQuarter, selectedMonth, toast]);

  const partnerMap = useMemo(
    () => new Map(partners.map((p) => [p.id, p])),
    [partners],
  );

  const filteredInvoices = useMemo(
    () =>
      filterByPeriod(
        invoices,
        periodType,
        selectedYear,
        selectedQuarter,
        selectedMonth,
      ),
    [invoices, periodType, selectedYear, selectedQuarter, selectedMonth],
  );

  const summary = useMemo(
    () => buildSummary(filteredInvoices, toRON),
    [filteredInvoices, toRON],
  );

  const d394Rows = useMemo(
    () => buildD394Rows(filteredInvoices, partnerMap, toRON),
    [filteredInvoices, partnerMap, toRON],
  );

  const taxData = useMemo(() => {
    if (!activeEntity) return null;
    let incomeNetRon = 0;
    let expenseNetRon = 0;
    filteredInvoices
      .filter((inv) => inv.status === "Paid")
      .forEach((inv) => {
        const gross = parseFloat(inv.total) || 0;
        const vat = parseFloat(inv.total_vat) || 0;
        const netRon = toRON(gross - vat, inv.currency);
        if (inv.transaction_type === "Income") incomeNetRon += netRon;
        else if (inv.transaction_type === "Expense") expenseNetRon += netRon;
      });
    if (activeEntity.type === "PF") {
      return { type: "PF" as const, ...computePfaTax(incomeNetRon, expenseNetRon) };
    }
    return { type: "PJ" as const, ...computeSrlTax(incomeNetRon, expenseNetRon, eurRate) };
  }, [filteredInvoices, activeEntity, toRON, eurRate]);

  const periodLabel = getPeriodLabel(
    periodType,
    selectedYear,
    selectedQuarter,
    selectedMonth,
  );

  const vatNet = summary.incomeVat - summary.expenseVat;
  const profitBrut = summary.incomeGross - summary.expenseGross;

  const deadline =
    periodType === "quarter"
      ? getQuarterDeadline(selectedYear, selectedQuarter)
      : periodType === "month"
        ? getMonthDeadline(selectedYear, selectedMonth)
        : null;

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    invoices.forEach((inv) => years.add(new Date(inv.issued_date).getFullYear()));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices, currentYear]);

  const handleExportCsv = () => {
    const csv = buildD394Csv(d394Rows);
    downloadFile(
      csv,
      `d394_${periodLabel.replace(/\s+/g, "_")}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  const handleExportPdf = () => {
    exportToPdf(periodLabel, summary, d394Rows);
  };

  const PERIOD_TABS: { value: PeriodType; label: string }[] = [
    { value: "all", label: "Toate" },
    { value: "year", label: "An" },
    { value: "quarter", label: "Trimestru" },
    { value: "month", label: "Lună" },
  ];

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="fade-up">
          <PageHeader
            title="Rapoarte Fiscale"
            subtitle="Sumar TVA, venituri și cheltuieli conform legislației fiscale române."
            action={
              <div className="flex gap-2 flex-wrap items-center">
                {/* View toggle */}
                <div
                  className="flex gap-1 p-1 rounded-lg"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                >
                  {(["summary", "d300"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setActiveView(v)}
                      className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
                      style={
                        activeView === v
                          ? { background: "var(--blue)", color: "#fff" }
                          : { color: "var(--text-dim)" }
                      }
                    >
                      {v === "summary" ? "Sumar" : "Decont TVA (D300)"}
                    </button>
                  ))}
                </div>
                {activeView === "summary" && (
                  <>
                    <Button variant="secondary" onClick={handleExportCsv} disabled={d394Rows.length === 0}>
                      Export CSV
                    </Button>
                    <Button variant="secondary" onClick={handleExportPdf} disabled={filteredInvoices.length === 0}>
                      Export PDF
                    </Button>
                  </>
                )}
              </div>
            }
          />
        </div>

        {/* ── Filtru perioadă ──────────────────────────────────────────────── */}
        <div
          className="card p-5 mb-8 fade-up"
          style={{ animationDelay: "60ms" }}
        >
          <p
            className="text-xs font-mono uppercase tracking-wider mb-4"
            style={{ color: "var(--text-dim)" }}
          >
            Perioadă de raportare
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Pill tabs */}
            <div
              className="flex gap-1 p-1 rounded-lg"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              {PERIOD_TABS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriodType(value)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
                  style={
                    periodType === value
                      ? {
                          background: "var(--blue)",
                          color: "#fff",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                        }
                      : { color: "var(--text-dim)" }
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* An */}
            {periodType !== "all" && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="input px-3 py-2 rounded-lg text-sm"
                style={{ minWidth: "5rem" }}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}

            {/* Trimestru */}
            {periodType === "quarter" && (
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                className="input px-3 py-2 rounded-lg text-sm"
              >
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>
                    {QUARTER_LABELS[q]}
                  </option>
                ))}
              </select>
            )}

            {/* Lună */}
            {periodType === "month" && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="input px-3 py-2 rounded-lg text-sm"
              >
                {Object.entries(MONTH_LABELS).map(([num, name]) => (
                  <option key={num} value={num}>
                    {name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm ml-1">
              <span style={{ color: "var(--text)" }} className="font-medium">
                {periodLabel}
              </span>
              {deadline && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: "var(--amber)/15",
                    color: "var(--amber)",
                    border: "1px solid var(--amber)/30",
                  }}
                >
                  Termen TVA: {deadline}
                </span>
              )}
            </div>
          </div>
        </div>

        {activeView === "d300" ? (
          <D300View
            data={d300Data}
            loading={d300Loading}
            periodLabel={periodLabel}
          />
        ) : isLoading ? (
          <div
            className="card p-12 text-center"
            style={{ border: "1px solid var(--border)" }}
          >
            <Spinner />
          </div>
        ) : (
          <div className="space-y-8">
            {/* ── Carduri sumar ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
              <SummaryCard
                label="Facturi totale"
                value={String(summary.totalInvoices)}
                sub={`${summary.paidCount} plătite`}
                index={0}
              />
              <SummaryCard
                label="Venituri brute"
                value={formatRON(summary.incomeGross)}
                sub={`${summary.incomeCount} facturi`}
                highlight="positive"
                index={1}
              />
              <SummaryCard
                label="Cheltuieli brute"
                value={formatRON(summary.expenseGross)}
                sub={`${summary.expenseCount} facturi`}
                highlight="negative"
                index={2}
              />
              <SummaryCard
                label="Profit brut est."
                value={formatRON(profitBrut)}
                highlight={profitBrut >= 0 ? "positive" : "negative"}
                index={3}
              />
              <SummaryCard
                label="TVA Colectat"
                value={formatRON(summary.incomeVat)}
                sub="de la venituri"
                index={4}
              />
              <SummaryCard
                label="TVA Deductibil"
                value={formatRON(summary.expenseVat)}
                sub="de la cheltuieli"
                index={5}
              />
            </div>

            {/* ── Venituri vs Cheltuieli ───────────────────────────────────── */}
            <section
              className="space-y-4 fade-up"
              style={{ animationDelay: "180ms" }}
            >
              <h2
                className="text-lg font-semibold font-display"
                style={{ color: "var(--text)" }}
              >
                Venituri vs. Cheltuieli
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5">
                  <p
                    className="text-xs font-mono uppercase tracking-wider mb-4"
                    style={{ color: "var(--green)" }}
                  >
                    Venituri (facturi plătite)
                  </p>
                  <div className="space-y-3 text-sm">
                    <div
                      className="flex justify-between gap-4"
                      style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}
                    >
                      <span style={{ color: "var(--text-dim)" }}>Valoare fără TVA</span>
                      <span className="font-mono" style={{ color: "var(--text)" }}>
                        {formatRON(summary.incomeGross - summary.incomeVat)}
                      </span>
                    </div>
                    <div
                      className="flex justify-between gap-4"
                      style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}
                    >
                      <span style={{ color: "var(--text-dim)" }}>TVA Colectat (21%/9%/5%)</span>
                      <span className="font-mono" style={{ color: "var(--text)" }}>
                        {formatRON(summary.incomeVat)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 font-semibold pt-1">
                      <span style={{ color: "var(--text)" }}>Total cu TVA</span>
                      <span className="font-mono" style={{ color: "var(--green)" }}>
                        {formatRON(summary.incomeGross)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card p-5">
                  <p
                    className="text-xs font-mono uppercase tracking-wider mb-4"
                    style={{ color: "var(--red)" }}
                  >
                    Cheltuieli (facturi plătite)
                  </p>
                  <div className="space-y-3 text-sm">
                    <div
                      className="flex justify-between gap-4"
                      style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}
                    >
                      <span style={{ color: "var(--text-dim)" }}>Valoare fără TVA</span>
                      <span className="font-mono" style={{ color: "var(--text)" }}>
                        {formatRON(summary.expenseGross - summary.expenseVat)}
                      </span>
                    </div>
                    <div
                      className="flex justify-between gap-4"
                      style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}
                    >
                      <span style={{ color: "var(--text-dim)" }}>TVA Deductibil</span>
                      <span className="font-mono" style={{ color: "var(--text)" }}>
                        {formatRON(summary.expenseVat)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 font-semibold pt-1">
                      <span style={{ color: "var(--text)" }}>Total cu TVA</span>
                      <span className="font-mono" style={{ color: "var(--red)" }}>
                        {formatRON(summary.expenseGross)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Registru TVA ─────────────────────────────────────────────── */}
            <section
              className="space-y-4 fade-up"
              style={{ animationDelay: "240ms" }}
            >
              <div>
                <h2
                  className="text-lg font-semibold font-display"
                  style={{ color: "var(--text)" }}
                >
                  Registru TVA
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
                  Poziția TVA pentru perioada selectată. TVA de plată = TVA
                  colectat − TVA deductibil.
                </p>
              </div>

              <div
                className="card overflow-hidden"
                style={{ boxShadow: "var(--shadow-md)" }}
              >
                <div style={{ borderBottom: "1px solid var(--border)" }}>
                  <div
                    className="grid grid-cols-3 px-5 py-3 text-xs font-mono uppercase tracking-wider"
                    style={{ color: "var(--text-dim)" }}
                  >
                    <div>Categorie</div>
                    <div className="text-right">Bază Impozabilă</div>
                    <div className="text-right">TVA</div>
                  </div>
                </div>
                <div style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="grid grid-cols-3 px-5 py-4 text-sm">
                    <div style={{ color: "var(--green)" }}>TVA Colectat (Venituri)</div>
                    <div
                      className="text-right font-mono"
                      style={{ color: "var(--text)" }}
                    >
                      {formatRON(summary.incomeGross - summary.incomeVat)}
                    </div>
                    <div
                      className="text-right font-mono"
                      style={{ color: "var(--green)" }}
                    >
                      {formatRON(summary.incomeVat)}
                    </div>
                  </div>
                </div>
                <div style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="grid grid-cols-3 px-5 py-4 text-sm">
                    <div style={{ color: "var(--red)" }}>TVA Deductibil (Cheltuieli)</div>
                    <div
                      className="text-right font-mono"
                      style={{ color: "var(--text)" }}
                    >
                      {formatRON(summary.expenseGross - summary.expenseVat)}
                    </div>
                    <div
                      className="text-right font-mono"
                      style={{ color: "var(--red)" }}
                    >
                      {formatRON(summary.expenseVat)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 px-5 py-4 text-sm font-bold">
                  <div
                    style={{
                      color: vatNet >= 0 ? "var(--amber)" : "var(--green)",
                    }}
                  >
                    {vatNet >= 0
                      ? "TVA de Plată la ANAF"
                      : "TVA de Recuperat de la ANAF"}
                  </div>
                  <div className="text-right" />
                  <div
                    className="text-right font-mono text-lg"
                    style={{
                      color: vatNet >= 0 ? "var(--amber)" : "var(--green)",
                    }}
                  >
                    {formatRON(Math.abs(vatNet))}
                  </div>
                </div>
              </div>

              {vatNet > 0 && deadline && (
                <div
                  className="rounded-xl px-5 py-4"
                  style={{
                    background: "color-mix(in srgb, var(--amber) 8%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)",
                  }}
                >
                  <p
                    className="text-sm font-semibold mb-1"
                    style={{ color: "var(--amber)" }}
                  >
                    Termen de plată: {deadline}
                  </p>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Conform Codului de Procedură Fiscală, neplata la termen
                    atrage dobânzi de{" "}
                    <strong style={{ color: "var(--text)" }}>0,02%/zi</strong>{" "}
                    și penalități de{" "}
                    <strong style={{ color: "var(--text)" }}>0,01%/zi</strong>{" "}
                    (total{" "}
                    <strong style={{ color: "var(--text)" }}>0,03%/zi</strong>{" "}
                    din suma datorată).
                  </p>
                </div>
              )}
            </section>

            {/* ── Export D394 ───────────────────────────────────────────────── */}
            <section
              className="space-y-4 fade-up"
              style={{ animationDelay: "300ms" }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2
                    className="text-lg font-semibold font-display"
                    style={{ color: "var(--text)" }}
                  >
                    Export D394
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
                    Tranzacții agregate per partener pentru declarația informativă ANAF.
                    Doar facturi plătite.
                  </p>
                </div>
              </div>

              <div
                className="card overflow-hidden"
                style={{ boxShadow: "var(--shadow-md)" }}
              >
                {/* Scrollable wrapper for mobile */}
                <div className="overflow-x-auto">
                  <div style={{ minWidth: "640px" }}>
                    <div
                      className="grid grid-cols-7 gap-0 px-4 py-3 text-xs font-mono uppercase tracking-wider"
                      style={{
                        color: "var(--text-dim)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div className="col-span-2">Partener</div>
                      <div>Cod Fiscal</div>
                      <div>Tip</div>
                      <div className="text-right">Facturi</div>
                      <div className="text-right">Valoare</div>
                      <div className="text-right">TVA</div>
                    </div>
                    {d394Rows.length === 0 ? (
                      <div
                        className="px-4 py-10 text-center text-sm"
                        style={{ color: "var(--text-dim)" }}
                      >
                        Nu există tranzacții plătite pentru perioada selectată.
                      </div>
                    ) : (
                      d394Rows.map((row, i) => (
                        <div
                          key={`${row.partnerId}-${row.transactionType}`}
                          className="grid grid-cols-7 gap-0 px-4 py-3 text-sm transition-colors row-stagger"
                          style={{
                            color: "var(--text)",
                            borderTop: "1px solid var(--border)",
                            animationDelay: `${i * 35}ms`,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "var(--bg-hover)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "")
                          }
                        >
                          <div
                            className="col-span-2 font-medium truncate pr-2"
                            style={{ color: "var(--text)" }}
                          >
                            {row.partnerName}
                          </div>
                          <div
                            className="truncate pr-2"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {row.partnerFiscal}
                          </div>
                          <div>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={
                                row.transactionType === "Income"
                                  ? {
                                      background:
                                        "color-mix(in srgb, var(--green) 15%, transparent)",
                                      color: "var(--green)",
                                    }
                                  : row.transactionType === "Expense"
                                    ? {
                                        background:
                                          "color-mix(in srgb, var(--red) 15%, transparent)",
                                        color: "var(--red)",
                                      }
                                    : {
                                        background:
                                          "color-mix(in srgb, var(--text-dim) 15%, transparent)",
                                        color: "var(--text-dim)",
                                      }
                              }
                            >
                              {TRANSACTION_TYPE_LABELS[row.transactionType] ??
                                row.transactionType}
                            </span>
                          </div>
                          <div className="text-right">{row.invoiceCount}</div>
                          <div
                            className="text-right font-mono"
                            style={{ color: "var(--text)" }}
                          >
                            {formatRON(row.total)}
                          </div>
                          <div
                            className="text-right font-mono"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {formatRON(row.vat)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Estimare fiscală ─────────────────────────────────────────── */}
            {taxData && (
              <section
                className="space-y-4 fade-up"
                style={{ animationDelay: "360ms" }}
              >
                <div>
                  <h2
                    className="text-lg font-semibold font-display"
                    style={{ color: "var(--text)" }}
                  >
                    Estimare Fiscală —{" "}
                    {activeEntity?.type === "PF" ? "PFA / Persoană Fizică" : "SRL / Micro-Întreprindere"}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
                    Calcul orientativ conform legislației fiscale 2025. Valorile în valute străine sunt convertite la cursul BNR curent
                    (EUR: {eurRate.toFixed(4)} RON, USD: {usdRate.toFixed(4)} RON).
                    Nu înlocuiește consultanța fiscală.
                  </p>
                </div>

                {taxData.type === "PF" ? (
                  <div className="card overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
                    <TaxRow label="Venit net estimat (RON)" value={formatRON(taxData.netIncome)} color="var(--green)" bold />
                    <TaxRow label={`CAS — 25% (plafon ${formatRON(CAS_BASE_MAX)}/an)`} value={`− ${formatRON(taxData.cas)}`} color="var(--red)" />
                    <TaxRow label={`CASS — 10% (plafon ${formatRON(CASS_BASE_MAX)}/an)`} value={`− ${formatRON(taxData.cass)}`} color="var(--red)" />
                    <TaxRow label="Impozit venit — 10%" value={`− ${formatRON(taxData.impozitVenit)}`} color="var(--amber)" />
                    <TaxRow label="Total obligații fiscale estimate" value={formatRON(taxData.totalObligatii)} color="var(--amber)" bold separator />
                    <TaxRow label="Venit net după taxe estimate" value={formatRON(taxData.netDupaTaxe)} color="var(--green)" bold />
                  </div>
                ) : (
                  <div className="card overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
                    <div
                      className="px-5 py-3 text-xs font-mono"
                      style={{
                        background: taxData.isMicro
                          ? "color-mix(in srgb, var(--blue) 8%, transparent)"
                          : "color-mix(in srgb, var(--amber) 8%, transparent)",
                        borderBottom: "1px solid var(--border)",
                        color: taxData.isMicro ? "var(--blue)" : "var(--amber)",
                      }}
                    >
                      {taxData.isMicro
                        ? `Regim micro-întreprindere (venituri ≤ ${MICRO_THRESHOLD_EUR.toLocaleString("ro-RO")} EUR) — impozit ${(taxData.taxRate * 100).toFixed(0)}% pe cifra de afaceri`
                        : `Regim profit (venituri > ${MICRO_THRESHOLD_EUR.toLocaleString("ro-RO")} EUR) — impozit 16% pe profit`}
                    </div>
                    <TaxRow label="Cifră de afaceri (venituri fără TVA, RON)" value={formatRON(taxData.revenue)} color="var(--green)" bold />
                    <TaxRow label="Cheltuieli deductibile (RON)" value={`− ${formatRON(taxData.expenses)}`} color="var(--red)" />
                    <TaxRow label="Profit brut estimat (RON)" value={formatRON(taxData.profit)} color={taxData.profit >= 0 ? "var(--text)" : "var(--red)"} bold />
                    <TaxRow
                      label={taxData.isMicro ? `Impozit micro — ${(taxData.taxRate * 100).toFixed(0)}% din CA` : "Impozit profit — 16%"}
                      value={`− ${formatRON(taxData.tax)}`}
                      color="var(--amber)"
                      separator
                    />
                    <TaxRow label="Profit net după impozit" value={formatRON(taxData.netDupaTaxe)} color={taxData.netDupaTaxe >= 0 ? "var(--green)" : "var(--red)"} bold />
                    <TaxRow
                      label="Reținere dividende — 8% (dacă se distribuie)"
                      value={`− ${formatRON(taxData.dividendWithholding)}`}
                      color="var(--text-dim)"
                    />
                    <TaxRow
                      label="Dividend net estimat (după 8%)"
                      value={formatRON(Math.max(0, taxData.netDupaTaxe) * 0.92)}
                      color="var(--green)"
                      bold
                    />
                  </div>
                )}

                <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                  * Calculul PFA presupune regimul real de impozitare. Calculul SRL presupune
                  regimul micro cu cel puțin un angajat (3%). Consultați un contabil autorizat
                  pentru declarații oficiale.
                </p>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ── D300 declaration view ────────────────────────────────────────────────────

const VAT_RATE_LABELS: Record<string, string> = {
  Standard: "21%",
  Reduced9: "9%",
  Reduced5: "5%",
  Exempt: "0% (scutit)",
};

function D300Row({
  rd,
  label,
  base,
  vat,
  highlight,
}: {
  rd: string;
  label: string;
  base?: string | number;
  vat?: string | number;
  highlight?: boolean;
}) {
  const fmt = (v?: string | number) => {
    if (v === undefined || v === null) return "—";
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (Number.isNaN(n)) return "—";
    return new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  return (
    <div
      className={`grid grid-cols-12 gap-2 px-5 py-3 text-sm ${highlight ? "font-semibold" : ""}`}
      style={{
        borderTop: highlight ? "2px solid var(--border)" : "1px solid var(--border)",
        background: highlight ? "color-mix(in srgb, var(--blue) 4%, transparent)" : undefined,
      }}
    >
      <div className="col-span-1 font-mono text-xs" style={{ color: "var(--text-dim)" }}>{rd}</div>
      <div className="col-span-7" style={{ color: highlight ? "var(--text)" : "var(--text-dim)" }}>{label}</div>
      <div className="col-span-2 text-right font-mono" style={{ color: "var(--text)" }}>{fmt(base)}</div>
      <div className="col-span-2 text-right font-mono" style={{ color: "var(--blue)" }}>{fmt(vat)}</div>
    </div>
  );
}

function D300View({ data, loading, periodLabel }: { data: VatSummary | null; loading: boolean; periodLabel: string }) {
  if (loading) {
    return (
      <div className="card p-12 text-center">
        <Spinner />
      </div>
    );
  }

  const getLine = (tip: string, cota: string) =>
    data?.lines.find((l) => l.tip_tranzactie === tip && l.cota_tva === cota);

  const incomeStandard = getLine("Venit", "Standard");
  const income9 = getLine("Venit", "Reduced9");
  const income5 = getLine("Venit", "Reduced5");
  const expenseStandard = getLine("Cheltuiala", "Standard");
  const expense9 = getLine("Cheltuiala", "Reduced9");
  const expense5 = getLine("Cheltuiala", "Reduced5");

  const netVat = data ? parseFloat(data.net_vat) : 0;
  const isPayable = netVat > 0;

  const exportD300Pdf = () => {
    if (!data) return;
    const html = `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<title>Decont TVA (D300) — ${periodLabel}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
  h1 { font-size: 16px; } h2 { font-size: 13px; margin-top: 16px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .row { display: grid; grid-template-columns: 40px 1fr 120px 120px; gap: 8px; padding: 4px 8px; border-bottom: 1px solid #eee; }
  .header { font-weight: bold; background: #f0f0f0; }
  .bold { font-weight: bold; background: #f5f5ff; }
  .right { text-align: right; }
  .footer { margin-top: 20px; font-size: 9px; color: #999; }
</style>
</head>
<body>
<h1>Decont de TVA — Formularul 300</h1>
<p style="color:#555;font-size:10px">Perioadă: ${periodLabel} · Generat: ${new Date().toLocaleDateString("ro-RO")} · Caracter informativ</p>
<h2>Secțiunea I — Operațiuni taxabile (Venituri)</h2>
<div class="row header"><span>Rd.</span><span>Denumire</span><span class="right">Bază impozabilă (RON)</span><span class="right">TVA (RON)</span></div>
<div class="row"><span>01</span><span>Livrări/prestări taxabile 21%</span><span class="right">${parseFloat(incomeStandard?.base || "0").toFixed(2)}</span><span class="right">${parseFloat(incomeStandard?.vat || "0").toFixed(2)}</span></div>
<div class="row"><span>02</span><span>Livrări/prestări taxabile 9%</span><span class="right">${parseFloat(income9?.base || "0").toFixed(2)}</span><span class="right">${parseFloat(income9?.vat || "0").toFixed(2)}</span></div>
<div class="row"><span>03</span><span>Livrări/prestări taxabile 5%</span><span class="right">${parseFloat(income5?.base || "0").toFixed(2)}</span><span class="right">${parseFloat(income5?.vat || "0").toFixed(2)}</span></div>
<div class="row bold"><span>15</span><span>Total TVA colectat</span><span class="right">${parseFloat(data.income_base_total).toFixed(2)}</span><span class="right">${parseFloat(data.income_vat_total).toFixed(2)}</span></div>
<h2>Secțiunea II — Cumpărări cu drept de deducere (Cheltuieli)</h2>
<div class="row header"><span>Rd.</span><span>Denumire</span><span class="right">Bază impozabilă (RON)</span><span class="right">TVA (RON)</span></div>
<div class="row"><span>20</span><span>Cumpărări taxabile 21%</span><span class="right">${parseFloat(expenseStandard?.base || "0").toFixed(2)}</span><span class="right">${parseFloat(expenseStandard?.vat || "0").toFixed(2)}</span></div>
<div class="row"><span>22</span><span>Cumpărări taxabile 9%</span><span class="right">${parseFloat(expense9?.base || "0").toFixed(2)}</span><span class="right">${parseFloat(expense9?.vat || "0").toFixed(2)}</span></div>
<div class="row"><span>24</span><span>Cumpărări taxabile 5%</span><span class="right">${parseFloat(expense5?.base || "0").toFixed(2)}</span><span class="right">${parseFloat(expense5?.vat || "0").toFixed(2)}</span></div>
<div class="row bold"><span>30</span><span>Total TVA deductibil</span><span class="right">${parseFloat(data.expense_base_total).toFixed(2)}</span><span class="right">${parseFloat(data.expense_vat_total).toFixed(2)}</span></div>
<h2>Secțiunea III — TVA de plată / de recuperat</h2>
<div class="row bold"><span>33</span><span>${netVat >= 0 ? "TVA de plată la buget" : "TVA de recuperat"}</span><span></span><span class="right">${Math.abs(netVat).toFixed(2)}</span></div>
<div class="footer">Generat de TaxChain · Document informativ — nu înlocuiește declarația oficială depusă la ANAF.</div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) win.addEventListener("load", () => { win.print(); URL.revokeObjectURL(url); });
  };

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold font-display" style={{ color: "var(--text)" }}>
            Decont de TVA — Formularul 300
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
            {periodLabel} · Pre-completat din facturile plătite ale entității active.
            Document informativ — verificați și depuneți la ANAF.
          </p>
        </div>
        <button
          type="button"
          onClick={exportD300Pdf}
          disabled={!data}
          className="btn-secondary text-sm"
        >
          Export PDF / Tipărire
        </button>
      </div>

      {!data ? (
        <div className="card p-10 text-center">
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Selectați o perioadă în filtrul de mai sus și datele se vor încărca automat.
          </p>
        </div>
      ) : (
        <>
          {/* Section I — TVA colectat */}
          <div className="card overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
            <div className="px-5 py-3" style={{ background: "color-mix(in srgb, var(--green) 8%, transparent)", borderBottom: "1px solid var(--border)" }}>
              <p className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: "var(--green)" }}>
                Secțiunea I — Operațiuni taxabile (Venituri / TVA Colectat)
              </p>
            </div>
            <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-mono uppercase tracking-wider" style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>
              <div className="col-span-1">Rd.</div>
              <div className="col-span-7">Denumire</div>
              <div className="col-span-2 text-right">Bază (RON)</div>
              <div className="col-span-2 text-right">TVA (RON)</div>
            </div>
            <D300Row rd="01" label={`Livrări/prestări de servicii — ${VAT_RATE_LABELS.Standard}`} base={incomeStandard?.base} vat={incomeStandard?.vat} />
            <D300Row rd="02" label={`Livrări/prestări de servicii — ${VAT_RATE_LABELS.Reduced9}`} base={income9?.base} vat={income9?.vat} />
            <D300Row rd="03" label={`Livrări/prestări de servicii — ${VAT_RATE_LABELS.Reduced5}`} base={income5?.base} vat={income5?.vat} />
            <D300Row rd="15" label="Total TVA colectat (rd. 01 + 02 + 03)" base={data.income_base_total} vat={data.income_vat_total} highlight />
          </div>

          {/* Section II — TVA deductibil */}
          <div className="card overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
            <div className="px-5 py-3" style={{ background: "color-mix(in srgb, var(--red) 8%, transparent)", borderBottom: "1px solid var(--border)" }}>
              <p className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: "var(--red)" }}>
                Secțiunea II — Cumpărări cu drept de deducere (Cheltuieli / TVA Deductibil)
              </p>
            </div>
            <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-mono uppercase tracking-wider" style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>
              <div className="col-span-1">Rd.</div>
              <div className="col-span-7">Denumire</div>
              <div className="col-span-2 text-right">Bază (RON)</div>
              <div className="col-span-2 text-right">TVA (RON)</div>
            </div>
            <D300Row rd="20" label={`Cumpărări taxabile — ${VAT_RATE_LABELS.Standard}`} base={expenseStandard?.base} vat={expenseStandard?.vat} />
            <D300Row rd="22" label={`Cumpărări taxabile — ${VAT_RATE_LABELS.Reduced9}`} base={expense9?.base} vat={expense9?.vat} />
            <D300Row rd="24" label={`Cumpărări taxabile — ${VAT_RATE_LABELS.Reduced5}`} base={expense5?.base} vat={expense5?.vat} />
            <D300Row rd="30" label="Total TVA deductibil (rd. 20 + 22 + 24)" base={data.expense_base_total} vat={data.expense_vat_total} highlight />
          </div>

          {/* Section III — Net */}
          <div className="card overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
            <div className="px-5 py-3" style={{ background: "color-mix(in srgb, var(--amber) 8%, transparent)", borderBottom: "1px solid var(--border)" }}>
              <p className="text-xs font-mono uppercase tracking-wider font-semibold" style={{ color: "var(--amber)" }}>
                Secțiunea III — Poziția TVA
              </p>
            </div>
            <D300Row
              rd="33"
              label={isPayable ? "TVA de plată la buget (rd. 15 − rd. 30)" : "TVA de recuperat de la buget (rd. 30 − rd. 15)"}
              vat={Math.abs(netVat).toFixed(2)}
              highlight
            />
          </div>

          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            * Formularul D300 se depune la ANAF până pe data de 25 a lunii următoare perioadei fiscale.
            Valorile de mai sus sunt calculate exclusiv pe baza facturilor cu statusul "Plătit" înregistrate în TaxChain.
            Acest document are caracter informativ și nu constituie o declarație fiscală oficială.
          </p>
        </>
      )}
    </div>
  );
}

// ── Tax row helper ──────────────────────────────────────────────────────────

function TaxRow({
  label,
  value,
  color,
  bold,
  separator,
}: {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
  separator?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-5 py-3 text-sm ${bold ? "font-semibold" : ""}`}
      style={{
        borderTop: separator ? `2px solid var(--border)` : "1px solid var(--border)",
        color: "var(--text)",
      }}
    >
      <span style={{ color: bold ? "var(--text)" : "var(--text-dim)" }}>{label}</span>
      <span className="font-mono shrink-0" style={{ color }}>{value}</span>
    </div>
  );
}
