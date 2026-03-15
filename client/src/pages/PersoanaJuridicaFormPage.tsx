import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { pjGetById, pjCreate, pjUpdate } from "../api/persoanaJuridica.api";
import { useToast } from "../components/ui/Toast";
import { Card, FieldLabel, FieldError, inputCls, BtnPrimary, BtnGhost, BtnBack } from "../components/ui/ui";

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

export default function PersoanaJuridicaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const isEdit = !!id && id !== "new";

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<F>({
    defaultValues: {
      stare: "Activa", numar_angajati: 0, capital_social: 1,
      adresa_puncte_de_lucru: [], coduri_caen_secundare: [],
    },
  });

  const { fields: puncteF, append: addPunct, remove: rmPunct } = useFieldArray({ control, name: "adresa_puncte_de_lucru" });
  const { fields: caenF,   append: addCaen,  remove: rmCaen  } = useFieldArray({ control, name: "coduri_caen_secundare" });

  useEffect(() => {
    if (!isEdit) return;
    pjGetById(id!).then((r) => reset({
      cod_fiscal: r.cod_fiscal,
      denumire: r.denumire,
      numar_de_inregistrare_in_registrul_comertului: r.numar_de_inregistrare_in_registrul_comertului,
      an_infiintare: r.an_infiintare,
      adresa_sediu_social: r.adresa_sediu_social,
      cod_postal: r.cod_postal ?? "",
      adresa_puncte_de_lucru: (r.adresa_puncte_de_lucru ?? []).map((v) => ({ v })),
      iban: r.iban,
      telefon: r.telefon ?? "",
      email: r.email ?? "",
      cod_caen_principal: r.cod_caen_principal,
      coduri_caen_secundare: (r.coduri_caen_secundare ?? []).map((v) => ({ v })),
      numar_angajati: r.numar_angajati,
      capital_social: r.capital_social,
      stare: r.stare,
    })).catch(() => { toast("Eroare la încărcare.", "err"); navigate("/persoane-juridice"); });
  }, [id, isEdit]);

  const onSubmit = async (v: F) => {
    const body = {
      ...v,
      cod_postal: v.cod_postal || null,
      telefon: v.telefon || null,
      email: v.email || null,
      adresa_puncte_de_lucru: v.adresa_puncte_de_lucru.map((x) => x.v).filter(Boolean),
      coduri_caen_secundare: v.coduri_caen_secundare.map((x) => x.v).filter(Boolean),
    };
    try {
      if (isEdit) { await pjUpdate(id!, body); toast("Actualizat.", "ok"); }
      else { await pjCreate(body); toast("Creat.", "ok"); }
      navigate("/persoane-juridice");
    } catch (e: any) {
      toast(e?.response?.data?.error ?? e?.response?.data ?? "Eroare la salvare.", "err");
    }
  };

  const DynList = ({ fields, onAdd, onRm, name, reg }: any) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <FieldLabel>{name}</FieldLabel>
        <button type="button" onClick={onAdd}
          className="text-xs font-mono" style={{ color: "var(--amber)" }}>+ adaugă</button>
      </div>
      <div className="space-y-2">
        {fields.map((f: any, i: number) => (
          <div key={f.id} className="flex gap-2">
            <input {...reg(i)} className={inputCls()} />
            <button type="button" onClick={() => onRm(i)}
              className="text-xs font-mono px-2 flex-shrink-0" style={{ color: "var(--red)" }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-2xl mx-auto fade-up">
      <BtnBack onClick={() => navigate("/persoane-juridice")} />
      <h1 className="font-display text-3xl mb-6" style={{ color: "var(--text)" }}>
        {isEdit ? "Editează persoană juridică" : "Persoană juridică nouă"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card title="Identificare">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>CIF</FieldLabel>
              <input {...register("cod_fiscal", { required: "Obligatoriu" })} className={inputCls(!!errors.cod_fiscal)} placeholder="RO12345678" />
              <FieldError msg={errors.cod_fiscal?.message} />
            </div>
            <div>
              <FieldLabel required>Nr. Reg. Com.</FieldLabel>
              <input {...register("numar_de_inregistrare_in_registrul_comertului", { required: "Obligatoriu" })}
                className={inputCls(!!errors.numar_de_inregistrare_in_registrul_comertului)}
                placeholder="J40/1234/2020" />
              <FieldError msg={errors.numar_de_inregistrare_in_registrul_comertului?.message} />
            </div>
          </div>
          <div>
            <FieldLabel required>Denumire</FieldLabel>
            <input {...register("denumire", { required: "Obligatoriu" })} className={inputCls(!!errors.denumire)} />
            <FieldError msg={errors.denumire?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>An înființare</FieldLabel>
              <input type="number" {...register("an_infiintare", { valueAsNumber: true, required: "Obligatoriu" })}
                className={inputCls(!!errors.an_infiintare)} />
              <FieldError msg={errors.an_infiintare?.message} />
            </div>
            <div>
              <FieldLabel>Stare</FieldLabel>
              <select {...register("stare")} className={inputCls()}>
                <option value="Activa">Activă</option>
                <option value="Radiata">Radiată</option>
                <option value="Suspendata">Suspendată</option>
                <option value="InInsolventa">În insolvență</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="Adresă & contact">
          <div>
            <FieldLabel required>Adresă sediu social</FieldLabel>
            <input {...register("adresa_sediu_social", { required: "Obligatoriu" })} className={inputCls(!!errors.adresa_sediu_social)} />
            <FieldError msg={errors.adresa_sediu_social?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Cod poștal</FieldLabel>
              <input {...register("cod_postal")} className={inputCls()} maxLength={6} />
            </div>
            <div>
              <FieldLabel>Telefon</FieldLabel>
              <input {...register("telefon")} className={inputCls()} />
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
          <DynList
            fields={puncteF}
            onAdd={() => addPunct({ v: "" })}
            onRm={rmPunct}
            name="Puncte de lucru"
            reg={(i: number) => register(`adresa_puncte_de_lucru.${i}.v`)}
          />
        </Card>

        <Card title="Activitate economică">
          <div>
            <FieldLabel required>Cod CAEN principal</FieldLabel>
            <input {...register("cod_caen_principal", { required: "Obligatoriu" })} className={inputCls(!!errors.cod_caen_principal)} placeholder="6201" maxLength={4} />
            <FieldError msg={errors.cod_caen_principal?.message} />
          </div>
          <DynList
            fields={caenF}
            onAdd={() => addCaen({ v: "" })}
            onRm={rmCaen}
            name="Coduri CAEN secundare"
            reg={(i: number) => register(`coduri_caen_secundare.${i}.v`)}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Nr. angajați</FieldLabel>
              <input type="number" min={0} {...register("numar_angajati", { valueAsNumber: true })} className={inputCls()} />
            </div>
            <div>
              <FieldLabel required>Capital social (RON)</FieldLabel>
              <input type="number" step="0.01" min="1" {...register("capital_social", { valueAsNumber: true })} className={inputCls()} />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <BtnGhost onClick={() => navigate("/persoane-juridice")}>Anulează</BtnGhost>
          <BtnPrimary type="submit" loading={isSubmitting}>
            {isEdit ? "Salvează" : "Creează"}
          </BtnPrimary>
        </div>
      </form>
    </div>
  );
}
