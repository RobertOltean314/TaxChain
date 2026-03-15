import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { invoiceGetAll, invoiceDelete } from "../api/invoice.api";
import { Confirm } from "../components/ui/Confirm";
import { useToast } from "../components/ui/Toast";
import { Spinner, Empty, PageHeader, BtnPrimary, THead, TRow, TD, Dash, Badge, fmtNum, fmtDate } from "../components/ui/ui";
import type { Invoice, InvoiceStatus, DocumentType } from "../types";
import { DOC_TYPE_LABELS, STATUS_LABELS } from "../types";

const ALL_STATUSES: InvoiceStatus[] = ["Draft", "Issued", "Sent", "Paid", "Cancelled"];
const ALL_TYPES: DocumentType[]     = ["TaxInvoice", "Proforma", "CreditNote", "Receipt", "DeliveryNote"];

export default function InvoicePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [filtered, setFiltered] = useState<Invoice[]>([]);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<InvoiceStatus | "">("");
  const [typeF, setTypeF] = useState<DocumentType | "">("");
  const [loading, setLoading] = useState(true);
  const [del, setDel] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const canWrite = user?.role === "Admin" || user?.role === "Taxpayer";

  useEffect(() => {
    invoiceGetAll()
      .then((d) => { setRows(d); setFiltered(d); })
      .catch(() => toast("Eroare la încărcare.", "err"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const s = q.toLowerCase();
    setFiltered(rows.filter((r) =>
      (!s || r.number.toLowerCase().includes(s) || (r.series ?? "").toLowerCase().includes(s)) &&
      (!statusF || r.status === statusF) &&
      (!typeF   || r.document_type === typeF),
    ));
  }, [q, statusF, typeF, rows]);

  const doDelete = async () => {
    if (!del) return;
    setDeleting(true);
    try {
      await invoiceDelete(del.id);
      toast("Factură ștearsă.", "ok");
      setRows((p) => p.filter((r) => r.id !== del.id));
    } catch { toast("Eroare. Doar facturile Ciornă pot fi șterse.", "err"); }
    finally { setDeleting(false); setDel(null); }
  };

  const selCls = "rounded-lg px-3 py-2 text-xs font-mono border outline-none cursor-pointer transition-colors";
  const selSty = { background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-sub)" };

  return (
    <div className="p-8 fade-up">
      <PageHeader
        title="Facturi"
        sub={`${filtered.length} documente`}
        action={canWrite ? (
          <BtnPrimary onClick={() => navigate("/facturi/nou")}>+ Factură nouă</BtnPrimary>
        ) : undefined}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Caută după număr…"
          className="w-44 rounded-lg px-3 py-2 text-sm font-mono border outline-none transition-colors"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text)" }}
          onFocus={(e) => (e.target.style.borderColor = "var(--amber)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />

        <select value={statusF} onChange={(e) => setStatusF(e.target.value as any)} className={selCls} style={selSty}>
          <option value="">Toate stările</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <select value={typeF} onChange={(e) => setTypeF(e.target.value as any)} className={selCls} style={selSty}>
          <option value="">Toate tipurile</option>
          {ALL_TYPES.map((t) => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
        </select>

        {(q || statusF || typeF) && (
          <button onClick={() => { setQ(""); setStatusF(""); setTypeF(""); }}
            className="text-xs font-mono px-2 transition-colors" style={{ color: "var(--text-dim)" }}>
            × resetează
          </button>
        )}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty msg="Nicio factură găsită." />
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="min-w-full" style={{ background: "var(--bg-card)" }}>
              <THead cols={["Număr", "Tip", "Stare", "Data emiterii", "Scadență", "Total", "Rest", ...(canWrite ? ["Acțiuni"] : [])]} />
              <tbody>
                {filtered.map((r) => {
                  const overdue = r.due_date && r.status !== "Paid" && r.status !== "Cancelled" && new Date(r.due_date) < new Date();
                  return (
                    <TRow key={r.id} onClick={() => navigate(`/facturi/${r.id}`)}>
                      <TD mono>
                        <span className="font-medium">{r.series ? `${r.series}-` : ""}{r.number}</span>
                      </TD>
                      <TD>
                        <span className="text-xs" style={{ color: "var(--text-sub)" }}>{DOC_TYPE_LABELS[r.document_type]}</span>
                      </TD>
                      <TD><Badge value={r.status} variant="invoice" /></TD>
                      <TD mono>{fmtDate(r.issued_date)}</TD>
                      <TD mono>
                        {r.due_date
                          ? <span style={{ color: overdue ? "var(--red)" : "var(--text)" }}>{fmtDate(r.due_date)}{overdue ? " ⚠" : ""}</span>
                          : <Dash />}
                      </TD>
                      <TD mono right>{fmtNum(r.total, r.currency)}</TD>
                      <TD mono right>
                        <span style={{ color: r.amount_due > 0 ? "var(--red)" : "var(--green)" }}>
                          {fmtNum(r.amount_due, r.currency)}
                        </span>
                      </TD>
                      {canWrite && (
                        <TD>
                          <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => navigate(`/facturi/${r.id}`)}
                              className="text-xs font-mono" style={{ color: "var(--amber)" }}>detalii</button>
                            {r.status === "Draft" && (
                              <button onClick={() => setDel(r)}
                                className="text-xs font-mono" style={{ color: "var(--red)" }}>șterge</button>
                            )}
                          </div>
                        </TD>
                      )}
                    </TRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Confirm
        open={!!del} title="Șterge factură"
        body={`Ștergi definitiv factura "${del?.series ? del.series + "-" : ""}${del?.number}"?`}
        ok="Șterge" loading={deleting}
        onOk={doDelete} onCancel={() => setDel(null)}
      />
    </div>
  );
}
