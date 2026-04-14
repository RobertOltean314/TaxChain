import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { pjGetAll, pjDelete } from "../api/persoanaJuridica.api";
import { Confirm } from "../components/ui/Confirm";
import { useToast } from "../components/ui/Toast";
import {
  Spinner,
  Empty,
  PageHeader,
  BtnPrimary,
  THead,
  TRow,
  TD,
  Dash,
  Badge,
} from "../components/ui/ui";
import type { PersoanaJuridica } from "../types";

export default function PersoanaJuridicaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<PersoanaJuridica[]>([]);
  const [filtered, setFiltered] = useState<PersoanaJuridica[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [del, setDel] = useState<PersoanaJuridica | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    pjGetAll()
      .then((d) => {
        setRows(d);
        setFiltered(d);
      })
      .catch(() => toast("Eroare la încărcare.", "err"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const s = q.toLowerCase();
    setFiltered(
      rows.filter(
        (r) =>
          r.cod_fiscal.toLowerCase().includes(s) ||
          r.denumire.toLowerCase().includes(s) ||
          (r.email ?? "").toLowerCase().includes(s),
      ),
    );
  }, [q, rows]);

  const doDelete = async () => {
    if (!del) return;
    setDeleting(true);
    try {
      await pjDelete(del.id);
      toast("Șters.", "ok");
      setRows((p) => p.filter((r) => r.id !== del.id));
    } catch {
      toast("Eroare la ștergere.", "err");
    } finally {
      setDeleting(false);
      setDel(null);
    }
  };

  return (
    <div className="p-8 fade-up">
      <PageHeader
        title="Persoane Juridice"
        sub={`${filtered.length} înregistrări`}
        action={
          isAdmin ? (
            <BtnPrimary onClick={() => navigate("/persoane-juridice/new")}>
              + Adaugă
            </BtnPrimary>
          ) : undefined
        }
      />

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Caută după CIF, denumire sau email…"
        className="mb-5 w-72 rounded-lg px-3 py-2 text-sm font-mono border outline-none transition-colors"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--amber)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty
          msg={q ? "Niciun rezultat." : "Nicio persoană juridică înregistrată."}
        />
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <table
            className="min-w-full"
            style={{ background: "var(--bg-card)" }}
          >
            <THead
              cols={[
                "CIF",
                "Denumire",
                "Email",
                "Stare",
                "Angajați",
                ...(isAdmin ? ["Acțiuni"] : []),
              ]}
            />
            <tbody>
              {filtered.map((r) => (
                <TRow
                  key={r.id}
                  onClick={() => navigate(`/persoane-juridice/${r.id}`)}
                >
                  <TD mono>{r.cod_fiscal}</TD>
                  <TD>
                    <span className="font-medium">{r.denumire}</span>
                  </TD>
                  <TD>{r.email ?? <Dash />}</TD>
                  <TD>
                    <Badge value={r.stare} variant="pj" />
                  </TD>
                  <TD mono>{r.numar_angajati}</TD>
                  {isAdmin && (
                    <TD>
                      <div
                        className="flex justify-end gap-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => navigate(`/persoane-juridice/${r.id}`)}
                          className="text-xs font-mono"
                          style={{ color: "var(--amber)" }}
                        >
                          editează
                        </button>
                        <button
                          onClick={() => setDel(r)}
                          className="text-xs font-mono"
                          style={{ color: "var(--red)" }}
                        >
                          șterge
                        </button>
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
        isOpen={!!del}
        title="Șterge persoană juridică"
        message={`Ștergi definitiv "${del?.denumire}"?`}
        confirmLabel="Șterge"
        isLoading={deleting}
        onConfirm={doDelete}
        onCancel={() => setDel(null)}
      />
    </div>
  );
}
