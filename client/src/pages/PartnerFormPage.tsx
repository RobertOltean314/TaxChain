import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { partnerApi, type PartnerPayload } from "../api/partner.api";
import { AppLayout } from "../components/ui/AppLayout";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../auth/useAuth";
import { FormField, Input, Select, Button } from "../components/ui/ui";
import type { PartnerType, EntityType } from "../types";

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
      <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
            <FormField label="Denumire" error={errors.denumire} required>
              <Input
                value={denumire}
                onChange={(e) => setDenumire(e.target.value)}
                placeholder="SC Exemplu SRL"
                readOnly={isReadOnly}
                error={!!errors.denumire}
              />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Tip entitate">
                <Select
                  value={tipEntitate}
                  onChange={(e) => setTipEntitate(e.target.value as EntityType)}
                  disabled={isReadOnly}
                  options={[
                    { value: "PersoanaJuridica", label: "Persoană Juridică" },
                    { value: "PersoanaFizica", label: "Persoană Fizică" },
                  ]}
                />
              </FormField>
              <FormField label="Relație">
                <Select
                  value={tip}
                  onChange={(e) => setTip(e.target.value as PartnerType)}
                  disabled={isReadOnly}
                  options={[
                    { value: "Client", label: "Client" },
                    { value: "Furnizor", label: "Furnizor" },
                    { value: "Ambele", label: "Client & Furnizor" },
                  ]}
                />
              </FormField>
              <FormField label="Cod Fiscal (CIF/CNP)">
                <Input
                  value={codFiscal}
                  onChange={(e) => setCodFiscal(e.target.value)}
                  className="font-mono"
                  placeholder="RO12345678"
                  readOnly={isReadOnly}
                />
              </FormField>
              <FormField label="Nr. Registrul Comerțului">
                <Input
                  value={nrRegCom}
                  onChange={(e) => setNrRegCom(e.target.value)}
                  className="font-mono"
                  placeholder="J40/123/2020"
                  readOnly={isReadOnly}
                />
              </FormField>
            </div>
          </div>

          {/* Contact */}
          <div className="card p-5 space-y-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Contact & Adresă
            </p>
            <FormField label="Adresă">
              <Input
                value={adresa}
                onChange={(e) => setAdresa(e.target.value)}
                placeholder="Str. Exemplu, nr. 1"
                readOnly={isReadOnly}
              />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Oraș">
                <Input
                  value={oras}
                  onChange={(e) => setOras(e.target.value)}
                  placeholder="Cluj-Napoca"
                  readOnly={isReadOnly}
                />
              </FormField>
              <FormField label="Cod poștal" error={errors.cod_postal}>
                <Input
                  value={codPostal}
                  onChange={(e) => setCodPostal(e.target.value)}
                  placeholder="400000"
                  maxLength={6}
                  readOnly={isReadOnly}
                  error={!!errors.cod_postal}
                />
              </FormField>
              <FormField label="Țară">
                <Input
                  value={tara}
                  onChange={(e) => setTara(e.target.value)}
                  readOnly={isReadOnly}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Email" error={errors.email}>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="contact@firma.ro"
                  readOnly={isReadOnly}
                  error={!!errors.email}
                />
              </FormField>
              <FormField label="Telefon">
                <Input
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                  placeholder="+40212345678"
                  readOnly={isReadOnly}
                />
              </FormField>
            </div>
          </div>

          {/* Financial */}
          <div className="card p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">
              Financiar
            </p>
            <FormField label="IBAN">
              <Input
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                className="font-mono"
                placeholder="RO49AAAA1B31007593840000"
                readOnly={isReadOnly}
              />
            </FormField>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {isEdit ? "Salvează modificările" : "Creează partenerul"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/partners")}
              >
                Anulează
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
