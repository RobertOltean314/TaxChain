import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  invoiceSchema,
  partnerSchema,
  type InvoiceFormValues,
  type PartnerFormValues,
  trimStrings,
} from "../validation";
import { invoiceApi } from "../api/invoice.api";
import { partnerApi } from "../api/partner.api";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../auth/useAuth";
import { useEntity } from "../auth/useEntity";
import { AppLayout } from "../components/ui/AppLayout";
import { PageHeader, Button, Spinner } from "../components/ui/ui";
import type { Partner, VatRate } from "../types";

// ── Constants ──────────────────────────────────────────────────────────────

const VAT_RATES: Record<VatRate, { label: string; mul: number }> = {
  Standard: { label: "21%", mul: 0.21 },
  Reduced9: { label: "9%", mul: 0.09 },
  Reduced5: { label: "5%", mul: 0.05 },
  Exempt: { label: "0% (scutit)", mul: 0 },
};

const DOC_TYPES = [
  { value: "TaxInvoice", label: "Factură fiscală" },
  { value: "Proforma", label: "Proformă" },
  { value: "CreditNote", label: "Notă de credit" },
  { value: "Receipt", label: "Chitanță" },
  { value: "DeliveryNote", label: "Aviz expediție" },
];

const TRANSACTION_TYPES = [
  { value: "Income", label: "Venit" },
  { value: "Expense", label: "Cheltuială" },
];

const CURRENCIES = [
  { value: "RON", label: "RON — Leu românesc" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "USD", label: "USD — Dolar american" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function parseDecimal(val: string): number {
  return parseFloat(val) || 0;
}

function formatDecimal(num: number): string {
  return num.toFixed(2);
}

interface LineCalculations {
  subtotal: number;
  vat: number;
  total: number;
}

function calculateLine(
  quantity: string,
  unitPrice: string,
  discount: string,
  vatRate: VatRate,
): LineCalculations {
  const qty = parseDecimal(quantity);
  const price = parseDecimal(unitPrice);
  const disc = parseDecimal(discount);
  const vatMul = VAT_RATES[vatRate].mul;

  const subtotal = qty * price * (1 - disc / 100);
  const vat = subtotal * vatMul;
  const total = subtotal + vat;

  return { subtotal, vat, total };
}

// ── Local form primitives ──────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label
        className="block text-sm font-medium mb-1"
        style={{ color: "var(--text)" }}
      >
        {label}
        {required && <span style={{ color: "var(--red)" }}>*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs mt-0.5" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 rounded-lg border text-sm"
      style={{
        background: "var(--bg-input)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}
function Select({ options, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 rounded-lg border text-sm"
      style={{
        background: "var(--bg-input)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ── Quick-create partner modal ─────────────────────────────────────────────

interface QuickPartnerModalProps {
  onCreated: (partner: Partner) => void;
  onClose: () => void;
}

function QuickPartnerModal({ onCreated, onClose }: QuickPartnerModalProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      tip: "Client" as const,
      tip_entitate: "PersoanaJuridica" as const,
      tara: "România",
    },
  });

  const onSubmit = async (values: PartnerFormValues) => {
    try {
      const trimmed = trimStrings(values);
      const partner = await partnerApi.create({
        denumire: trimmed.denumire,
        cod_fiscal: trimmed.cod_fiscal ?? undefined,
        tip: trimmed.tip as import("../types").PartnerType,
        tip_entitate: trimmed.tip_entitate as import("../types").EntityType,
        tara: trimmed.tara,
      });
      onCreated(partner);
      toast("Partener creat cu succes.", "ok");
    } catch (e: any) {
      toast(e?.response?.data?.error ?? "Eroare la creare partener.", "err");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="w-full max-w-md rounded-xl border p-6 shadow-xl"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Partener Nou
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-2 py-1 rounded"
            style={{ color: "var(--text-dim)" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Denumire" required error={errors.denumire?.message}>
            <Input
              {...register("denumire")}
              placeholder="Numele partenerului"
              autoFocus
            />
          </FormField>

          <FormField label="Cod Fiscal" error={errors.cod_fiscal?.message}>
            <Input {...register("cod_fiscal")} placeholder="ex. RO12345678" />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tip Partener" required error={errors.tip?.message}>
              <Select
                {...register("tip")}
                options={[
                  { value: "Client", label: "Client" },
                  { value: "Furnizor", label: "Furnizor" },
                  { value: "Ambele", label: "Client și Furnizor" },
                ]}
              />
            </FormField>

            <FormField
              label="Tip Entitate"
              required
              error={errors.tip_entitate?.message}
            >
              <Select
                {...register("tip_entitate")}
                options={[
                  { value: "PersoanaJuridica", label: "Persoană Juridică" },
                  { value: "PersoanaFizica", label: "Persoană Fizică" },
                ]}
              />
            </FormField>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Crează Partener
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Anulează
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== "new";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeEntity } = useEntity();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [nextNumber, setNextNumber] = useState<string | null>(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      document_type: "TaxInvoice",
      currency: "RON",
      issued_date: new Date().toISOString().substring(0, 10),
      series: "FC",
      lines: [
        {
          description: "",
          unit: "buc",
          quantity: "1",
          unit_price: "0",
          discount_percent: "0",
          vat_rate: "Standard",
        },
      ],
    },
  });

  const {
    fields: lines,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "lines",
  });

  const watchLines = watch("lines");
  const watchSeries = watch("series");

  useEffect(() => {
    (async () => {
      try {
        const data = await partnerApi.getAll();
        setPartners(data);
      } catch {
        toast("Eroare la încărcare parteneri.", "err");
      } finally {
        setLoadingPartners(false);
      }
    })();
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        const { next_number } = await invoiceApi.getNextNumber(
          watchSeries || "FC",
        );
        setNextNumber(next_number);
      } catch {
        setNextNumber(null);
      }
    })();
  }, [watchSeries]);

  useEffect(() => {
    if (!isEdit) {
      if (nextNumber) {
        reset((formValues) => ({
          ...formValues,
          number: nextNumber,
        }));
      }
      return;
    }

    (async () => {
      try {
        const { invoice, lines: invoiceLines } = await invoiceApi.getById(id!);
        reset({
          number: invoice.number,
          series: invoice.series || "FC",
          document_type: invoice.document_type,
          transaction_type: invoice.transaction_type || undefined,
          issued_date: invoice.issued_date,
          due_date: invoice.due_date || undefined,
          delivery_date: invoice.delivery_date || undefined,
          issuer_pf_id: invoice.issuer_pf_id || undefined,
          issuer_pj_id: invoice.issuer_pj_id || undefined,
          partner_id: invoice.partner_id,
          currency: invoice.currency as "RON" | "EUR" | "USD",
          notes: invoice.notes || undefined,
          payment_terms: invoice.payment_terms || undefined,
          lines: invoiceLines.map((l) => ({
            description: l.description,
            product_code: l.product_code || undefined,
            unit: l.unit,
            quantity: l.quantity,
            unit_price: l.unit_price,
            discount_percent: l.discount_percent,
            vat_rate: l.vat_rate,
          })),
        });
      } catch {
        toast("Eroare la încărcare factură.", "err");
        navigate("/invoices");
      }
    })();
  }, [id, isEdit, reset, navigate, toast, nextNumber]);

  const onSubmit = async (values: InvoiceFormValues) => {
    try {
      const trimmed = trimStrings(values);
      const payload: Parameters<typeof invoiceApi.create>[0] = {
        ...trimmed,
        due_date: trimmed.due_date || undefined,
        delivery_date: trimmed.delivery_date || undefined,
        notes: trimmed.notes || undefined,
        payment_terms: trimmed.payment_terms || undefined,
        issuer_pf_id: activeEntity?.type === "PF" ? activeEntity.id : (trimmed.issuer_pf_id ?? undefined),
        issuer_pj_id: activeEntity?.type === "PJ" ? activeEntity.id : (trimmed.issuer_pj_id ?? undefined),
        transaction_type: (trimmed.transaction_type ?? undefined) as
          | "Income"
          | "Expense"
          | undefined,
        lines: trimmed.lines.map((l) => ({
          ...l,
          product_code: l.product_code ?? undefined,
          vat_rate: l.vat_rate as "Standard" | "Reduced9" | "Reduced5" | "Exempt",
        })),
      };

      if (isEdit) {
        await invoiceApi.update(id!, payload);
        toast("Factură actualizată cu succes.", "ok");
      } else {
        await invoiceApi.create(payload);
        toast("Factură creată cu succes.", "ok");
      }
      navigate("/invoices");
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ?? e?.response?.data ?? "Eroare la salvare.";
      toast(msg, "err");
    }
  };

  const handlePartnerCreated = (partner: Partner) => {
    setPartners((prev) => [...prev, partner]);
    setValue("partner_id", partner.id, { shouldDirty: true });
    setShowPartnerModal(false);
  };

  const lineTotals = watchLines.map((line) =>
    calculateLine(
      line.quantity,
      line.unit_price,
      line.discount_percent || "0",
      line.vat_rate,
    ),
  );
  const totalSubtotal = lineTotals.reduce((sum, l) => sum + l.subtotal, 0);
  const totalVat = lineTotals.reduce((sum, l) => sum + l.vat, 0);
  const totalAmount = totalSubtotal + totalVat;

  const isReadOnly = user?.role === "Auditor";

  return (
    <AppLayout>
      {showPartnerModal && (
        <QuickPartnerModal
          onCreated={handlePartnerCreated}
          onClose={() => setShowPartnerModal(false)}
        />
      )}

      <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 fade-up">
        <PageHeader
          title={isEdit ? "Editare Factură" : "Factură Nouă"}
          subtitle={isEdit ? `ID: ${id}` : undefined}
        />

        {loadingPartners || !nextNumber ? (
          <Spinner />
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-xl border p-6 sm:p-8"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            {/* Active entity banner */}
            {activeEntity && (
              <div
                className="flex items-center gap-3 rounded-lg px-4 py-3 mb-6"
                style={{
                  background: "color-mix(in srgb, var(--blue) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--blue) 25%, transparent)",
                }}
              >
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{
                    background: "color-mix(in srgb, var(--blue) 15%, transparent)",
                    color: "var(--blue)",
                  }}
                >
                  {activeEntity.type}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                    {activeEntity.name}
                  </p>
                  <p className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>
                    {activeEntity.type === "PF" ? "CNP" : "CIF"}: {activeEntity.fiscalCode}
                  </p>
                </div>
              </div>
            )}

            {/* Header Section */}
            <div
              className="mb-8 pb-8 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <FormField
                  label="Seria"
                  required
                  error={errors.series?.message}
                >
                  <Input {...register("series")} />
                </FormField>

                <FormField
                  label="Numărul"
                  required
                  error={errors.number?.message}
                >
                  <Input
                    {...register("number")}
                    placeholder={nextNumber || undefined}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <FormField
                  label="Tip Document"
                  required
                  error={errors.document_type?.message}
                >
                  <Select {...register("document_type")} options={DOC_TYPES} />
                </FormField>

                <FormField
                  label="Tip Tranzacție"
                  error={errors.transaction_type?.message}
                >
                  <Select
                    {...register("transaction_type")}
                    options={[
                      { value: "", label: "--- Selectați tip ---" },
                      ...TRANSACTION_TYPES,
                    ]}
                  />
                </FormField>

                <FormField
                  label="Monedă"
                  required
                  error={errors.currency?.message}
                >
                  <Select {...register("currency")} options={CURRENCIES} />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
                <FormField
                  label="Data Emisiei"
                  required
                  error={errors.issued_date?.message}
                >
                  <Input {...register("issued_date")} type="date" />
                </FormField>

                <FormField
                  label="Data Scadenței"
                  error={errors.due_date?.message}
                >
                  <Input {...register("due_date")} type="date" />
                </FormField>

                <FormField
                  label="Data Livrării"
                  error={errors.delivery_date?.message}
                >
                  <Input {...register("delivery_date")} type="date" />
                </FormField>
              </div>

              {/* Partner select + quick-create */}
              <FormField
                label="Partener"
                required
                error={errors.partner_id?.message}
              >
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <Select
                      {...register("partner_id")}
                      options={[
                        { value: "", label: "--- Selectați partener ---" },
                        ...partners.map((p) => ({
                          value: p.id,
                          label: `${p.denumire}${p.cod_fiscal ? ` (${p.cod_fiscal})` : ""}`,
                        })),
                      ]}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPartnerModal(true)}
                    disabled={isSubmitting || isReadOnly}
                    className="shrink-0 px-3 py-2 text-sm rounded-lg border transition-colors disabled:opacity-50 whitespace-nowrap"
                    style={{
                      color: "var(--amber)",
                      borderColor: "var(--amber-dim, var(--border))",
                      background: "var(--bg-input)",
                    }}
                  >
                    + Partener nou
                  </button>
                </div>
              </FormField>
            </div>

            {/* Line Items Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  Linii Factură
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    append({
                      description: "",
                      unit: "buc",
                      quantity: "1",
                      unit_price: "0",
                      discount_percent: "0",
                      vat_rate: "Standard",
                    })
                  }
                  disabled={isReadOnly || isSubmitting}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
                  style={{
                    color: "var(--amber)",
                    borderColor: "var(--amber-dim, var(--border))",
                  }}
                >
                  + Adaugă linie
                </button>
              </div>

              <div
                className="overflow-x-auto mb-4 rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              >
                <table className="w-full text-xs" style={{ minWidth: "560px" }}>
                  <thead>
                    <tr
                      style={{
                        background: "var(--bg-input)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <th
                        className="px-3 py-2 text-left"
                        style={{ color: "var(--text-dim)" }}
                      >
                        Descriere
                      </th>
                      <th
                        className="px-3 py-2 text-right"
                        style={{ color: "var(--text-dim)" }}
                      >
                        Cant.
                      </th>
                      <th
                        className="px-3 py-2 text-right"
                        style={{ color: "var(--text-dim)" }}
                      >
                        Preț
                      </th>
                      <th
                        className="px-3 py-2 text-right"
                        style={{ color: "var(--text-dim)" }}
                      >
                        Disc %
                      </th>
                      <th
                        className="px-3 py-2 text-center"
                        style={{ color: "var(--text-dim)" }}
                      >
                        TVA
                      </th>
                      <th
                        className="px-3 py-2 text-right"
                        style={{ color: "var(--text-dim)" }}
                      >
                        Total
                      </th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const calc = lineTotals[idx];
                      return (
                        <tr
                          key={line.id}
                          style={{ borderBottom: "1px solid var(--border)" }}
                        >
                          <td className="px-3 py-2">
                            <Input
                              {...register(`lines.${idx}.description`)}
                              placeholder="Descriere"
                              style={{ fontSize: "0.75rem" }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              {...register(`lines.${idx}.quantity`)}
                              type="number"
                              step="0.01"
                              placeholder="1"
                              className="text-right"
                              style={{ fontSize: "0.75rem" }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              {...register(`lines.${idx}.unit_price`)}
                              type="number"
                              step="0.01"
                              placeholder="0"
                              className="text-right"
                              style={{ fontSize: "0.75rem" }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              {...register(`lines.${idx}.discount_percent`)}
                              type="number"
                              step="0.01"
                              placeholder="0"
                              className="text-right"
                              style={{ fontSize: "0.75rem" }}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Select
                              {...register(`lines.${idx}.vat_rate`)}
                              options={Object.entries(VAT_RATES).map(
                                ([val, { label }]) => ({
                                  value: val,
                                  label,
                                }),
                              )}
                            />
                          </td>
                          <td
                            className="px-3 py-2 text-right font-mono"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {formatDecimal(calc.total)}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => remove(idx)}
                              disabled={isReadOnly || isSubmitting}
                              className="text-xs font-mono px-2 py-1 rounded transition-colors disabled:opacity-50"
                              style={{ color: "var(--red)" }}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {errors.lines && (
                <p className="text-xs" style={{ color: "var(--red)" }}>
                  {typeof errors.lines === "object" && "message" in errors.lines
                    ? (errors.lines as any).message
                    : "Eroare în liniile facturii"}
                </p>
              )}
            </div>

            {/* Totals Section */}
            <div
              className="mb-8 pb-8 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="grid grid-cols-3 gap-6 text-right font-mono">
                <div>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    Subtotal
                  </p>
                  <p
                    className="text-base sm:text-lg font-semibold truncate"
                    style={{ color: "var(--text)" }}
                  >
                    {formatDecimal(totalSubtotal)} {watch("currency")}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    TVA
                  </p>
                  <p
                    className="text-base sm:text-lg font-semibold truncate"
                    style={{ color: "var(--amber)" }}
                  >
                    {formatDecimal(totalVat)} {watch("currency")}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    Total
                  </p>
                  <p
                    className="text-base sm:text-lg font-semibold truncate"
                    style={{ color: "var(--green)" }}
                  >
                    {formatDecimal(totalAmount)} {watch("currency")}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <FormField
              label="Note & Condiții"
              error={errors.payment_terms?.message}
            >
              <textarea
                {...register("payment_terms")}
                className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                style={{
                  background: "var(--bg-input)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
                placeholder="Condiții de plată, instrucțiuni..."
                rows={3}
              />
            </FormField>

            {/* Actions */}
            <div
              className="flex flex-wrap items-center gap-3 mt-8 pt-6 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={!isDirty || isReadOnly}
              >
                {isEdit ? "Actualizează" : "Crează"}
              </Button>
              <button
                type="button"
                onClick={() => navigate("/invoices")}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm rounded-lg border transition-colors disabled:opacity-50"
                style={{
                  color: "var(--text-sub)",
                  borderColor: "var(--border)",
                }}
              >
                Anulează
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
