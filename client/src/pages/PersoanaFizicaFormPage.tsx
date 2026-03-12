import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { persoanaFizicaSchema, type PersoanaFizicaFormValues } from '../validation/schemas';
import { persoanaFizicaApi } from '../api/persoanaFizica.api';
import { AppLayout } from '../components/ui/AppLayout';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/useAuth';

// ─── Reusable field components ─────────────────────────────────────────────────

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

// ─── Main Form ─────────────────────────────────────────────────────────────────

export function PersoanaFizicaFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isReadOnly = user?.role === 'Auditor';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PersoanaFizicaFormValues>({
    resolver: zodResolver(persoanaFizicaSchema),
    defaultValues: { stare: 'Activ' },
  });

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const data = await persoanaFizicaApi.getById(id);
        reset({
          cnp: data.cnp,
          nume: data.nume,
          prenume: data.prenume,
          prenume_tata: data.prenume_tata ?? '',
          data_nasterii: data.data_nasterii,
          sex: data.sex,
          adresa_domiciliu: data.adresa_domiciliu,
          cod_postal: data.cod_postal ?? '',
          iban: data.iban,
          telefon: data.telefon ?? '',
          email: data.email ?? '',
          stare: data.stare,
          wallet: data.wallet ?? '',
        });
      } catch {
        toast('Eroare la încărcarea înregistrării', 'error');
        navigate('/persoane-fizice');
      }
    };
    load();
  }, [id, isEdit, reset, toast, navigate]);

  const onSubmit = async (values: PersoanaFizicaFormValues) => {
    try {
      if (isEdit) {
        await persoanaFizicaApi.update(id, values);
        toast('Înregistrare actualizată cu succes', 'success');
      } else {
        await persoanaFizicaApi.create(values);
        toast('Înregistrare creată cu succes', 'success');
      }
      navigate('/persoane-fizice');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Eroare la salvarea datelor';
      toast(msg, 'error');
    }
  };

  const e = errors;

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/persoane-fizice')}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Înapoi
          </button>
          <div>
            <h1 className="font-display text-2xl text-white">
              {isEdit ? 'Editare Persoană Fizică' : 'Persoană Fizică Nouă'}
            </h1>
            {isReadOnly && (
              <p className="text-xs text-warning mt-0.5">Vizualizare (mod auditor)</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Section: Identificare */}
          <fieldset className="card p-5 space-y-4">
            <legend className="text-xs text-slate-500 uppercase tracking-wider mb-4 px-1">
              Identificare
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="CNP" error={e.cnp?.message} required>
                <input
                  {...register('cnp')}
                  className="input-field"
                  placeholder="1234567890123"
                  maxLength={13}
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Sex" error={e.sex?.message} required>
                <select {...register('sex')} className="input-field" disabled={isReadOnly}>
                  <option value="">Selectați</option>
                  <option value="M">Masculin</option>
                  <option value="F">Feminin</option>
                </select>
              </Field>
              <Field label="Nume" error={e.nume?.message} required>
                <input
                  {...register('nume')}
                  className="input-field"
                  placeholder="Popescu"
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Prenume" error={e.prenume?.message} required>
                <input
                  {...register('prenume')}
                  className="input-field"
                  placeholder="Ion"
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Prenumele tatălui" error={e.prenume_tata?.message}>
                <input
                  {...register('prenume_tata')}
                  className="input-field"
                  placeholder="Gheorghe (opțional)"
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Data nașterii" error={e.data_nasterii?.message} required>
                <input
                  {...register('data_nasterii')}
                  type="date"
                  className="input-field"
                  readOnly={isReadOnly}
                />
              </Field>
            </div>
          </fieldset>

          {/* Section: Contact & Adresă */}
          <fieldset className="card p-5 space-y-4">
            <legend className="text-xs text-slate-500 uppercase tracking-wider mb-4 px-1">
              Contact & Adresă
            </legend>
            <Field label="Adresă domiciliu" error={e.adresa_domiciliu?.message} required>
              <input
                {...register('adresa_domiciliu')}
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
                  placeholder="+40712345678"
                  readOnly={isReadOnly}
                />
              </Field>
              <Field label="Email" error={e.email?.message}>
                <input
                  {...register('email')}
                  type="email"
                  className="input-field"
                  placeholder="ion@exemplu.ro"
                  readOnly={isReadOnly}
                />
              </Field>
            </div>
          </fieldset>

          {/* Section: Financiar */}
          <fieldset className="card p-5 space-y-4">
            <legend className="text-xs text-slate-500 uppercase tracking-wider mb-4 px-1">
              Financiar & Status
            </legend>
            <Field label="IBAN" error={e.iban?.message} required>
              <input
                {...register('iban')}
                className="input-field font-mono"
                placeholder="RO49AAAA1B31007593840000"
                readOnly={isReadOnly}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Stare" error={e.stare?.message}>
                <select {...register('stare')} className="input-field" disabled={isReadOnly}>
                  <option value="Activ">Activ</option>
                  <option value="Inactiv">Inactiv</option>
                  <option value="Suspendat">Suspendat</option>
                </select>
              </Field>
              <Field label="Adresă Wallet" error={e.wallet?.message}>
                <input
                  {...register('wallet')}
                  className="input-field font-mono text-xs"
                  placeholder="0x... (opțional)"
                  readOnly={isReadOnly}
                />
              </Field>
            </div>
          </fieldset>

          {/* Actions */}
          {!isReadOnly && (
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
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
                onClick={() => navigate('/persoane-fizice')}
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
