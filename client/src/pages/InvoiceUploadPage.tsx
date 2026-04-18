import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as pdfjsLib from "pdfjs-dist";
import { invoiceSchema, type InvoiceFormValues } from "../validation";
import { invoiceApi } from "../api/invoice.api";
import { partnerApi } from "../api/partner.api";
import { useToast } from "../components/ui/Toast";
import { AppLayout } from "../components/ui/AppLayout";
import {
  PageHeader,
  Button,
  FileUpload,
  EnhancedCard,
  FormField,
  Input,
  Select,
  Spinner,
} from "../components/ui/ui";
import type { Partner, VatRate } from "../types";

// ── pdf.js worker setup (Vite-compatible) ──────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

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

const TRANSACTION_TYPES = [
  { value: "Income", label: "Venit" },
  { value: "Expense", label: "Cheltuială" },
];

// ── UBL 2.1 XML namespace constants ────────────────────────────────────────
const NS_CBC =
  "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
const NS_CAC =
  "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";

// ── Helpers ────────────────────────────────────────────────────────────────

function parseDecimal(val: string): number {
  return parseFloat(val) || 0;
}

function formatDecimal(num: number): string {
  return num.toFixed(2);
}

function getXmlText(
  parent: Element | Document,
  localName: string,
  ns: string = NS_CBC,
): string {
  const byNs = parent.getElementsByTagNameNS(ns, localName);
  if (byNs.length > 0) return byNs[0].textContent?.trim() ?? "";
  // Fallback for non-namespaced or prefixed XML
  const byTag = parent.getElementsByTagName(localName);
  if (byTag.length > 0) return byTag[0].textContent?.trim() ?? "";
  const prefixed = parent.getElementsByTagName(`cbc:${localName}`);
  if (prefixed.length > 0) return prefixed[0].textContent?.trim() ?? "";
  return "";
}

function vatPercentToRate(percent: string): VatRate {
  const p = parseFloat(percent);
  if (p >= 19) return "Standard";
  if (p >= 9) return "Reduced9";
  if (p >= 5) return "Reduced5";
  return "Exempt";
}

function unitCodeToLabel(unitCode: string): string {
  const map: Record<string, string> = {
    C62: "buc",
    HUR: "ore",
    DAY: "zile",
    MTR: "m",
    KGM: "kg",
    LTR: "l",
    MTK: "m²",
  };
  return map[unitCode] ?? (unitCode.toLowerCase() || "buc");
}

// ── XML (UBL 2.1 / eFactura) Parser ────────────────────────────────────────

function parseXmlInvoice(content: string): Partial<InvoiceFormValues> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("Fișierul XML nu este valid.");

  // Header fields
  const number = getXmlText(doc, "ID");
  const issuedDate = getXmlText(doc, "IssueDate");
  const dueDate = getXmlText(doc, "DueDate") || undefined;
  const deliveryDate = getXmlText(doc, "ActualDeliveryDate") || undefined;
  const rawCurrency = getXmlText(doc, "DocumentCurrencyCode");
  const currency: "RON" | "EUR" | "USD" = (["RON", "EUR", "USD"] as const).includes(
    rawCurrency as "RON" | "EUR" | "USD",
  )
    ? (rawCurrency as "RON" | "EUR" | "USD")
    : "RON";
  const notes = getXmlText(doc, "Note") || undefined;

  // Invoice lines
  const lineEls =
    doc.getElementsByTagNameNS(NS_CAC, "InvoiceLine").length > 0
      ? Array.from(doc.getElementsByTagNameNS(NS_CAC, "InvoiceLine"))
      : Array.from(doc.getElementsByTagName("InvoiceLine"));

  const lines: InvoiceFormValues["lines"] = lineEls.map((line) => {
    const qtyEl =
      line.getElementsByTagNameNS(NS_CBC, "InvoicedQuantity")[0] ??
      line.getElementsByTagName("InvoicedQuantity")[0];
    const quantity = qtyEl?.textContent?.trim() ?? "1";
    const unitCode = qtyEl?.getAttribute("unitCode") ?? "C62";
    const unit = unitCodeToLabel(unitCode);

    const description =
      getXmlText(line, "Description") ||
      getXmlText(line, "Name") ||
      "Produs/Serviciu";

    const priceEls =
      line.getElementsByTagNameNS(NS_CAC, "Price")[0] ??
      line.getElementsByTagName("Price")[0];
    const unitPrice = priceEls
      ? (getXmlText(priceEls as Element, "PriceAmount") ?? "0")
      : "0";

    // VAT rate from TaxCategory/Percent
    const taxCatEls =
      line.getElementsByTagNameNS(NS_CAC, "TaxCategory")[0] ??
      line.getElementsByTagName("TaxCategory")[0];
    const vatPercent = taxCatEls
      ? getXmlText(taxCatEls as Element, "Percent")
      : "19";
    const vatRate = vatPercentToRate(vatPercent);

    const discountEls =
      line.getElementsByTagNameNS(NS_CAC, "AllowanceCharge")[0];
    let discountPercent = "0";
    if (discountEls) {
      const charge = getXmlText(discountEls, "ChargeIndicator");
      if (charge === "false") {
        const mult = getXmlText(discountEls, "MultiplierFactorNumeric");
        if (mult) {
          discountPercent = (parseFloat(mult) * 100).toFixed(2);
        }
      }
    }

    return {
      description,
      unit,
      quantity,
      unit_price: unitPrice,
      discount_percent: discountPercent,
      vat_rate: vatRate,
    };
  });

  return {
    number,
    issued_date: issuedDate,
    due_date: dueDate,
    delivery_date: deliveryDate,
    currency,
    notes,
    document_type: "TaxInvoice",
    lines: lines.length > 0 ? lines : [],
  };
}

// ── PDF Parser (best-effort text extraction) ────────────────────────────────

async function parsePdfInvoice(
  file: File,
): Promise<Partial<InvoiceFormValues>> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += pageText + "\n";
  }

  // Best-effort field extraction via regex
  const invoiceNumMatch = fullText.match(
    /(?:Nr\.?\s*factur[aă]|Factură\s*nr\.?|Invoice\s*(?:No\.?|Nr\.?))\s*[:.]?\s*([A-Z]{1,4}[-/]?\d{2,4}[-/]?\d{1,6})/i,
  );
  const number = invoiceNumMatch?.[1] ?? "";

  const dateMatch = fullText.match(
    /(?:Data\s*emi[st]erii?|Data\s*emitere|Issue\s*Date)\s*[:.]?\s*(\d{2}[./]\d{2}[./]\d{4}|\d{4}-\d{2}-\d{2})/i,
  );
  const issuedDate = normalizeDate(dateMatch?.[1] ?? "");

  const dueDateMatch = fullText.match(
    /(?:Data\s*scaden[tț]ei?|Scadent(?:ă|a)|Due\s*Date)\s*[:.]?\s*(\d{2}[./]\d{2}[./]\d{4}|\d{4}-\d{2}-\d{2})/i,
  );
  const dueDate = dueDateMatch ? normalizeDate(dueDateMatch[1]) : undefined;

  return {
    number,
    issued_date: issuedDate,
    due_date: dueDate,
    document_type: "TaxInvoice",
    currency: "RON",
    lines: [],
  };
}

function normalizeDate(raw: string): string {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // DD.MM.YYYY or DD/MM/YYYY → YYYY-MM-DD
  const parts = raw.split(/[./]/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
}

// ── Main dispatch ──────────────────────────────────────────────────────────

type ParseSource = "xml" | "pdf" | null;

async function parseInvoiceFile(
  file: File,
): Promise<{ data: Partial<InvoiceFormValues>; source: ParseSource }> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "xml" || ext === "ubl") {
    const text = await file.text();
    const data = parseXmlInvoice(text);
    return { data, source: "xml" };
  }

  if (ext === "pdf") {
    const data = await parsePdfInvoice(file);
    return { data, source: "pdf" };
  }

  throw new Error(
    "Format nesuportat. Folosiți fișiere XML (eFactura UBL 2.1) sau PDF.",
  );
}

// ── Warning Banner ─────────────────────────────────────────────────────────

function ParseWarningBanner({ source }: { source: ParseSource }) {
  if (!source) return null;

  const isPdf = source === "pdf";

  return (
    <div
      className={`rounded-xl border px-5 py-4 mb-6 flex items-start gap-3 ${
        isPdf
          ? "border-orange-500/40 bg-orange-500/10"
          : "border-yellow-500/40 bg-yellow-500/10"
      }`}
    >
      <span className="text-xl mt-0.5">{isPdf ? "⚠️" : "ℹ️"}</span>
      <div>
        <p
          className={`font-semibold text-sm mb-1 ${isPdf ? "text-orange-300" : "text-yellow-300"}`}
        >
          {isPdf
            ? "Extragere PDF — verificați obligatoriu toate câmpurile"
            : "Date preluate din XML — verificați înainte de salvare"}
        </p>
        <p className="text-xs text-text-dim leading-relaxed">
          {isPdf
            ? "Extragerea din PDF este aproximativă. Liniile de factură nu au putut fi detectate automat. Completați manual toate câmpurile lipsă, în special liniile, partenerul și tipul tranzacției."
            : "Câmpurile au fost preluate din fișierul XML (UBL 2.1 / eFactura). Verificați partenerul, tipul tranzacției și liniile înainte de a salva factura."}
        </p>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function InvoiceUploadPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] =
    useState<Partial<InvoiceFormValues> | null>(null);
  const [parseSource, setParseSource] = useState<ParseSource>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      series: "FC",
      document_type: "TaxInvoice",
      currency: "RON",
      lines: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  useEffect(() => {
    (async () => {
      try {
        const partnerList = await partnerApi.getAll();
        setPartners(partnerList);
      } catch {
        toast("Eroare la încărcare parteneri.", "err");
      } finally {
        setLoadingPartners(false);
      }
    })();
  }, [toast]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploadedFile(file);
    setIsParsing(true);

    try {
      const { data, source } = await parseInvoiceFile(file);
      setParsedData(data);
      setParseSource(source);
      reset({ ...data, lines: data.lines ?? [] });
    } catch (err: any) {
      toast(err?.message ?? "Eroare la parsarea fișierului.", "err");
      setUploadedFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const onSubmit = async (values: InvoiceFormValues) => {
    try {
      const payload = {
        ...values,
        transaction_type: values.transaction_type || undefined,
        issuer_pf_id: values.issuer_pf_id || undefined,
        issuer_pj_id: values.issuer_pj_id || undefined,
        due_date: values.due_date || undefined,
        delivery_date: values.delivery_date || undefined,
        notes: values.notes || undefined,
        payment_terms: values.payment_terms || undefined,
        lines: values.lines.map((line) => ({
          ...line,
          product_code: line.product_code || undefined,
        })),
      };

      await invoiceApi.create(payload);
      toast("Factură încărcată și creată cu succes.", "ok");
      navigate("/invoices");
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ?? e?.response?.data ?? "Eroare la salvare.";
      toast(msg, "err");
    }
  };

  const calculateLine = (line: any) => {
    const qty = parseDecimal(line.quantity);
    const price = parseDecimal(line.unit_price);
    const disc = parseDecimal(line.discount_percent);
    const vatMul = VAT_RATES[line.vat_rate as VatRate]?.mul || 0;

    const subtotal = qty * price * (1 - disc / 100);
    const vat = subtotal * vatMul;
    return { subtotal, vat, total: subtotal + vat };
  };

  const lineTotals = fields.map((_, idx) => {
    const line = watch(`lines.${idx}` as const);
    return calculateLine(line);
  });

  const subtotal = lineTotals.reduce((sum, c) => sum + c.subtotal, 0);
  const totalVat = lineTotals.reduce((sum, c) => sum + c.vat, 0);
  const total = subtotal + totalVat;

  return (
    <AppLayout>
      <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Încarcă Factură"
          subtitle="Încarcă un fișier XML (eFactura UBL 2.1) sau PDF pentru a prelua datele în formularul de factură"
        />

        {/* Upload Section */}
        {!parsedData && (
          <EnhancedCard className="mb-8">
            <FileUpload
              accept=".xml,.ubl,.pdf"
              onChange={handleFileUpload}
              className="mb-4"
            >
              <div>
                <div className="text-4xl mb-4">📄</div>
                <p className="text-sm text-text-dim mb-2">
                  Trage fișierul aici sau apasă pentru a selecta
                </p>
                <p className="text-xs text-text-dim">
                  Formate acceptate: XML (eFactura UBL 2.1), PDF
                </p>
              </div>
            </FileUpload>

            {uploadedFile && (
              <div className="text-center mt-4">
                <p className="text-sm text-text-dim mb-2">
                  Fișier selectat:{" "}
                  <span className="text-white">{uploadedFile.name}</span>
                </p>
                {isParsing && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Spinner />
                    <span className="text-sm text-text-dim">
                      Se procesează fișierul...
                    </span>
                  </div>
                )}
              </div>
            )}
          </EnhancedCard>
        )}

        {/* Form Section */}
        {parsedData && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <ParseWarningBanner source={parseSource} />

            {/* Invoice Header */}
            <EnhancedCard title="Detalii Factură">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  label="Numărul facturii"
                  required
                  error={errors.number?.message}
                >
                  <Input {...register("number")} />
                </FormField>

                <FormField label="Serie" error={errors.series?.message}>
                  <Input {...register("series")} maxLength={20} />
                </FormField>

                <FormField
                  label="Monedă"
                  required
                  error={errors.currency?.message}
                >
                  <Select
                    {...register("currency")}
                    options={[
                      { value: "RON", label: "RON — Leu românesc" },
                      { value: "EUR", label: "EUR — Euro" },
                      { value: "USD", label: "USD — Dolar american" },
                    ]}
                  />
                </FormField>

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
                  label="Partener"
                  required
                  error={errors.partner_id?.message}
                >
                  {loadingPartners ? (
                    <div className="h-10 animate-pulse rounded bg-border" />
                  ) : (
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
                  )}
                </FormField>

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

                <FormField
                  label="Note"
                  error={errors.notes?.message}
                  className="lg:col-span-3"
                >
                  <Input {...register("notes")} />
                </FormField>
              </div>
            </EnhancedCard>

            {/* Invoice Lines */}
            <EnhancedCard title="Linii Factură">
              <div className="space-y-4">
                {fields.length === 0 && (
                  <p className="text-sm text-text-dim text-center py-4">
                    Nicio linie adăugată. Adăugați manual sau reîncărcați un
                    XML cu linii.
                  </p>
                )}

                {fields.map((field, idx) => {
                  const calc = lineTotals[idx];
                  return (
                    <div
                      key={field.id}
                      className="border border-border rounded-lg p-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-end">
                        <div className="lg:col-span-2">
                          <FormField
                            label="Descriere"
                            required
                            error={errors.lines?.[idx]?.description?.message}
                          >
                            <Input
                              {...register(`lines.${idx}.description`)}
                            />
                          </FormField>
                        </div>

                        <FormField
                          label="U.M."
                          required
                          error={errors.lines?.[idx]?.unit?.message}
                        >
                          <Input
                            {...register(`lines.${idx}.unit`)}
                            placeholder="buc"
                          />
                        </FormField>

                        <FormField
                          label="Cantitate"
                          required
                          error={errors.lines?.[idx]?.quantity?.message}
                        >
                          <Input
                            {...register(`lines.${idx}.quantity`)}
                            type="number"
                            step="0.01"
                          />
                        </FormField>

                        <FormField
                          label="Preț Unitar"
                          required
                          error={errors.lines?.[idx]?.unit_price?.message}
                        >
                          <Input
                            {...register(`lines.${idx}.unit_price`)}
                            type="number"
                            step="0.01"
                          />
                        </FormField>

                        <FormField
                          label="Disc. %"
                          error={errors.lines?.[idx]?.discount_percent?.message}
                        >
                          <Input
                            {...register(`lines.${idx}.discount_percent`)}
                            type="number"
                            step="0.01"
                          />
                        </FormField>

                        <FormField
                          label="TVA"
                          required
                          error={errors.lines?.[idx]?.vat_rate?.message}
                        >
                          <Select
                            {...register(`lines.${idx}.vat_rate`)}
                            options={Object.entries(VAT_RATES).map(
                              ([key, { label }]) => ({
                                value: key,
                                label,
                              }),
                            )}
                          />
                        </FormField>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <p className="text-sm font-mono text-text-dim">
                          Subtotal:{" "}
                          <span className="text-white">
                            {formatDecimal(calc?.subtotal ?? 0)} {watch("currency") || "RON"}
                          </span>
                          {" · "}TVA:{" "}
                          <span className="text-white">
                            {formatDecimal(calc?.vat ?? 0)}
                          </span>
                          {" · "}Total:{" "}
                          <span className="text-white font-semibold">
                            {formatDecimal(calc?.total ?? 0)}
                          </span>
                        </p>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => remove(idx)}
                        >
                          Șterge
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="secondary"
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
                >
                  + Adaugă linie
                </Button>
              </div>
            </EnhancedCard>

            {/* Totals */}
            <EnhancedCard title="Totaluri Calculate">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-text-dim">Subtotal (fără TVA)</p>
                  <p className="text-xl font-mono mt-1">
                    {formatDecimal(subtotal)} {watch("currency") || "RON"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-text-dim">TVA Total</p>
                  <p className="text-xl font-mono mt-1">
                    {formatDecimal(totalVat)} {watch("currency") || "RON"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-text-dim">Total cu TVA</p>
                  <p className="text-2xl font-mono font-bold mt-1">
                    {formatDecimal(total)} {watch("currency") || "RON"}
                  </p>
                </div>
              </div>
            </EnhancedCard>

            {/* Actions */}
            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setUploadedFile(null);
                  setParsedData(null);
                  setParseSource(null);
                  reset();
                }}
              >
                Încarcă alt fișier
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Salvează Factura
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
