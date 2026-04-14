import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { partnerApi, type PartnerPayload } from "../api/partner.api";
import { AppLayout } from "../components/ui/AppLayout";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../auth/useAuth";
import type { PartnerType, EntityType } from "../types";

// ── Field wrapper ─────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export function PartnerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isReadOnly = user?.role === "Auditor";

  // Form state
  const [denumire, setDenumire] = useState("");
  const [codFiscal, setCodFiscal] = useState("");
  const [nrRegCom, setNrRegCom] = useState("");
  const [tip, setTip] = useState<PartnerType>("Client");
  const [tipEntitate, setTipEntitate] =
    useState<EntityType>("PersoanaJuridica");
  const [adresa, setAdresa] = useState("");
  const [codPostal, setCodPostal] = useState("");
  const [oras, setOras] = useState("");
  const [tara, setTara] = useState("Romania");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [iban, setIban] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isEdit) return;
    partnerApi
      .getById(id)
      .then((p) => {
        setDenumire(p.denumire);
        setCodFiscal(p.cod_fiscal ?? "");
        setNrRegCom(p.numar_in_registrul_comertului ?? "");
        setTip(p.tip);
        setTipEntitate(p.tip_entitate);
        setAdresa(p.adresa ?? "");
        setCodPostal(p.cod_postal ?? "");
        setOras(p.oras ?? "");
        setTara(p.tara);
        setEmail(p.email ?? "");
        setTelefon(p.telefon ?? "");
        setIban(p.iban ?? "");
      })
      .catch(() => {
        toast("Eroare la încărcarea partenerului");
        navigate("/partners");
      })
      .finally(() => setIsLoading(false));
  }, [id, isEdit, navigate, toast]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!denumire.trim()) errs.denumire = "Denumirea este obligatorie";
    if (codPostal && !/^\d{6}$/.test(codPostal))
      errs.cod_postal = "Codul poștal trebuie să aibă 6 cifre";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Email invalid";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    const payload: PartnerPayload = {
      denumire: denumire.trim(),
      cod_fiscal: codFiscal.trim() || undefined,
      numar_in_registrul_comertului: nrRegCom.trim() || undefined,
      tip,
      tip_entitate: tipEntitate,
      adresa: adresa.trim() || undefined,
      cod_postal: codPostal.trim() || undefined,
      oras: oras.trim() || undefined,
      tara: tara.trim() || "Romania",
      email: email.trim() || undefined,
      telefon: telefon.trim() || undefined,
      iban: iban.trim() || undefined,
    };

    try {
      if (isEdit) {
        await partnerApi.update(id, payload);
        toast("Partener actualizat");
      } else {
        await partnerApi.create(payload);
        toast("Partener creat");
      }
      navigate("/partners");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Eroare la salvare");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/partners")}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Înapoi
          </button>
          <div>
            <h1 className="font-display text-2xl text-white">
              {isEdit ? "Editare partener" : "Partener nou"}
            </h1>
            {isReadOnly && (
              <p className="text-xs text-warning mt-0.5">
                Vizualizare (mod auditor)
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Identity */}
          <div className="card p-5 space-y-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Identificare
            </p>
            <Field label="Denumire" error={errors.denumire} required>
              <input
                value={denumire}
                onChange={(e) => setDenumire(e.target.value)}
                className="input-field"
                placeholder="SC Exemplu SRL"
                readOnly={isReadOnly}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tip entitate">
                <select
                  value={tipEntitate}
                  onChange={(e) => setTipEntitate(e.target.value as EntityType)}
                  className="input-field"
                  disabled={isReadOnly}
                >
                  <option value="PersoanaJuridica">Persoană Juridică</option>
                  <option value="PersoanaFizica">Persoană Fizică</option>
                </select>
              </Field>
              <Field label="Relație">
                <select
                  value={tip}
                  onChange={(e) => setTip(e.target.value as PartnerType)}
                  className="input-field"
                  disabled={isReadOnly}
                >
                  <option value="Client">Client</option>
                  <option value="Furnizor">Furnizor</option>
                  <option value="Ambele">Client & Furnizor</option>
                </select>
              </Field>
              <Field label="Cod Fiscal (CIF/CNP)">
                <input
                  value={codFiscal}
                  onChange={(e) => setCodFiscal(e.target.value)}
                  className="input-field font-mono"
                  placeholder="RO12345678"
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Nr. Registrul Comerțului">
                <input
                  value={nrRegCom}
                  onChange={(e) => setNrRegCom(e.target.value)}
                  className="input-field font-mono"
                  placeholder="J40/123/2020"
                  readOnly={isReadOnly}
                />
              </Field>
            </div>
          </div>

          {/* Contact */}
          <div className="card p-5 space-y-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Contact & Adresă
            </p>
            <Field label="Adresă">
              <input
                value={adresa}
                onChange={(e) => setAdresa(e.target.value)}
                className="input-field"
                placeholder="Str. Exemplu, nr. 1"
                readOnly={isReadOnly}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Oraș">
                <input
                  value={oras}
                  onChange={(e) => setOras(e.target.value)}
                  className="input-field"
                  placeholder="Cluj-Napoca"
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Cod poștal" error={errors.cod_postal}>
                <input
                  value={codPostal}
                  onChange={(e) => setCodPostal(e.target.value)}
                  className="input-field"
                  placeholder="400000"
                  maxLength={6}
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Țară">
                <input
                  value={tara}
                  onChange={(e) => setTara(e.target.value)}
                  className="input-field"
                  readOnly={isReadOnly}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" error={errors.email}>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="input-field"
                  placeholder="contact@firma.ro"
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Telefon">
                <input
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                  className="input-field"
                  placeholder="+40212345678"
                  readOnly={isReadOnly}
                />
              </Field>
            </div>
          </div>

          {/* Financial */}
          <div className="card p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">
              Financiar
            </p>
            <Field label="IBAN">
              <input
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                className="input-field font-mono"
                placeholder="RO49AAAA1B31007593840000"
                readOnly={isReadOnly}
              />
            </Field>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                    Se salvează...
                  </span>
                ) : isEdit ? (
                  "Salvează modificările"
                ) : (
                  "Creează partenerul"
                )}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate("/partners")}
              >
                Anulează
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
