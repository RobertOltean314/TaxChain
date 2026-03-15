import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { partenerGetById, partenerCreate, partenerUpdate } from "../api/partener.api";
import { useToast } from "../components/ui/Toast";
import { Card, FieldLabel, FieldError, inputCls, BtnPrimary, BtnGhost, BtnBack } from "../components/ui/ui";
import type { PartnerRequest, PartnerTip, PartnerTipEntity } from "../types";

// Enum options matching Rust PartnerType and EntityType exactly
const TIP_OPTIONS: { value: PartnerTip; label: string }[] = [
  { value: "Client",   label: "Client" },
  { value: "Furnizor", label: "Furnizor" },
  { value: "Ambele",   label: "Client & Furnizor" },
];
const ENTITY_OPTIONS: { value: PartnerTipEntity; label: string }[] = [
  { value: "PersoanaJuridica", label: "Persoană Juridică" },
  { value: "PersoanaFizica",   label: "Persoană Fizică" },
];

export default function PartenerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const isEdit = !!id && id !== "nou";

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PartnerRequest>({
    defaultValues: { tip: "Client", tip_entitate: "PersoanaJuridica", tara: "Romania" },
  });

  useEffect(() => {
    if (!isEdit) return;
    partenerGetById(id!).then((p) => reset({
      denumire: p.denumire,
      cod_fiscal: p.cod_fiscal ?? "",
      numar_in_registrul_comertului: p.numar_in_registrul_comertului ?? "",
      tip: p.tip,
      tip_entitate: p.tip_entitate,
      adresa: p.adresa ?? "",
      cod_postal: p.cod_postal ?? "",
      oras: p.oras ?? "",
      tara: p.tara,
      email: p.email ?? "",
      telefon: p.telefon ?? "",
      iban: p.iban ?? "",
      persoana_fizica_id: p.persoana_fizica_id ?? undefined,
      persoana_juridica_id: p.persoana_juridica_id ?? undefined,
    })).catch(() => { toast("Eroare la încărcare.", "err"); navigate("/parteneri"); });
  }, [id, isEdit]);

  const onSubmit = async (v: PartnerRequest) => {
    // Normalise empty strings → null for all optional fields
    const body: PartnerRequest = {
      denumire: v.denumire,
      tip: v.tip,
      tip_entitate: v.tip_entitate,
      tara: (v.tara as string) || "Romania",
      cod_fiscal: (v.cod_fiscal as string) || null,
      numar_in_registrul_comertului: (v.numar_in_registrul_comertului as string) || null,
      adresa: (v.adresa as string) || null,
      cod_postal: (v.cod_postal as string) || null,
      oras: (v.oras as string) || null,
      email: (v.email as string) || null,
      telefon: (v.telefon as string) || null,
      iban: (v.iban as string) || null,
      persoana_fizica_id: v.persoana_fizica_id ?? null,
      persoana_juridica_id: v.persoana_juridica_id ?? null,
    };
    try {
      if (isEdit) { await partenerUpdate(id!, body); toast("Partener actualizat.", "ok"); }
      else { await partenerCreate(body); toast("Partener creat.", "ok"); }
      navigate("/parteneri");
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.response?.data?.details ?? "Eroare la salvare.";
      toast(typeof msg === "string" ? msg : "Eroare la salvare.", "err");
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto fade-up">
      <BtnBack onClick={() => navigate("/parteneri")} />
      <h1 className="font-display text-3xl mb-6" style={{ color: "var(--text)" }}>
        {isEdit ? "Editează partener" : "Partener nou"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card title="Identificare">
          <div>
            <FieldLabel required>Denumire</FieldLabel>
            <input {...register("denumire", { required: "Câmp obligatoriu" })} className={inputCls(!!errors.denumire)} placeholder="ex. SC Exemplu SRL" />
            <FieldError msg={errors.denumire?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Tip partener</FieldLabel>
              <select {...register("tip")} className={inputCls()}>
                {TIP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Tip entitate</FieldLabel>
              <select {...register("tip_entitate")} className={inputCls()}>
                {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>CIF / CNP</FieldLabel>
              <input {...register("cod_fiscal")} className={inputCls()} placeholder="ex. RO12345678" maxLength={20} />
            </div>
            <div>
              <FieldLabel>Nr. Reg. Com.</FieldLabel>
              <input {...register("numar_in_registrul_comertului")} className={inputCls()} placeholder="ex. J40/1234/2020" maxLength={20} />
            </div>
          </div>
        </Card>

        <Card title="Adresă & contact">
          <div>
            <FieldLabel>Adresă</FieldLabel>
            <input {...register("adresa")} className={inputCls()} placeholder="Str. Exemplu nr. 1" maxLength={300} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FieldLabel>Cod poștal</FieldLabel>
              <input {...register("cod_postal")} className={inputCls()} maxLength={6} />
            </div>
            <div>
              <FieldLabel>Oraș</FieldLabel>
              <input {...register("oras")} className={inputCls()} maxLength={100} />
            </div>
            <div>
              <FieldLabel>Țară</FieldLabel>
              <input {...register("tara")} className={inputCls()} placeholder="Romania" maxLength={100} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Email</FieldLabel>
              <input type="email" {...register("email")} className={inputCls(!!errors.email)} />
              <FieldError msg={errors.email?.message} />
            </div>
            <div>
              <FieldLabel>Telefon</FieldLabel>
              <input {...register("telefon")} className={inputCls()} maxLength={20} />
            </div>
          </div>
          <div>
            <FieldLabel>IBAN</FieldLabel>
            <input {...register("iban")} className={inputCls()} placeholder="RO49AAAA1B31007593840000" maxLength={34} />
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <BtnGhost onClick={() => navigate("/parteneri")}>Anulează</BtnGhost>
          <BtnPrimary type="submit" loading={isSubmitting}>
            {isEdit ? "Salvează" : "Creează partenerul"}
          </BtnPrimary>
        </div>
      </form>
    </div>
  );
}
