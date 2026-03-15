import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { pfGetById, pfCreate, pfUpdate } from "../api/persoanaFizica.api";
import { useToast } from "../components/ui/Toast";
import { Card, FieldLabel, FieldError, inputCls, BtnPrimary, BtnGhost, BtnBack } from "../components/ui/ui";

type F = {
  cnp: string; nume: string; prenume: string; prenume_tata: string;
  data_nasterii: string; sex: "M" | "F"; adresa_domiciliu: string;
  cod_postal: string; iban: string; telefon: string; email: string;
  stare: "Activ" | "Inactiv" | "Suspendat";
};

export default function PersoanaFizicaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const isEdit = !!id && id !== "new";

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<F>({
    defaultValues: { sex: "M", stare: "Activ" },
  });

  useEffect(() => {
    if (!isEdit) return;
    pfGetById(id!).then((r) => reset({
      cnp: r.cnp, nume: r.nume, prenume: r.prenume,
      prenume_tata: r.prenume_tata ?? "",
      data_nasterii: r.data_nasterii, sex: r.sex,
      adresa_domiciliu: r.adresa_domiciliu,
      cod_postal: r.cod_postal ?? "", iban: r.iban,
      telefon: r.telefon ?? "", email: r.email ?? "",
      stare: r.stare,
    })).catch(() => { toast("Eroare la încărcare.", "err"); navigate("/persoane-fizice"); });
  }, [id, isEdit]);

  const onSubmit = async (v: F) => {
    const body = {
      ...v,
      prenume_tata: v.prenume_tata || null,
      cod_postal: v.cod_postal || null,
      telefon: v.telefon || null,
      email: v.email || null,
    };
    try {
      if (isEdit) { await pfUpdate(id!, body); toast("Actualizat.", "ok"); }
      else { await pfCreate(body); toast("Creat.", "ok"); }
      navigate("/persoane-fizice");
    } catch (e: any) {
      toast(e?.response?.data?.error ?? e?.response?.data ?? "Eroare la salvare.", "err");
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto fade-up">
      <BtnBack onClick={() => navigate("/persoane-fizice")} />
      <h1 className="font-display text-3xl mb-6" style={{ color: "var(--text)" }}>
        {isEdit ? "Editează persoană fizică" : "Persoană fizică nouă"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card title="Date personale">
          <div>
            <FieldLabel required>CNP</FieldLabel>
            <input {...register("cnp", { required: "Obligatoriu" })} className={inputCls(!!errors.cnp)} />
            <FieldError msg={errors.cnp?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Nume</FieldLabel>
              <input {...register("nume", { required: "Obligatoriu" })} className={inputCls(!!errors.nume)} />
              <FieldError msg={errors.nume?.message} />
            </div>
            <div>
              <FieldLabel required>Prenume</FieldLabel>
              <input {...register("prenume", { required: "Obligatoriu" })} className={inputCls(!!errors.prenume)} />
              <FieldError msg={errors.prenume?.message} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel>Prenume tată</FieldLabel>
              <input {...register("prenume_tata")} className={inputCls()} />
            </div>
            <div>
              <FieldLabel required>Data nașterii</FieldLabel>
              <input type="date" {...register("data_nasterii", { required: "Obligatoriu" })} className={inputCls(!!errors.data_nasterii)} />
              <FieldError msg={errors.data_nasterii?.message} />
            </div>
            <div>
              <FieldLabel>Sex</FieldLabel>
              <select {...register("sex")} className={inputCls()}>
                <option value="M">Masculin</option>
                <option value="F">Feminin</option>
              </select>
            </div>
          </div>
          <div>
            <FieldLabel>Stare</FieldLabel>
            <select {...register("stare")} className={inputCls()}>
              <option value="Activ">Activ</option>
              <option value="Inactiv">Inactiv</option>
              <option value="Suspendat">Suspendat</option>
            </select>
          </div>
        </Card>

        <Card title="Contact & financiar">
          <div>
            <FieldLabel required>Adresă domiciliu</FieldLabel>
            <input {...register("adresa_domiciliu", { required: "Obligatoriu" })} className={inputCls(!!errors.adresa_domiciliu)} />
            <FieldError msg={errors.adresa_domiciliu?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Cod poștal</FieldLabel>
              <input {...register("cod_postal")} className={inputCls()} maxLength={6} />
            </div>
            <div>
              <FieldLabel>Telefon</FieldLabel>
              <input {...register("telefon")} className={inputCls()} placeholder="+40721000000" />
            </div>
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <input type="email" {...register("email")} className={inputCls(!!errors.email)} />
            <FieldError msg={errors.email?.message} />
          </div>
          <div>
            <FieldLabel required>IBAN</FieldLabel>
            <input {...register("iban", { required: "Obligatoriu" })} className={inputCls(!!errors.iban)} placeholder="RO49AAAA1B31007593840000" />
            <FieldError msg={errors.iban?.message} />
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <BtnGhost onClick={() => navigate("/persoane-fizice")}>Anulează</BtnGhost>
          <BtnPrimary type="submit" loading={isSubmitting}>
            {isEdit ? "Salvează" : "Creează"}
          </BtnPrimary>
        </div>
      </form>
    </div>
  );
}
