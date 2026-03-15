import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { pfGetAll, pfDelete } from "../api/persoanaFizica.api";
import { Confirm } from "../components/ui/Confirm";
import { useToast } from "../components/ui/Toast";
import { Spinner, Empty, PageHeader, BtnPrimary, THead, TRow, TD, Dash, Badge } from "../components/ui/ui";
import type { PersoanaFizica } from "../types";

export default function PersoanaFizicaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<PersoanaFizica[]>([]);
  const [filtered, setFiltered] = useState<PersoanaFizica[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [del, setDel] = useState<PersoanaFizica | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    pfGetAll()
      .then((d) => { setRows(d); setFiltered(d); })
      .catch(() => toast("Eroare la încărcare.", "err"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const s = q.toLowerCase();
    setFiltered(rows.filter((r) =>
      r.cnp.includes(s) ||
      r.nume.toLowerCase().includes(s) ||
      r.prenume.toLowerCase().includes(s) ||
      (r.email ?? "").toLowerCase().includes(s),
    ));
  }, [q, rows]);

  const doDelete = async () => {
    if (!del) return;
    setDeleting(true);
    try {
      await pfDelete(del.id);
      toast("Persoană ștearsă.", "ok");
      setRows((p) => p.filter((r) => r.id !== del.id));
    } catch { toast("Eroare la ștergere.", "err"); }
    finally { setDeleting(false); setDel(null); }
  };

  return (
    <div className="p-8 fade-up">
      <PageHeader
        title="Persoane Fizice"
        sub={`${filtered.length} înregistrări`}
        action={isAdmin ? (
          <BtnPrimary onClick={() => navigate("/persoane-fizice/new")}>+ Adaugă</BtnPrimary>
        ) : undefined}
      />

      <input
        value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Caută după CNP, nume sau email…"
        className="mb-5 w-72 rounded-lg px-3 py-2 text-sm font-mono border outline-none transition-colors"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text)" }}
        onFocus={(e) => (e.target.style.borderColor = "var(--amber)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty msg={q ? "Niciun rezultat." : "Nicio persoană fizică înregistrată."} />
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <table className="min-w-full" style={{ background: "var(--bg-card)" }}>
            <THead cols={["CNP", "Nume", "Prenume", "Email", "Stare", ...(isAdmin ? ["Acțiuni"] : [])]} />
            <tbody>
              {filtered.map((r) => (
                <TRow key={r.id} onClick={() => navigate(`/persoane-fizice/${r.id}`)}>
                  <TD mono>{r.cnp}</TD>
                  <TD><span className="font-medium">{r.nume}</span></TD>
                  <TD>{r.prenume}</TD>
                  <TD>{r.email ?? <Dash />}</TD>
                  <TD><Badge value={r.stare} variant="pf" /></TD>
                  {isAdmin && (
                    <TD>
                      <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => navigate(`/persoane-fizice/${r.id}`)}
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
        open={!!del}
        title="Șterge persoană fizică"
        body={`Ștergi definitiv pe "${del?.nume} ${del?.prenume}"?`}
        ok="Șterge" loading={deleting}
        onOk={doDelete} onCancel={() => setDel(null)}
      />
    </div>
  );
}
