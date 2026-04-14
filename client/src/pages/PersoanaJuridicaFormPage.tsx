import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { pjGetById, pjCreate, pjUpdate } from "../api/persoanaJuridica.api";
import { useToast } from "../components/ui/Toast";
import { AppLayout } from "../components/ui/AppLayout";
import { PageHeader, BtnPrimary } from "../components/ui/ui";

type F = {
  cod_fiscal: string;
  denumire: string;
  numar_de_inregistrare_in_registrul_comertului: string;
  an_infiintare: number;
  adresa_sediu_social: string;
  cod_postal: string;
  adresa_puncte_de_lucru: { v: string }[];
  iban: string;
  telefon: string;
  email: string;
  cod_caen_principal: string;
  coduri_caen_secundare: { v: string }[];
  numar_angajati: number;
  capital_social: number;
  stare: "Activa" | "Radiata" | "Suspendata" | "InInsolventa";
};

// ── Form Field ─────────────────────────────────────────────────────────────

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

// ── Input & Select Components ──────────────────────────────────────────────

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

export default function PersoanaJuridicaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const isEdit = !!id && id !== "new";

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<F>({
    defaultValues: {
      stare: "Activa",
      numar_angajati: 0,
      capital_social: 1,
      adresa_puncte_de_lucru: [],
      coduri_caen_secundare: [],
    },
  });

  const {
    fields: puncteF,
    append: addPunct,
    remove: rmPunct,
  } = useFieldArray({ control, name: "adresa_puncte_de_lucru" });
  const {
    fields: caenF,
    append: addCaen,
    remove: rmCaen,
  } = useFieldArray({ control, name: "coduri_caen_secundare" });

  useEffect(() => {
    if (!isEdit) return;
    pjGetById(id!)
      .then((r) =>
        reset({
          cod_fiscal: r.cod_fiscal,
          denumire: r.denumire,
          numar_de_inregistrare_in_registrul_comertului:
            r.numar_de_inregistrare_in_registrul_comertului,
          an_infiintare: r.an_infiintare,
          adresa_sediu_social: r.adresa_sediu_social,
          cod_postal: r.cod_postal ?? "",
          adresa_puncte_de_lucru: (r.adresa_puncte_de_lucru ?? []).map((v) => ({
            v,
          })),
          iban: r.iban,
          telefon: r.telefon ?? "",
          email: r.email ?? "",
          cod_caen_principal: r.cod_caen_principal,
          coduri_caen_secundare: (r.coduri_caen_secundare ?? []).map((v) => ({
            v,
          })),
          numar_angajati: r.numar_angajati,
          capital_social: r.capital_social,
          stare: r.stare,
        }),
      )
      .catch(() => {
        toast("Eroare la încărcare.", "err");
        navigate("/persoane-juridice");
      });
  }, [id, isEdit]);

  const onSubmit = async (v: F) => {
    const body = {
      ...v,
      cod_postal: v.cod_postal || null,
      telefon: v.telefon || null,
      email: v.email || null,
      adresa_puncte_de_lucru: v.adresa_puncte_de_lucru
        .map((x) => x.v)
        .filter(Boolean),
      coduri_caen_secundare: v.coduri_caen_secundare
        .map((x) => x.v)
        .filter(Boolean),
    };
    try {
      if (isEdit) {
        await pjUpdate(id!, body);
        toast("Persoană juridică actualizată cu succes.", "ok");
      } else {
        await pjCreate(body);
        toast("Persoană juridică creată cu succes.", "ok");
      }
      navigate("/persoane-juridice");
    } catch (e: any) {
      const errorMsg =
        e?.response?.data?.error ??
        e?.response?.data?.details ??
        "Eroare la salvare.";
      toast(errorMsg, "err");
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto fade-up">
        <PageHeader
          title={
            isEdit ? "Editare Persoană Juridică" : "Adaugare Persoană Juridică"
          }
          sub={isEdit ? `ID: ${id}` : undefined}
        />

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border p-8"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {/* ── Identificare ── */}
          <div
            className="mb-8 pb-8 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <h3
              className="text-sm font-semibold uppercase tracking-wider mb-6"
              style={{ color: "var(--text-dim)" }}
            >
              Identificare Entitate
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                label="CIF"
                required
                error={errors.cod_fiscal?.message}
              >
                <Input
                  {...register("cod_fiscal", { required: "Obligatoriu" })}
                  placeholder="RO12345678"
                />
              </FormField>

              <FormField
                label="Nr. Reg. Com."
                required
                error={
                  errors.numar_de_inregistrare_in_registrul_comertului?.message
                }
              >
                <Input
                  {...register(
                    "numar_de_inregistrare_in_registrul_comertului",
                    {
                      required: "Obligatoriu",
                    },
                  )}
                  placeholder="J40/1234/2020"
                />
              </FormField>
            </div>

            <FormField
              label="Denumire"
              required
              error={errors.denumire?.message}
            >
              <Input
                {...register("denumire", { required: "Obligatoriu" })}
                placeholder="S.R.L. Example Company"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                label="An înființare"
                required
                error={errors.an_infiintare?.message}
              >
                <Input
                  type="number"
                  {...register("an_infiintare", {
                    valueAsNumber: true,
                    required: "Obligatoriu",
                  })}
                />
              </FormField>

              <FormField label="Stare" required error={errors.stare?.message}>
                <Select
                  {...register("stare")}
                  options={[
                    { value: "Activa", label: "Activă" },
                    { value: "Radiata", label: "Radiată" },
                    { value: "Suspendata", label: "Suspendată" },
                    { value: "InInsolventa", label: "În insolvență" },
                  ]}
                />
              </FormField>
            </div>
          </div>

          {/* ── Adresă & Contact ── */}
          <div
            className="mb-8 pb-8 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <h3
              className="text-sm font-semibold uppercase tracking-wider mb-6"
              style={{ color: "var(--text-dim)" }}
            >
              Adresă & Contact
            </h3>

            <FormField
              label="Adresa sediu social"
              required
              error={errors.adresa_sediu_social?.message}
            >
              <Input
                {...register("adresa_sediu_social", {
                  required: "Obligatoriu",
                })}
                placeholder="Str. Principale, nr. 123"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField label="Cod Poștal" error={errors.cod_postal?.message}>
                <Input
                  {...register("cod_postal")}
                  placeholder="012345"
                  maxLength={6}
                />
              </FormField>

              <FormField label="Telefon" error={errors.telefon?.message}>
                <Input
                  {...register("telefon")}
                  placeholder="+40 700 000 000"
                  type="tel"
                />
              </FormField>
            </div>

            <FormField label="Email" error={errors.email?.message}>
              <Input
                type="email"
                {...register("email")}
                placeholder="contact@example.com"
              />
            </FormField>

            <FormField label="IBAN" required error={errors.iban?.message}>
              <Input
                {...register("iban", { required: "Obligatoriu" })}
                placeholder="ROXX XXXX XXXX XXXX XXXX XXXX"
                style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
              />
            </FormField>

            {/* Puncte de Lucru */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--text)" }}
                >
                  Puncte de lucru (sucursale)
                </label>
                <button
                  type="button"
                  onClick={() => addPunct({ v: "" })}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                  style={{
                    color: "var(--amber)",
                    borderColor: "var(--amber-dim)",
                  }}
                >
                  + Adaugă
                </button>
              </div>
              <div className="space-y-2">
                {puncteF.map((f, i) => (
                  <div key={f.id} className="flex gap-2">
                    <Input
                      {...register(`adresa_puncte_de_lucru.${i}.v`)}
                      placeholder="Adresa sucursale"
                    />
                    <button
                      type="button"
                      onClick={() => rmPunct(i)}
                      className="px-3 py-2 rounded-lg border transition-colors"
                      style={{
                        color: "var(--red)",
                        borderColor: "var(--red-dim)",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Activitate Economică ── */}
          <div
            className="mb-8 pb-8 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <h3
              className="text-sm font-semibold uppercase tracking-wider mb-6"
              style={{ color: "var(--text-dim)" }}
            >
              Activitate Economică
            </h3>

            <FormField
              label="Cod CAEN principal"
              required
              error={errors.cod_caen_principal?.message}
            >
              <Input
                {...register("cod_caen_principal", {
                  required: "Obligatoriu",
                })}
                placeholder="6201"
                maxLength={4}
              />
            </FormField>

            {/* Coduri CAEN secundare */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--text)" }}
                >
                  Coduri CAEN secundare
                </label>
                <button
                  type="button"
                  onClick={() => addCaen({ v: "" })}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                  style={{
                    color: "var(--amber)",
                    borderColor: "var(--amber-dim)",
                  }}
                >
                  + Adaugă
                </button>
              </div>
              <div className="space-y-2">
                {caenF.map((f, i) => (
                  <div key={f.id} className="flex gap-2">
                    <Input
                      {...register(`coduri_caen_secundare.${i}.v`)}
                      placeholder="Cod CAEN"
                      maxLength={4}
                    />
                    <button
                      type="button"
                      onClick={() => rmCaen(i)}
                      className="px-3 py-2 rounded-lg border transition-colors"
                      style={{
                        color: "var(--red)",
                        borderColor: "var(--red-dim)",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                label="Nr. angajați"
                required
                error={errors.numar_angajati?.message}
              >
                <Input
                  type="number"
                  min={0}
                  {...register("numar_angajati", { valueAsNumber: true })}
                />
              </FormField>

              <FormField
                label="Capital social (RON)"
                required
                error={errors.capital_social?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  {...register("capital_social", { valueAsNumber: true })}
                />
              </FormField>
            </div>
          </div>

          {/* ── Actions ── */}
          <div
            className="flex items-center gap-3 pt-6 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <BtnPrimary
              type="submit"
              loading={isSubmitting}
              disabled={!isDirty}
            >
              {isEdit ? "Actualizează" : "Crează"}
            </BtnPrimary>
            <button
              type="button"
              onClick={() => navigate("/persoane-juridice")}
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
      </div>
    </AppLayout>
  );
}
