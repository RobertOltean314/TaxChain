import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { persoanaJuridicaSchema, type PersoanaJuridicaFormValues } from '../validation/schemas';
import { persoanaJuridicaApi } from '../api/persoanaJuridica.api';
import { AppLayout } from '../components/ui/AppLayout';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/useAuth';

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

// Dynamic array input (add/remove string items)
function ArrayField({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const add = () => onChange([...value, '']);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, v: string) => {
    const next = [...value];
    next[i] = v;
    onChange(next);
  };

  return (
    <div>
      <label className="input-label">{label}</label>
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              className="input-field"
              placeholder={placeholder}
              readOnly={readOnly}
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 w-8 h-9 flex items-center justify-center text-slate-500 hover:text-danger transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            type="button"
            onClick={add}
            className="text-xs text-brand hover:text-brand-dim transition-colors"
          >
            + Adaugă
          </button>
        )}
        {value.length === 0 && readOnly && (
          <span className="text-xs text-slate-500">—</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Form ─────────────────────────────────────────────────────────────────

export function PersoanaJuridicaFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isReadOnly = user?.role === 'Auditor';

  const [adresePuncteLucru, setAdresePuncteLucru] = useState<string[]>([]);
  const [codurCaenSecundare, setCodurCaenSecundare] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PersoanaJuridicaFormValues>({
    resolver: zodResolver(persoanaJuridicaSchema),
    defaultValues: { stare: 'Activa', numar_angajati: 0, capital_social: 1 },
  });

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const data = await persoanaJuridicaApi.getById(id);
        reset({
          cod_fiscal: data.cod_fiscal,
          denumire: data.denumire,
          numar_de_inregistrare_in_registrul_comertului:
            data.numar_de_inregistrare_in_registrul_comertului,
          an_infiintare: data.an_infiintare,
          adresa_sediu_social: data.adresa_sediu_social,
          cod_postal: data.cod_postal ?? '',
          iban: data.iban,
          telefon: data.telefon ?? '',
          email: data.email ?? '',
          cod_caen_principal: data.cod_caen_principal,
          numar_angajati: data.numar_angajati,
          capital_social: data.capital_social,
          stare: data.stare,
          wallet: data.wallet ?? '',
        });
        setAdresePuncteLucru(data.adresa_puncte_de_lucru ?? []);
        setCodurCaenSecundare(data.coduri_caen_secundare ?? []);
      } catch {
        toast('Eroare la încărcarea înregistrării', 'error');
        navigate('/persoane-juridice');
      }
    };
    load();
  }, [id, isEdit, reset, toast, navigate]);

  const onSubmit = async (values: PersoanaJuridicaFormValues) => {
    const payload = {
      ...values,
      adresa_puncte_de_lucru: adresePuncteLucru.filter(Boolean),
      coduri_caen_secundare: codurCaenSecundare.filter(Boolean),
    };
    try {
      if (isEdit) {
        await persoanaJuridicaApi.update(id, payload);
        toast('Înregistrare actualizată cu succes', 'success');
      } else {
        await persoanaJuridicaApi.create(payload);
        toast('Înregistrare creată cu succes', 'success');
      }
      navigate('/persoane-juridice');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la salvarea datelor';
      toast(msg, 'error');
    }
  };

  const e = errors;

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/persoane-juridice')}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Înapoi
          </button>
          <div>
            <h1 className="font-display text-2xl text-white">
              {isEdit ? 'Editare Persoană Juridică' : 'Persoană Juridică Nouă'}
            </h1>
            {isReadOnly && (
              <p className="text-xs text-warning mt-0.5">Vizualizare (mod auditor)</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Identificare */}
          <fieldset className="card p-5 space-y-4">
            <legend className="text-xs text-slate-500 uppercase tracking-wider mb-4 px-1">
              Identificare
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cod Fiscal (CIF)" error={e.cod_fiscal?.message} required>
                <input
                  {...register('cod_fiscal')}
                  className="input-field font-mono"
                  placeholder="12345678"
                  readOnly={isReadOnly}
                />
              </Field>
              <Field
                label="Nr. Registrul Comerțului"
                error={e.numar_de_inregistrare_in_registrul_comertului?.message}
                required
              >
                <input
                  {...register('numar_de_inregistrare_in_registrul_comertului')}
                  className="input-field font-mono"
                  placeholder="J40/123456/24"
                  readOnly={isReadOnly}
                />
              </Field>
            </div>
            <Field label="Denumire" error={e.denumire?.message} required>
              <input
                {...register('denumire')}
                className="input-field"
                placeholder="SC Exemplu SRL"
                readOnly={isReadOnly}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="An înființare" error={e.an_infiintare?.message} required>
                <input
                  {...register('an_infiintare', { valueAsNumber: true })}
                  type="number"
                  className="input-field"
                  placeholder="2010"
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Stare" error={e.stare?.message}>
                <select {...register('stare')} className="input-field" disabled={isReadOnly}>
                  <option value="Activa">Activă</option>
                  <option value="Radiata">Radiată</option>
                  <option value="Suspendata">Suspendată</option>
                  <option value="InInsolventa">În Insolvență</option>
                </select>
              </Field>
            </div>
          </fieldset>

          {/* Activitate */}
          <fieldset className="card p-5 space-y-4">
            <legend className="text-xs text-slate-500 uppercase tracking-wider mb-4 px-1">
              Activitate
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cod CAEN principal" error={e.cod_caen_principal?.message} required>
                <input
                  {...register('cod_caen_principal')}
                  className="input-field font-mono"
                  placeholder="6201"
                  maxLength={4}
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Nr. angajați" error={e.numar_angajati?.message} required>
                <input
                  {...register('numar_angajati', { valueAsNumber: true })}
                  type="number"
                  min={0}
                  className="input-field"
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Capital social (RON)" error={e.capital_social?.message} required>
                <input
                  {...register('capital_social', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  step="0.01"
                  className="input-field"
                  readOnly={isReadOnly}
                />
              </Field>
            </div>
            <ArrayField
              label="Coduri CAEN secundare"
              value={codurCaenSecundare}
              onChange={setCodurCaenSecundare}
              placeholder="6202"
              readOnly={isReadOnly}
            />
          </fieldset>

          {/* Contact & Adresă */}
          <fieldset className="card p-5 space-y-4">
            <legend className="text-xs text-slate-500 uppercase tracking-wider mb-4 px-1">
              Contact & Adresă
            </legend>
            <Field label="Adresă sediu social" error={e.adresa_sediu_social?.message} required>
              <input
                {...register('adresa_sediu_social')}
                className="input-field"
                placeholder="Str. Exemplu, nr. 1, București"
                readOnly={isReadOnly}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cod poștal" error={e.cod_postal?.message}>
                <input
                  {...register('cod_postal')}
                  className="input-field"
                  placeholder="010101"
                  maxLength={6}
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Telefon" error={e.telefon?.message}>
                <input
                  {...register('telefon')}
                  className="input-field"
                  placeholder="+40212345678"
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Email" error={e.email?.message}>
                <input
                  {...register('email')}
                  type="email"
                  className="input-field"
                  placeholder="contact@firma.ro"
                  readOnly={isReadOnly}
                />
              </Field>
            </div>
            <ArrayField
              label="Adrese puncte de lucru"
              value={adresePuncteLucru}
              onChange={setAdresePuncteLucru}
              placeholder="Str. Secundară, nr. 2, Cluj"
              readOnly={isReadOnly}
            />
          </fieldset>

          {/* Financiar */}
          <fieldset className="card p-5 space-y-4">
            <legend className="text-xs text-slate-500 uppercase tracking-wider mb-4 px-1">
              Financiar & Web3
            </legend>
            <Field label="IBAN" error={e.iban?.message} required>
              <input
                {...register('iban')}
                className="input-field font-mono"
                placeholder="RO49AAAA1B31007593840000"
                readOnly={isReadOnly}
              />
            </Field>
            <Field label="Adresă Wallet" error={e.wallet?.message}>
              <input
                {...register('wallet')}
                className="input-field font-mono text-xs"
                placeholder="0x... (opțional)"
                readOnly={isReadOnly}
              />
            </Field>
          </fieldset>

          {!isReadOnly && (
            <div className="flex items-center gap-3">
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                    Se salvează...
                  </span>
                ) : isEdit ? (
                  'Salvează modificările'
                ) : (
                  'Creează înregistrarea'
                )}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/persoane-juridice')}
              >
                Anulează
              </button>
            </div>
          )}
        </form>
      </div>
    </AppLayout>
  );
}
