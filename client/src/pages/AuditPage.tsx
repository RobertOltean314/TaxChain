import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/ui/AppLayout";
import { auditApi } from "../api/audit.api";
import { useToast } from "../components/ui/Toast";
import { PageHeader, Button, Spinner } from "../components/ui/ui";
import type { AuditLogEntry } from "../types";

// ── Action color coding ───────────────────────────────────────────────────────

const ACTION_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  "invoice.created":       { label: "Factură Creată",         color: "var(--green)",  bg: "color-mix(in srgb, var(--green) 12%, transparent)" },
  "invoice.status_changed":{ label: "Status Schimbat",        color: "var(--blue)",   bg: "color-mix(in srgb, var(--blue) 12%, transparent)" },
  "invoice.deleted":       { label: "Factură Ștearsă",        color: "var(--red)",    bg: "color-mix(in srgb, var(--red) 12%, transparent)" },
  "proof.generated":       { label: "Dovadă Generată",        color: "var(--violet)", bg: "color-mix(in srgb, var(--violet) 12%, transparent)" },
};

function actionStyle(action: string) {
  return (
    ACTION_STYLES[action] ?? {
      label: action,
      color: "var(--text-dim)",
      bg: "color-mix(in srgb, var(--text-dim) 10%, transparent)",
    }
  );
}

function ActionBadge({ action }: { action: string }) {
  const s = actionStyle(action);
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function PayloadDetail({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {entries.map(([k, v]) => (
        <span
          key={k}
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: "var(--bg-hover)", color: "var(--text-dim)" }}
        >
          {k}: <span style={{ color: "var(--text)" }}>{String(v)}</span>
        </span>
      ))}
    </div>
  );
}

const ACTION_FILTER_OPTIONS = [
  { value: "", label: "Toate acțiunile" },
  { value: "invoice.", label: "Facturi" },
  { value: "invoice.created", label: "Facturi create" },
  { value: "invoice.status_changed", label: "Status schimbat" },
  { value: "invoice.deleted", label: "Facturi șterse" },
  { value: "proof.", label: "Dovezi fiscale" },
];

const PAGE_SIZE = 50;

export default function AuditPage() {
  const { toast } = useToast();

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");

  const fetchLog = useCallback(async (off = 0, append = false) => {
    setLoading(true);
    try {
      const data = await auditApi.getLog({
        tip: actionFilter || undefined,
        entity_type: entityTypeFilter || undefined,
        limit: PAGE_SIZE,
        offset: off,
      });
      if (append) {
        setEntries((prev) => [...prev, ...data]);
      } else {
        setEntries(data);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      toast("Eroare la încărcarea jurnalului de audit.", "err");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityTypeFilter, toast]);

  useEffect(() => {
    setOffset(0);
    fetchLog(0, false);
  }, [fetchLog]);

  const handleLoadMore = () => {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    fetchLog(next, true);
  };

  const handleExport = () => {
    const headers = ["Timestamp", "Acțiune", "Actor", "Tip Entitate", "Tip Resursă", "ID Resursă", "Detalii"];
    const rows = entries.map((e) => [
      formatTs(e.created_at),
      e.action,
      e.actor_name ?? e.actor_user_id,
      e.entity_type ?? "",
      e.resource_type,
      e.resource_id ?? "",
      JSON.stringify(e.payload),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="fade-up">
          <PageHeader
            title="Jurnal de Audit"
            subtitle="Istoricul complet al acțiunilor asupra facturilor și dovezilor fiscale."
            action={
              <Button variant="secondary" onClick={handleExport} disabled={entries.length === 0}>
                Export CSV
              </Button>
            }
          />
        </div>

        {/* ── Summary cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 fade-up" style={{ animationDelay: "60ms" }}>
          {(
            [
              ["Facturi create",  "invoice.created",        "var(--green)"],
              ["Status schimbat", "invoice.status_changed", "var(--blue)"],
              ["Facturi șterse",  "invoice.deleted",        "var(--red)"],
              ["Dovezi generate", "proof.generated",        "var(--violet)"],
            ] as const
          ).map(([label, key, color]) => (
            <div key={key} className="card p-4 min-w-0 overflow-hidden">
              <p className="text-[10px] font-mono uppercase tracking-wider mb-1 truncate" style={{ color: "var(--text-dim)" }}>
                {label}
              </p>
              <p className="text-xl font-bold font-display" style={{ color }}>
                {entries.filter((e) => e.action === key).length}
              </p>
            </div>
          ))}
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="card p-4 mb-6 fade-up" style={{ animationDelay: "120ms" }}>
          <p className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: "var(--text-dim)" }}>Filtre</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-dim)" }}>Acțiune</label>
              <select
                className="input w-full px-3 py-2 rounded-lg text-sm"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                {ACTION_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-dim)" }}>Tip entitate</label>
              <select
                className="input w-full px-3 py-2 rounded-lg text-sm"
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
              >
                <option value="">Toate</option>
                <option value="PF">Persoană Fizică (PF)</option>
                <option value="PJ">Persoană Juridică (PJ)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Log table ────────────────────────────────────────────────────── */}
        <div className="card overflow-hidden fade-up" style={{ animationDelay: "180ms" }}>
          {loading && entries.length === 0 ? (
            <div className="p-12 text-center"><Spinner /></div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: "var(--text-dim)" }}>
              Niciun eveniment găsit.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: "700px" }}>
                <thead>
                  <tr
                    className="text-xs font-mono uppercase tracking-wider"
                    style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}
                  >
                    <th className="px-4 py-3 text-left">Timestamp</th>
                    <th className="px-4 py-3 text-left">Acțiune</th>
                    <th className="px-4 py-3 text-left">Actor</th>
                    <th className="px-4 py-3 text-left">Resursă</th>
                    <th className="px-4 py-3 text-left">Detalii</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr
                      key={e.id}
                      className="transition-colors"
                      style={{
                        borderBottom: "1px solid var(--border)",
                        animationDelay: `${i * 15}ms`,
                      }}
                      onMouseEnter={(el) => (el.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={(el) => (el.currentTarget.style.background = "")}
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs" style={{ color: "var(--text-dim)" }}>
                        {formatTs(e.created_at)}
                      </td>

                      {/* Action badge */}
                      <td className="px-4 py-3">
                        <ActionBadge action={e.action} />
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
                          {e.actor_name ?? "—"}
                        </span>
                        {e.entity_type && (
                          <span
                            className="block text-[10px] font-mono"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {e.entity_type}
                          </span>
                        )}
                      </td>

                      {/* Resource */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>
                          {e.resource_type}
                        </span>
                        {e.resource_id && e.resource_type === "invoice" && (
                          <Link
                            to={`/invoices/${e.resource_id}`}
                            className="block text-[10px] truncate max-w-[120px]"
                            style={{ color: "var(--blue)" }}
                          >
                            {e.resource_id.slice(0, 8)}…
                          </Link>
                        )}
                        {e.resource_id && e.resource_type !== "invoice" && (
                          <span className="block text-[10px] font-mono truncate max-w-[120px]" style={{ color: "var(--text-dim)" }}>
                            {e.resource_id.slice(0, 8)}…
                          </span>
                        )}
                      </td>

                      {/* Payload details */}
                      <td className="px-4 py-3">
                        <PayloadDetail payload={e.payload} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load more */}
          {hasMore && !loading && entries.length > 0 && (
            <div className="p-4 text-center border-t" style={{ borderColor: "var(--border)" }}>
              <Button variant="secondary" onClick={handleLoadMore}>
                Încarcă mai multe
              </Button>
            </div>
          )}

          {loading && entries.length > 0 && (
            <div className="p-4 text-center">
              <Spinner />
            </div>
          )}
        </div>

        <p className="text-xs mt-4 text-center" style={{ color: "var(--text-dim)" }}>
          {entries.length} evenimente afișate
        </p>
      </div>
    </AppLayout>
  );
}
