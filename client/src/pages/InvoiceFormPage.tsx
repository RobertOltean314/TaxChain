import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { invoiceGetById, invoiceCreate, invoiceUpdate } from "../api/invoice.api";
import { partenerGetAll } from "../api/partener.api";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../auth/useAuth";
import { Card, FieldLabel, FieldError, inputCls, BtnPrimary, BtnGhost, BtnBack, fmtNum } from "../components/ui/ui";
import type { InvoiceRequest, Partner, VatRate, DocumentType } from "../types";
import { DOC_TYPE_LABELS, VAT_LABELS, VAT_MULT } from "../types";

const DOC_TYPES: DocumentType[] = ["TaxInvoice", "Proforma", "CreditNote", "Receipt", "DeliveryNote"];
const VAT_RATES: VatRate[]      = ["Standard", "Reduced9", "Reduced5", "Exempt"];
const CURRENCIES                = ["RON", "EUR", "USD"];

// A form-level line — extends InvoiceLineRequest with form-friendly string unit
type FormLine = {
  description: string; product_code: string; unit: string;
  quantity: number; unit_price: number; discount_percent: number;
  vat_rate: VatRate;
};
type FormValues = Omit<InvoiceRequest, "lines" | "issuer_pf_id" | "issuer_pj_id"> & { lines: FormLine[] };

const EMPTY_LINE: FormLine = {
  description: "", product_code: "", unit: "buc",
  quantity: 1, unit_price: 0, discount_percent: 0, vat_rate: "Standard",
};

export default function InvoiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEdit = !!id && id !== "nou";
  const [partners, setPartners] = useState<Partner[]>([]);

  const {
    register, control, handleSubmit, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      number: "", series: "", document_type: "TaxInvoice",
      issued_date: new Date().toISOString().split("T")[0],
      due_date: "", delivery_date: "", currency: "RON",
      partner_id: "", notes: "", payment_terms: "",
      lines: [EMPTY_LINE],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines    = watch("lines");
  const watchedCurrency = watch("currency");

  useEffect(() => {
    partenerGetAll().then(setPartners).catch(() => toast("Eroare la încărcarea partenerilor.", "err"));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    invoiceGetById(id!).then(({ invoice, lines }) => {
      reset({
        number: invoice.number,
        series: invoice.series ?? "",
        document_type: invoice.document_type,
        issued_date: invoice.issued_date,
        due_date: invoice.due_date ?? "",
        delivery_date: invoice.delivery_date ?? "",
        currency: invoice.currency,
        partner_id: invoice.partner_id,
        notes: invoice.notes ?? "",
        payment_terms: invoice.payment_terms ?? "",
        lines: lines.map((l) => ({
          description: l.description,
          product_code: l.product_code ?? "",
          unit: l.unit,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_percent: l.discount_percent,
          vat_rate: l.vat_rate,
        })),
      });
    }).catch(() => { toast("Eroare la încărcare.", "err"); navigate("/facturi"); });
  }, [id, isEdit]);

  // Live totals
  const lineTotals = (watchedLines ?? []).map((l) => {
    const qty   = Number(l.quantity)   || 0;
    const price = Number(l.unit_price) || 0;
    const disc  = Number(l.discount_percent) || 0;
    const vat   = VAT_MULT[l.vat_rate] ?? 0;
    const sub   = qty * price * (1 - disc / 100);
    const vatAmt = sub * vat;
    return { sub, vatAmt, total: sub + vatAmt };
  });
  const grandSub   = lineTotals.reduce((a, l) => a + l.sub,   0);
  const grandVat   = lineTotals.reduce((a, l) => a + l.vatAmt, 0);
  const grandTotal = grandSub + grandVat;

  const onSubmit = async (v: FormValues) => {
    // Backend requires at least one issuer; we pick from the logged-in user's linked entities
    if (!user?.persoana_fizica_id && !user?.persoana_juridica_id) {
      toast("Contul tău nu este legat de o entitate fiscală (PF sau PJ). Contactează un Admin.", "err");
      return;
    }

    const body: InvoiceRequest = {
      number: v.number,
      series: v.series || null,
      document_type: v.document_type ?? null,
      issued_date: v.issued_date,
      due_date: v.due_date || null,
      delivery_date: v.delivery_date || null,
      issuer_pf_id:  user.persoana_fizica_id  ?? null,
      issuer_pj_id:  user.persoana_juridica_id ?? null,
      partner_id: v.partner_id,
      currency: v.currency || null,
      notes: v.notes || null,
      payment_terms: v.payment_terms || null,
      lines: v.lines.map((l, i) => ({
        position: i + 1,
        description: l.description,
        product_code: l.product_code || null,
        unit: l.unit || "buc",
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent) || null,
        vat_rate: l.vat_rate ?? null,
      })),
    };

    try {
      if (isEdit) { await invoiceUpdate(id!, body); toast("Factură actualizată.", "ok"); }
      else { await invoiceCreate(body); toast("Factură creată.", "ok"); }
      navigate("/facturi");
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.response?.data?.details ?? "Eroare la salvare.";
      toast(typeof msg === "string" ? msg : "Eroare la salvare.", "err");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto fade-up">
      <BtnBack onClick={() => navigate("/facturi")} />
      <h1 className="font-display text-3xl mb-6" style={{ color: "var(--text)" }}>
        {isEdit ? "Editează factură" : "Factură nouă"}
      </h1>

      {isEdit && (
        <div className="mb-5 px-4 py-3 rounded-lg border text-sm font-mono"
          style={{ borderColor: "var(--amber-dim)", background: "var(--amber-bg)", color: "var(--amber)" }}>
          ⚠ Doar facturile în starea Ciornă pot fi editate.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Antet */}
        <Card title="Antet document">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Număr</FieldLabel>
              <input {...register("number", { required: "Obligatoriu" })} className={inputCls(!!errors.number)} placeholder="ex. 001" />
              <FieldError msg={errors.number?.message} />
            </div>
            <div>
              <FieldLabel>Serie</FieldLabel>
              <input {...register("series")} className={inputCls()} placeholder="ex. RO" />
            </div>
            <div>
              <FieldLabel>Tip document</FieldLabel>
              <select {...register("document_type")} className={inputCls()}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <FieldLabel required>Data emiterii</FieldLabel>
              <input type="date" {...register("issued_date", { required: "Obligatoriu" })} className={inputCls(!!errors.issued_date)} />
              <FieldError msg={errors.issued_date?.message} />
            </div>
            <div>
              <FieldLabel>Scadență</FieldLabel>
              <input type="date" {...register("due_date")} className={inputCls()} />
            </div>
            <div>
              <FieldLabel>Data livrare</FieldLabel>
              <input type="date" {...register("delivery_date")} className={inputCls()} />
            </div>
            <div>
              <FieldLabel>Valută</FieldLabel>
              <select {...register("currency")} className={inputCls()}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <FieldLabel required>Partener</FieldLabel>
            <select {...register("partner_id", { required: "Selectează un partener" })} className={inputCls(!!errors.partner_id)}>
              <option value="">— Selectează partener —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.denumire}{p.cod_fiscal ? ` (${p.cod_fiscal})` : ""}</option>
              ))}
            </select>
            <FieldError msg={errors.partner_id?.message} />
            {partners.length === 0 && (
              <p className="mt-1 text-xs font-mono" style={{ color: "var(--amber)" }}>
                Niciun partener.{" "}
                <button type="button" onClick={() => navigate("/parteneri/nou")} className="underline">Creează unul</button>.
              </p>
            )}
          </div>
        </Card>

        {/* Rânduri */}
        <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>Rânduri factură</p>
            <button type="button" onClick={() => append(EMPTY_LINE)}
              className="text-xs font-mono transition-colors" style={{ color: "var(--amber)" }}>
              + adaugă rând
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, i) => {
              const { sub, vatAmt, total } = lineTotals[i] ?? { sub: 0, vatAmt: 0, total: 0 };
              return (
                <div key={field.id} className="rounded-lg border p-4 space-y-3"
                  style={{ borderColor: "var(--border-hi)", background: "var(--bg)" }}>
                  <div className="flex justify-between">
                    <span className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>Rând {i + 1}</span>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(i)}
                        className="text-xs font-mono" style={{ color: "var(--red)" }}>elimină</button>
                    )}
                  </div>

                  <div>
                    <input
                      {...register(`lines.${i}.description`, { required: true })}
                      placeholder="Descriere produs / serviciu"
                      className={inputCls(!!errors.lines?.[i]?.description)}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <div className="sm:col-span-1">
                      <FieldLabel>Cantitate</FieldLabel>
                      <input type="number" step="0.001" min="0.001"
                        {...register(`lines.${i}.quantity`, { valueAsNumber: true })}
                        className={inputCls()} />
                    </div>
                    <div className="sm:col-span-1">
                      <FieldLabel>Preț unitar</FieldLabel>
                      <input type="number" step="0.01" min="0"
                        {...register(`lines.${i}.unit_price`, { valueAsNumber: true })}
                        className={inputCls()} />
                    </div>
                    <div className="sm:col-span-1">
                      <FieldLabel>UM</FieldLabel>
                      <input {...register(`lines.${i}.unit`)} className={inputCls()} placeholder="buc" />
                    </div>
                    <div className="sm:col-span-1">
                      <FieldLabel>Cod produs</FieldLabel>
                      <input {...register(`lines.${i}.product_code`)} className={inputCls()} />
                    </div>
                    <div className="sm:col-span-1">
                      <FieldLabel>Discount %</FieldLabel>
                      <input type="number" step="0.01" min="0" max="100"
                        {...register(`lines.${i}.discount_percent`, { valueAsNumber: true })}
                        className={inputCls()} />
                    </div>
                    <div className="sm:col-span-1">
                      <FieldLabel>TVA</FieldLabel>
                      <select {...register(`lines.${i}.vat_rate`)} className={inputCls()}>
                        {VAT_RATES.map((r) => <option key={r} value={r}>{VAT_LABELS[r]}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-5 text-xs font-mono pt-1"
                    style={{ borderTop: "1px solid var(--border)", color: "var(--text-sub)" }}>
                    <span>Subtotal: <span style={{ color: "var(--text)" }}>{fmtNum(sub)}</span></span>
                    <span>TVA: <span style={{ color: "var(--text)" }}>{fmtNum(vatAmt)}</span></span>
                    <span>Total: <span style={{ color: "var(--amber)" }}>{fmtNum(total)} {watchedCurrency}</span></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand totals */}
          <div className="mt-5 pt-4 flex justify-end" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="space-y-1.5 min-w-56 text-sm font-mono">
              <div className="flex justify-between" style={{ color: "var(--text-sub)" }}>
                <span>Subtotal</span><span>{fmtNum(grandSub)} {watchedCurrency}</span>
              </div>
              <div className="flex justify-between" style={{ color: "var(--text-sub)" }}>
                <span>TVA</span><span>{fmtNum(grandVat)} {watchedCurrency}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1"
                style={{ color: "var(--amber)", borderTop: "1px solid var(--border)" }}>
                <span>Total</span><span>{fmtNum(grandTotal)} {watchedCurrency}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <Card title="Note & termeni">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Note</FieldLabel>
              <textarea {...register("notes")} rows={3} className={`${inputCls()} resize-none`} />
            </div>
            <div>
              <FieldLabel>Termeni de plată</FieldLabel>
              <textarea {...register("payment_terms")} rows={3} className={`${inputCls()} resize-none`} />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <BtnGhost onClick={() => navigate("/facturi")}>Anulează</BtnGhost>
          <BtnPrimary type="submit" loading={isSubmitting}>
            {isEdit ? "Salvează" : "Creează factura"}
          </BtnPrimary>
        </div>
      </form>
    </div>
  );
}
