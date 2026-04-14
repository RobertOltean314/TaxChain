import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../auth/useAuth";
import { authApi } from "../api/auth.api";
import { persoanaFizicaApi } from "../api/persoanaFizica.api";
import { persoanaJuridicaApi } from "../api/persoanaJuridica.api";
import { useToast } from "../components/ui/Toast";

// ── Form Value Types ───────────────────────────────────────────────────────
type PersoanaFizicaFormValues = {
  cnp: string;
  sex: "M" | "F";
  nume: string;
  prenume: string;
  data_nasterii: string;
  prenume_tata?: string;
  adresa_domiciliu: string;
  iban: string;
  cod_postal?: string;
  telefon?: string;
  email?: string;
  wallet?: string;
  stare?: string;
};

type PersoanaJuridicaFormValues = {
  cod_fiscal: string;
  numar_de_inregistrare_in_registrul_comertului: string;
  denumire: string;
  an_infiintare: number;
  cod_caen_principal: string;
  adresa_sediu_social: string;
  iban: string;
  capital_social: number;
  numar_angajati: number;
  telefon?: string;
  email?: string;
  cod_postal?: string;
  wallet?: string;
  stare?: string;
};

// ── Shared Field Component ───────────────────────────────────────────────────
function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="input-label">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="input-error">{error}</p>}
    </div>
  );
}

// ── Entity Picker ────────────────────────────────────────────────────────────
type EntityChoice = "pf" | "pj" | null;

function EntityPicker({
  value,
  onChange,
}: {
  value: EntityChoice;
  onChange: (v: EntityChoice) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[
        {
          key: "pf" as const,
          title: "Persoană Fizică / PFA",
          desc: "Freelancer, PFA, sau persoană fizică autorizată.",
          icon: "◈",
        },
        {
          key: "pj" as const,
          title: "Persoană Juridică",
          desc: "SRL, SA, ONG sau altă entitate juridică.",
          icon: "◆",
        },
      ].map(({ key, title, desc, icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`card p-5 text-left transition-all duration-150 hover:border-brand/40 ${
            value === key ? "border-brand bg-brand/5" : ""
          }`}
        >
          <div className="text-2xl mb-3 text-brand">{icon}</div>
          <p className="font-medium text-white text-sm mb-1">{title}</p>
          <p className="text-xs text-slate-400">{desc}</p>
        </button>
      ))}
    </div>
  );
}

// ── PF Form ──────────────────────────────────────────────────────────────────
function PFForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: PersoanaFizicaFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersoanaFizicaFormValues>({
    defaultValues: { stare: "Activ" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="CNP" error={errors.cnp?.message} required>
          <input
            {...register("cnp")}
            className="input-field font-mono"
            placeholder="1234567890123"
            maxLength={13}
          />
        </Field>

        <Field label="Sex" error={errors.sex?.message} required>
          <select {...register("sex")} className="input-field">
            <option value="">Selectați</option>
            <option value="M">Masculin</option>
            <option value="F">Feminin</option>
          </select>
        </Field>

        <Field label="Nume" error={errors.nume?.message} required>
          <input
            {...register("nume")}
            className="input-field"
            placeholder="Popescu"
          />
        </Field>

        <Field label="Prenume" error={errors.prenume?.message} required>
          <input
            {...register("prenume")}
            className="input-field"
            placeholder="Ion"
          />
        </Field>

        <Field
          label="Data nașterii"
          error={errors.data_nasterii?.message}
          required
        >
          <input
            {...register("data_nasterii")}
            type="date"
            className="input-field"
          />
        </Field>

        <Field label="Prenumele tatălui" error={errors.prenume_tata?.message}>
          <input
            {...register("prenume_tata")}
            className="input-field"
            placeholder="Gheorghe (opțional)"
          />
        </Field>
      </div>

      <Field
        label="Adresă domiciliu"
        error={errors.adresa_domiciliu?.message}
        required
      >
        <input
          {...register("adresa_domiciliu")}
          className="input-field"
          placeholder="Str. Exemplu, nr. 1, Cluj"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="IBAN" error={errors.iban?.message} required>
          <input
            {...register("iban")}
            className="input-field font-mono"
            placeholder="RO49AAAA1B31007593840000"
          />
        </Field>

        <Field label="Cod poștal" error={errors.cod_postal?.message}>
          <input
            {...register("cod_postal")}
            className="input-field"
            placeholder="400000"
            maxLength={6}
          />
        </Field>

        <Field label="Telefon" error={errors.telefon?.message}>
          <input
            {...register("telefon")}
            className="input-field"
            placeholder="+40712345678"
          />
        </Field>

        <Field label="Email" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            className="input-field"
            placeholder="ion@exemplu.ro"
          />
        </Field>
      </div>

      <Field label="Adresă Wallet (opțional)" error={errors.wallet?.message}>
        <input
          {...register("wallet")}
          className="input-field font-mono text-xs"
          placeholder="0x..."
        />
      </Field>

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Se creează contul..." : "Finalizează înregistrarea →"}
      </button>
    </form>
  );
}

// ── PJ Form ──────────────────────────────────────────────────────────────────
function PJForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: PersoanaJuridicaFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersoanaJuridicaFormValues>({
    defaultValues: { stare: "Activa", numar_angajati: 0, capital_social: 200 },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Cod Fiscal (CIF)"
          error={errors.cod_fiscal?.message}
          required
        >
          <input
            {...register("cod_fiscal")}
            className="input-field font-mono"
            placeholder="12345678"
          />
        </Field>

        <Field
          label="Nr. Registrul Comerțului"
          error={errors.numar_de_inregistrare_in_registrul_comertului?.message}
          required
        >
          <input
            {...register("numar_de_inregistrare_in_registrul_comertului")}
            className="input-field font-mono"
            placeholder="J40/123456/24"
          />
        </Field>
      </div>

      <Field label="Denumire" error={errors.denumire?.message} required>
        <input
          {...register("denumire")}
          className="input-field"
          placeholder="SC Exemplu SRL"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="An înființare"
          error={errors.an_infiintare?.message}
          required
        >
          <input
            {...register("an_infiintare", { valueAsNumber: true })}
            type="number"
            className="input-field"
            placeholder="2020"
          />
        </Field>

        <Field
          label="Cod CAEN principal"
          error={errors.cod_caen_principal?.message}
          required
        >
          <input
            {...register("cod_caen_principal")}
            className="input-field font-mono"
            placeholder="6201"
            maxLength={4}
          />
        </Field>
      </div>

      <Field
        label="Adresă sediu social"
        error={errors.adresa_sediu_social?.message}
        required
      >
        <input
          {...register("adresa_sediu_social")}
          className="input-field"
          placeholder="Str. Exemplu, nr. 1, Cluj"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="IBAN" error={errors.iban?.message} required>
          <input
            {...register("iban")}
            className="input-field font-mono"
            placeholder="RO49AAAA1B31007593840000"
          />
        </Field>

        <Field
          label="Capital social (RON)"
          error={errors.capital_social?.message}
          required
        >
          <input
            {...register("capital_social", { valueAsNumber: true })}
            type="number"
            min={1}
            step="0.01"
            className="input-field"
          />
        </Field>

        <Field
          label="Nr. angajați"
          error={errors.numar_angajati?.message}
          required
        >
          <input
            {...register("numar_angajati", { valueAsNumber: true })}
            type="number"
            min={0}
            className="input-field"
          />
        </Field>

        <Field label="Telefon" error={errors.telefon?.message}>
          <input
            {...register("telefon")}
            className="input-field"
            placeholder="+40212345678"
          />
        </Field>

        <Field label="Email" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            className="input-field"
            placeholder="contact@firma.ro"
          />
        </Field>

        <Field label="Cod poștal" error={errors.cod_postal?.message}>
          <input
            {...register("cod_postal")}
            className="input-field"
            placeholder="400000"
            maxLength={6}
          />
        </Field>
      </div>

      <Field label="Adresă Wallet (opțional)" error={errors.wallet?.message}>
        <input
          {...register("wallet")}
          className="input-field font-mono text-xs"
          placeholder="0x..."
        />
      </Field>

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Se creează contul..." : "Finalizează înregistrarea →"}
      </button>
    </form>
  );
}

// ── Main Onboarding Page ─────────────────────────────────────────────────────
export function OnboardingPage() {
  const [entityChoice, setEntityChoice] = useState<EntityChoice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { applyTokens } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePFSubmit = async (values: PersoanaFizicaFormValues) => {
    setIsSubmitting(true);
    try {
      const created = await persoanaFizicaApi.create(values);
      const tokens = await authApi.linkEntity({
        persoana_fizica_id: created.id,
      });

      applyTokens(tokens);

      // Fixed: simple string for success
      toast("Cont creat cu succes! Bun venit în TaxChain.");

      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Eroare la crearea contului";

      // Fixed: simple string for error (or use "Eroare: " + msg)
      toast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePJSubmit = async (values: PersoanaJuridicaFormValues) => {
    setIsSubmitting(true);
    try {
      const created = await persoanaJuridicaApi.create(values);
      const tokens = await authApi.linkEntity({
        persoana_juridica_id: created.id,
      });

      applyTokens(tokens);

      toast("Cont creat cu succes! Bun venit în TaxChain.");

      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Eroare la crearea contului";
      toast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <span className="font-display text-2xl text-white tracking-tight">
            Tax<span className="text-brand">Chain</span>
          </span>
          <h1 className="font-display text-3xl text-white mt-4 mb-2">
            Configurează-ți contul
          </h1>
          <p className="text-slate-400 text-sm">
            Spune-ne cu ce tip de entitate vei emite facturi. Poți actualiza
            aceste informații ulterior din profil.
          </p>
        </div>

        {!entityChoice && (
          <EntityPicker value={entityChoice} onChange={setEntityChoice} />
        )}

        {entityChoice && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setEntityChoice(null)}
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                ← Înapoi
              </button>
              <span className="text-slate-600 text-sm">
                {entityChoice === "pf"
                  ? "Persoană Fizică / PFA"
                  : "Persoană Juridică"}
              </span>
            </div>

            <div className="card p-6">
              {entityChoice === "pf" ? (
                <PFForm onSubmit={handlePFSubmit} isSubmitting={isSubmitting} />
              ) : (
                <PJForm onSubmit={handlePJSubmit} isSubmitting={isSubmitting} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
