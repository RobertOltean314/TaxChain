import { AppLayout } from "../components/ui/AppLayout";

export function ReportsPage() {
  return (
    <AppLayout>
      <div className="p-8 max-w-2xl">
        <h1 className="font-display text-2xl text-white mb-2">Rapoarte</h1>
        <p className="text-slate-400 text-sm mb-8">
          Modulul de rapoarte fiscale va fi disponibil în faza următoare.
        </p>

        <div className="space-y-3">
          {[
            {
              title: "Registru TVA",
              desc: "TVA colectat și deductibil pe perioadă (trimestrial/lunar)",
              phase: "Faza 7",
            },
            {
              title: "Export D300",
              desc: "Decontul de TVA precomplet în format XML pentru import ANAF",
              phase: "Faza 7",
            },
            {
              title: "Export D394",
              desc: "Lista tranzacțiilor cu parteneri pentru declararea ANAF",
              phase: "Faza 7",
            },
            {
              title: "e-Factura (UBL 2.1)",
              desc: "Generare și trimitere XML conform specificațiilor ANAF",
              phase: "Faza 8",
            },
            {
              title: "Audit Trail on-chain",
              desc: "Ancore Sepolia și dovezi ZK pentru conformitate fiscală",
              phase: "Faza 10–11",
            },
          ].map(({ title, desc, phase }) => (
            <div
              key={title}
              className="card p-4 flex items-center gap-4 opacity-60"
            >
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
              </div>
              <span className="badge bg-surface-border text-slate-500 shrink-0">
                {phase}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
