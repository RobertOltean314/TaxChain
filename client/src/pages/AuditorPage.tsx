import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/ui/AppLayout";
import { proofApi } from "../api/proof.api";
import { useToast } from "../components/ui/Toast";
import { PageHeader, Button, Spinner } from "../components/ui/ui";
import type { FiscalProof } from "../types";

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

function buildCsv(proofs: FiscalProof[]): string {
  const headers = [
    "Entitate", "Cod Fiscal", "Tip", "Perioadă De", "Perioadă La",
    "TVA Colectat", "TVA Deductibil", "TVA Net",
    "CAS", "CASS", "Impozit Venit", "Impozit Profit", "Total Obligații",
    "Tip Dovadă", "Bloc", "TX Hash", "Ancorat La",
  ];
  const rows = proofs.map((p) => [
    p.entity_name, p.entity_fiscal_code, p.entity_type,
    p.period_from, p.period_to,
    p.vat_colectat, p.vat_deductibil, p.vat_net,
    p.cas, p.cass, p.impozit_venit, p.impozit_profit, p.total_obligatii,
    "ZK Groth16",
    p.block_number, p.tx_hash,
    new Date(p.anchored_at).toISOString(),
  ]);
  return [headers, ...rows].map((r) => r.join(";")).join("\n");
}

function StatusBadge({ proof: _proof }: { proof: FiscalProof }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)" }}
    >
      Conform
    </span>
  );
}

export default function AuditorPage() {
  const { toast } = useToast();

  const [proofs, setProofs] = useState<FiscalProof[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, boolean>>({});

  // Client-side instant search
  const [search, setSearch] = useState("");

  // Backend filters
  const [fiscalCode, setFiscalCode] = useState("");
  const [entityType, setEntityType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchProofs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await proofApi.listAll({
        fiscal_code: fiscalCode || undefined,
        entity_type: entityType || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setProofs(data);
    } catch {
      toast("Eroare la încărcarea dovezilor.", "err");
    } finally {
      setLoading(false);
    }
  }, [fiscalCode, entityType, fromDate, toDate, toast]);

  useEffect(() => { fetchProofs(); }, [fetchProofs]);

  const handleVerify = async (proofId: string) => {
    setVerifyingId(proofId);
    try {
      const result = await proofApi.verify(proofId);
      setVerifyResults((prev) => ({ ...prev, [proofId]: result.valid }));
      toast(result.valid ? "Dovadă ZK validă." : "Dovadă ZK invalidă!", result.valid ? undefined : "err");
    } catch {
      toast("Eroare la verificarea ZK.", "err");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleExportCsv = () => {
    const csv = buildCsv(proofs);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "raport_conformitate_fiscala.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const q = search.trim().toLowerCase();
  const visibleProofs = q
    ? proofs.filter(
        (p) =>
          p.entity_name?.toLowerCase().includes(q) ||
          p.entity_fiscal_code?.toLowerCase().includes(q) ||
          p.period_from?.includes(q) ||
          p.period_to?.includes(q),
      )
    : proofs;

  const compliantCount = proofs.length;

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="fade-up">
          <PageHeader
            title="Panou Auditor ANAF"
            subtitle="Vizualizare sistem-wide a dovezilor de conformitate fiscală. Verificare criptografică ZK disponibilă."
            action={
              <Button variant="secondary" onClick={handleExportCsv} disabled={proofs.length === 0}>
                Export CSV
              </Button>
            }
          />
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 fade-up" style={{ animationDelay: "60ms" }}>
          {[
            { label: "Total dovezi", value: proofs.length, color: "var(--text)" },
            { label: "Entități conforme", value: compliantCount, color: "var(--green)" },
            { label: "Dovezi ZK Groth16", value: proofs.length, color: "#6F00FF" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4">
              <p className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: "var(--text-dim)" }}>
                {label}
              </p>
              <p className="text-2xl font-bold font-display" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Filters ────────────────────────────────────────────────────────── */}
        <div className="card p-5 mb-6 fade-up" style={{ animationDelay: "120ms" }}>
          <p className="text-xs font-mono uppercase tracking-wider mb-4" style={{ color: "var(--text-dim)" }}>
            Filtre
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-dim)" }}>Cod fiscal</label>
              <input
                className="input w-full px-3 py-2 rounded-lg text-sm"
                placeholder="ex. RO12345678"
                value={fiscalCode}
                onChange={(e) => setFiscalCode(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-dim)" }}>Tip entitate</label>
              <select
                className="input w-full px-3 py-2 rounded-lg text-sm"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
              >
                <option value="">Toate</option>
                <option value="PF">Persoană Fizică (PF)</option>
                <option value="PJ">Persoană Juridică (PJ)</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-dim)" }}>Perioadă de la</label>
              <input
                type="date"
                className="input w-full px-3 py-2 rounded-lg text-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-dim)" }}>Perioadă până la</label>
              <input
                type="date"
                className="input w-full px-3 py-2 rounded-lg text-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Search ─────────────────────────────────────────────────────────── */}
        <div className="mb-4 fade-up" style={{ animationDelay: "150ms" }}>
          <input
            className="input w-full px-4 py-2.5 rounded-xl text-sm"
            placeholder="Caută după entitate, cod fiscal sau perioadă…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ── Proof table ─────────────────────────────────────────────────────── */}
        <div className="card overflow-hidden fade-up" style={{ animationDelay: "180ms" }}>
          {loading ? (
            <div className="p-12 text-center"><Spinner /></div>
          ) : visibleProofs.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: "var(--text-dim)" }}>
              Nicio dovadă găsită cu filtrele selectate.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: "900px" }}>
                <thead>
                  <tr
                    className="text-xs font-mono uppercase tracking-wider"
                    style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}
                  >
                    <th className="px-4 py-3 text-left">Entitate</th>
                    <th className="px-4 py-3 text-left">Perioadă</th>
                    <th className="px-4 py-3 text-right">TVA Net</th>
                    <th className="px-4 py-3 text-right">Total Obligații</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Tip</th>
                    <th className="px-4 py-3 text-center">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProofs.map((p, i) => {
                    const vr = verifyResults[p.id];
                    return (
                      <tr
                        key={p.id}
                        className="transition-colors"
                        style={{
                          borderBottom: "1px solid var(--border)",
                          animationDelay: `${i * 20}ms`,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                      >
                        {/* Entity */}
                        <td className="px-4 py-3">
                          <p className="font-medium truncate max-w-[180px]" style={{ color: "var(--text)" }}>
                            {p.entity_name || "—"}
                          </p>
                          <p className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>
                            {p.entity_fiscal_code} · {p.entity_type}
                          </p>
                        </td>

                        {/* Period */}
                        <td className="px-4 py-3" style={{ color: "var(--text-dim)" }}>
                          <span className="text-xs font-mono">
                            {p.period_from}<br />{p.period_to}
                          </span>
                        </td>

                        {/* TVA net */}
                        <td className="px-4 py-3 text-right font-mono" style={{ color: parseFloat(p.vat_net) >= 0 ? "var(--amber)" : "var(--green)" }}>
                          {formatRON(p.vat_net)}
                        </td>

                        {/* Total obligations */}
                        <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: "var(--amber)" }}>
                          {formatRON(p.total_obligatii)}
                        </td>

                        {/* Compliance status */}
                        <td className="px-4 py-3 text-center">
                          <StatusBadge proof={p} />
                        </td>

                        {/* Proof type */}
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: "rgba(111,0,255,0.12)", color: "#6F00FF" }}>
                            ZK Groth16
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <a
                              href={`https://sepolia.etherscan.io/tx/${p.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-2 py-1 rounded-lg"
                              style={{ background: "color-mix(in srgb, var(--blue) 10%, transparent)", color: "var(--blue)" }}
                            >
                              Chain ↗
                            </a>

                            {p.entity_fiscal_code && (
                              <Link
                                to={`/profil/${p.entity_fiscal_code}`}
                                className="text-xs px-2 py-1 rounded-lg"
                                style={{ background: "color-mix(in srgb, var(--green) 10%, transparent)", color: "var(--green)" }}
                              >
                                Profil
                              </Link>
                            )}

                            {vr !== undefined ? (
                              <span
                                className="text-xs px-2 py-1 rounded-lg font-semibold"
                                style={vr
                                  ? { background: "color-mix(in srgb, var(--green) 10%, transparent)", color: "var(--green)" }
                                  : { background: "color-mix(in srgb, var(--red) 10%, transparent)", color: "var(--red)" }
                                }
                              >
                                {vr ? "✓ Valid" : "✗ Invalid"}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleVerify(p.id)}
                                disabled={verifyingId === p.id}
                                className="text-xs px-2 py-1 rounded-lg font-medium"
                                style={{ background: "rgba(111,0,255,0.10)", color: "#6F00FF" }}
                              >
                                {verifyingId === p.id ? "..." : "Verifică ZK"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs mt-4 text-center" style={{ color: "var(--text-dim)" }}>
          {visibleProofs.length === proofs.length
            ? `${proofs.length} dovezi afișate`
            : `${visibleProofs.length} din ${proofs.length} dovezi`}
          {" · "}Datele sunt preluate în timp real din sistem
        </p>
      </div>
    </AppLayout>
  );
}
