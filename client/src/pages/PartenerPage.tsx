import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { partenerGetAll, partenerDelete } from "../api/partener.api";
import { Confirm } from "../components/ui/Confirm";
import { useToast } from "../components/ui/Toast";
import { Spinner, Empty, PageHeader, BtnPrimary, THead, TRow, TD, Dash, Badge } from "../components/ui/ui";
import type { Partner } from "../types";
import { PARTNER_TIP_LABELS, PARTNER_ENTITY_LABELS } from "../types";

export default function PartenerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Partner[]>([]);
  const [filtered, setFiltered] = useState<Partner[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [del, setDel] = useState<Partner | null>(null);
  const [deleting, setDeleting] = useState(false);
  const canWrite = user?.role === "Admin" || user?.role === "Taxpayer";

  useEffect(() => {
    partenerGetAll()
      .then((d) => { setRows(d); setFiltered(d); })
      .catch(() => toast("Eroare la încărcare.", "err"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const s = q.toLowerCase();
    setFiltered(rows.filter((r) =>
      r.denumire.toLowerCase().includes(s) ||
      (r.cod_fiscal ?? "").toLowerCase().includes(s) ||
      (r.email ?? "").toLowerCase().includes(s) ||
      (r.oras ?? "").toLowerCase().includes(s),
    ));
  }, [q, rows]);

  const doDelete = async () => {
    if (!del) return;
    setDeleting(true);
    try {
      await partenerDelete(del.id);
      toast("Partener șters.", "ok");
      setRows((p) => p.filter((r) => r.id !== del.id));
    } catch { toast("Eroare la ștergere.", "err"); }
    finally { setDeleting(false); setDel(null); }
  };

  return (
    <div className="p-8 fade-up">
      <PageHeader
        title="Parteneri"
        sub={`${filtered.length} înregistrări`}
        action={canWrite ? (
          <BtnPrimary onClick={() => navigate("/parteneri/nou")}>+ Partener nou</BtnPrimary>
        ) : undefined}
      />

      <input
        value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Caută după denumire, CIF, email, oraș…"
        className="mb-5 w-72 rounded-lg px-3 py-2 text-sm font-mono border outline-none transition-colors"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text)" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--amber)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty msg={q ? "Niciun rezultat." : "Niciun partener înregistrat."} />
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <table className="min-w-full" style={{ background: "var(--bg-card)" }}>
            <THead cols={["Denumire", "CIF", "Tip", "Entitate", "Oraș", "Email", ...(canWrite ? ["Acțiuni"] : [])]} />
            <tbody>
              {filtered.map((r) => (
                <TRow key={r.id} onClick={() => navigate(`/parteneri/${r.id}`)}>
                  <TD><span className="font-medium">{r.denumire}</span></TD>
                  <TD mono>{r.cod_fiscal ?? <Dash />}</TD>
                  <TD><Badge value={r.tip} variant="partner" /></TD>
                  <TD>
                    <span className="text-xs font-mono" style={{ color: "var(--text-sub)" }}>
                      {PARTNER_ENTITY_LABELS[r.tip_entitate]}
                    </span>
                  </TD>
                  <TD>{r.oras ?? <Dash />}</TD>
                  <TD>{r.email ?? <Dash />}</TD>
                  {canWrite && (
                    <TD>
                      <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => navigate(`/parteneri/${r.id}`)}
                          className="text-xs font-mono" style={{ color: "var(--amber)" }}>editează</button>
                        <button onClick={() => setDel(r)}
                          className="text-xs font-mono" style={{ color: "var(--red)" }}>șterge</button>
                      </div>
                    </TD>
                  )}
                </TRow>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Confirm
        open={!!del} title="Șterge partener"
        body={`Ștergi definitiv "${del?.denumire}"?`}
        ok="Șterge" loading={deleting}
        onOk={doDelete} onCancel={() => setDel(null)}
      />
    </div>
  );
}
