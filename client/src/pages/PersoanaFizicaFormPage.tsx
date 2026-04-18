import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  persoanaFizicaSchema,
  type PersoanaFizicaFormValues,
} from "../validation";
import { persoanaFizicaApi } from "../api/persoanaFizica.api";
import { useToast } from "../components/ui/Toast";
import { AppLayout } from "../components/ui/AppLayout";
import {
  PageHeader,
  FormField,
  Input,
  Select,
  Button,
} from "../components/ui/ui";

export default function PersoanaFizicaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const isEdit = !!id && id !== "new";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PersoanaFizicaFormValues>({
    resolver: zodResolver(persoanaFizicaSchema),
    defaultValues: {
      sex: "M",
      stare: "Activ",
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const data = await persoanaFizicaApi.getById(id!);
        reset({
          cnp: data.cnp,
          nume: data.nume,
          prenume: data.prenume,
          prenume_tata: data.prenume_tata || undefined,
          data_nasterii: data.data_nasterii,
          sex: data.sex,
          adresa_domiciliu: data.adresa_domiciliu,
          cod_postal: data.cod_postal || undefined,
          iban: data.iban,
          telefon: data.telefon || undefined,
          email: data.email || undefined,
          stare: data.stare,
        });
      } catch (e: any) {
        toast("Eroare la încărcare.", "err");
        navigate("/persoane-fizice");
      }
    })();
  }, [id, isEdit, reset, navigate, toast]);

  const onSubmit = async (values: PersoanaFizicaFormValues) => {
    try {
      if (isEdit) {
        await persoanaFizicaApi.update(id!, values);
        toast("Persoană fizică actualizată cu succes.", "ok");
      } else {
        await persoanaFizicaApi.create(values);
        toast("Persoană fizică creată cu succes.", "ok");
      }
      navigate("/persoane-fizice");
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
      <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 fade-up">
        <PageHeader
          title={
            isEdit ? "Editare Persoană Fizică" : "Adaugare Persoană Fizică"
          }
          subtitle={isEdit ? `ID: ${id}` : undefined}
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
              Identificare Personală
            </h3>

            <FormField label="CNP" required error={errors.cnp?.message}>
              <Input
                {...register("cnp")}
                placeholder="1234567890123"
                maxLength={13}
                error={!!errors.cnp}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField label="Nume" required error={errors.nume?.message}>
                <Input
                  {...register("nume")}
                  placeholder="Acasă"
                  error={!!errors.nume}
                />
              </FormField>

              <FormField
                label="Prenume"
                required
                error={errors.prenume?.message}
              >
                <Input
                  {...register("prenume")}
                  placeholder="Ion"
                  error={!!errors.prenume}
                />
              </FormField>
            </div>

            <FormField
              label="Prenumele tatălui"
              error={errors.prenume_tata?.message}
            >
              <Input
                {...register("prenume_tata")}
                placeholder="Gheorghe"
                error={!!errors.prenume_tata}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                label="Data Nașterii"
                required
                error={errors.data_nasterii?.message}
              >
                <Input
                  {...register("data_nasterii")}
                  type="date"
                  error={!!errors.data_nasterii}
                />
              </FormField>

              <FormField label="Sexul" required error={errors.sex?.message}>
                <Select
                  {...register("sex")}
                  options={[
                    { value: "M", label: "Masculin" },
                    { value: "F", label: "Feminin" },
                  ]}
                  error={!!errors.sex}
                />
              </FormField>
            </div>
          </div>

          {/* ── Adresă ── */}
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
              label="Adresa Domiciliu"
              required
              error={errors.adresa_domiciliu?.message}
            >
              <Input
                {...register("adresa_domiciliu")}
                placeholder="Str. Principale, nr. 123, Apt. 45"
                error={!!errors.adresa_domiciliu}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField label="Cod Poștal" error={errors.cod_postal?.message}>
                <Input
                  {...register("cod_postal")}
                  placeholder="012345"
                  maxLength={6}
                  error={!!errors.cod_postal}
                />
              </FormField>

              <FormField label="Telefon" error={errors.telefon?.message}>
                <Input
                  {...register("telefon")}
                  placeholder="+40 700 000 000"
                  type="tel"
                  error={!!errors.telefon}
                />
              </FormField>
            </div>

            <FormField label="Email" error={errors.email?.message}>
              <Input
                {...register("email")}
                placeholder="ion.acasă@example.com"
                type="email"
                error={!!errors.email}
              />
            </FormField>
          </div>

          {/* ── Detalii Financiare ── */}
          <div
            className="mb-8 pb-8 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <h3
              className="text-sm font-semibold uppercase tracking-wider mb-6"
              style={{ color: "var(--text-dim)" }}
            >
              Detalii Financiare
            </h3>

            <FormField label="IBAN" required error={errors.iban?.message}>
              <Input
                {...register("iban")}
                placeholder="ROXX XXXX XXXX XXXX XXXX XXXX"
                className="font-mono"
                error={!!errors.iban}
              />
            </FormField>
          </div>

          {/* ── Stare ── */}
          <div className="mb-8">
            <h3
              className="text-sm font-semibold uppercase tracking-wider mb-6"
              style={{ color: "var(--text-dim)" }}
            >
              Status
            </h3>

            <FormField label="Stare" required error={errors.stare?.message}>
              <Select
                {...register("stare")}
                options={[
                  { value: "Activ", label: "Activ" },
                  { value: "Inactiv", label: "Inactiv" },
                  { value: "Suspendat", label: "Suspendat" },
                ]}
                error={!!errors.stare}
              />
            </FormField>
          </div>

          {/* ── Actions ── */}
          <div
            className="flex items-center gap-3 pt-6 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!isDirty}
            >
              {isEdit ? "Actualizează" : "Crează"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/persoane-fizice")}
              disabled={isSubmitting}
            >
              Anulează
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
