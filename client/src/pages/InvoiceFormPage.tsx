import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceSchema, type InvoiceFormValues } from "../validation";
import { invoiceApi } from "../api/invoice.api";
import { partnerApi } from "../api/partner.api";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../auth/useAuth";
import { AppLayout } from "../components/ui/AppLayout";
import { PageHeader, BtnPrimary, Spinner, Empty } from "../components/ui/ui";
import type { Partner, VatRate } from "../types";

// ── Constants ──────────────────────────────────────────────────────────────

const VAT_RATES: Record<VatRate, { label: string; mul: number }> = {
  Standard: { label: "19%", mul: 0.19 },
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

// ── Form Components ────────────────────────────────────────────────────────

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

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
function Input(props: InputProps) {
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

// ── Main Page ──────────────────────────────────────────────────────────────

export function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== "new";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [nextNumber, setNextNumber] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
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

  // Load partners on mount
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

  // Get next invoice number when series changes
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

  // Load existing invoice if editing
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
          issued_date: invoice.issued_date,
          due_date: invoice.due_date || undefined,
          delivery_date: invoice.delivery_date || undefined,
          issuer_pf_id: invoice.issuer_pf_id || undefined,
          issuer_pj_id: invoice.issuer_pj_id || undefined,
          partner_id: invoice.partner_id,
          currency: invoice.currency,
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
      // Convert null values to undefined for API compatibility
      const payload = {
        ...values,
        due_date: values.due_date || undefined,
        delivery_date: values.delivery_date || undefined,
        notes: values.notes || undefined,
        payment_terms: values.payment_terms || undefined,
      };

      if (isEdit) {
        await invoiceApi.update(id!, payload);
        toast("Factură actualizată.", "ok");
      } else {
        await invoiceApi.create(payload);
        toast("Factură creată.", "ok");
      }
      navigate("/invoices");
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ?? e?.response?.data ?? "Eroare la salvare.";
      toast(msg, "err");
    }
  };

  // Calculate totals
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
      <div className="p-8 max-w-6xl mx-auto fade-up">
        <PageHeader
          title={isEdit ? "Editare Factură" : "Factură Nouă"}
          sub={isEdit ? `ID: ${id}` : undefined}
        />

        {loadingPartners || !nextNumber ? (
          <Spinner />
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-xl border p-8"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            {/* Header Section */}
            <div
              className="mb-8 pb-8 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="grid grid-cols-2 gap-6 mb-6">
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

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  label="Tip Document"
                  required
                  error={errors.document_type?.message}
                >
                  <Select {...register("document_type")} options={DOC_TYPES} />
                </FormField>

                <FormField
                  label="Monedă"
                  required
                  error={errors.currency?.message}
                >
                  <Input {...register("currency")} maxLength={3} />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-6 mt-6">
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

              <FormField
                label="Partener"
                required
                error={errors.partner_id?.message}
              >
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
                    borderColor: "var(--amber-dim)",
                  }}
                >
                  + Adaugă linie
                </button>
              </div>

              <div
                className="overflow-x-auto mb-4 rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              >
                <table className="w-full text-xs">
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
                        Cantitate
                      </th>
                      <th
                        className="px-3 py-2 text-right"
                        style={{ color: "var(--text-dim)" }}
                      >
                        Purețe
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
                        VAT
                      </th>
                      <th
                        className="px-3 py-2 text-right"
                        style={{ color: "var(--text-dim)" }}
                      >
                        Total
                      </th>
                      <th className="px-3 py-2"></th>
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
                    className="text-lg font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    {formatDecimal(totalSubtotal)} {watch("currency")}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                    VAT
                  </p>
                  <p
                    className="text-lg font-semibold"
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
                    className="text-lg font-semibold"
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
              className="flex items-center gap-3 mt-8 pt-6 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <BtnPrimary
                type="submit"
                loading={isSubmitting}
                disabled={!isDirty || isReadOnly}
              >
                {isEdit ? "Actualizează" : "Crează"}
              </BtnPrimary>
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
