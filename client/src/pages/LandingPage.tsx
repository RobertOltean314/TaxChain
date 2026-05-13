import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { publicApi, type PublicEntitySummary } from "../api/public.api";

// Palette constants
const BLUE = "#007FFF";
const INDIGO = "#6F00FF";
const GREEN = "#39FF14";
const BLUE_BG = "rgba(0,127,255,0.12)";
const INDIGO_BG = "rgba(111,0,255,0.12)";
const GREEN_BG = "rgba(57,255,20,0.1)";
const TEXT = "#E8F0FF";
const TEXT_DIM = "rgba(232,240,255,0.35)";
const TEXT_FAINT = "rgba(232,240,255,0.22)";
const SURFACE = "rgba(232,240,255,0.03)";
const BORDER = "rgba(232,240,255,0.08)";
const BORDER_HI = "rgba(0,127,255,0.4)";

function EntityCard({ entity }: { entity: PublicEntitySummary }) {
  const hasProofs = entity.proof_count > 0;
  const isPJ = entity.entity_type === "PJ";
  return (
    <Link
      to={`/profil/${entity.fiscal_code}`}
      className="block rounded-2xl p-4 transition-all"
      style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      onMouseEnter={(e) => (e.currentTarget.style.border = `1px solid ${BORDER_HI}`)}
      onMouseLeave={(e) => (e.currentTarget.style.border = `1px solid ${BORDER}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate" style={{ color: TEXT }}>
            {entity.name}
          </p>
          <p className="text-xs font-mono mt-0.5" style={{ color: TEXT_DIM }}>
            {entity.fiscal_code}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-mono"
            style={{
              background: isPJ ? BLUE_BG : INDIGO_BG,
              color: isPJ ? BLUE : INDIGO,
            }}
          >
            {isPJ ? "Persoană Juridică" : "Persoană Fizică"}
          </span>
          {hasProofs ? (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: GREEN_BG, color: GREEN }}
            >
              ✓ {entity.proof_count} {entity.proof_count === 1 ? "dovadă" : "dovezi"}
            </span>
          ) : (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.05)", color: TEXT_FAINT }}
            >
              Fără dovezi
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

const PAGE_SIZE = 20;

export default function LandingPage() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<PublicEntitySummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    publicApi
      .listEntities()
      .then(setEntities)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entities;
    return entities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.fiscal_code.toLowerCase().includes(q),
    );
  }, [entities, query]);

  // Reset to first page whenever the query or dataset changes
  useEffect(() => { setPage(1); }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const withProofs = entities.filter((e) => e.proof_count > 0).length;

  return (
    <div className="min-h-screen" style={{ background: "#060B18", color: TEXT }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 border-b"
        style={{
          background: "rgba(6,11,24,0.88)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(27,42,69,0.9)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="font-display text-xl tracking-tight">
            Tax<span style={{ color: BLUE }}>Chain</span>
          </span>
          <button
            onClick={() => navigate("/login")}
            className="text-sm px-4 py-1.5 rounded-lg font-medium transition-all"
            style={{ background: BLUE_BG, color: BLUE, border: `1px solid rgba(0,127,255,0.3)` }}
          >
            Autentificare
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div
          className="inline-block text-xs font-mono px-3 py-1 rounded-full mb-6"
          style={{ background: INDIGO_BG, color: INDIGO, border: `1px solid rgba(111,0,255,0.3)` }}
        >
          Blockchain · ZK Proofs · Conformitate Fiscală
        </div>
        <h1
          className="text-4xl sm:text-5xl font-bold font-display tracking-tight mb-5"
          style={{ lineHeight: 1.15 }}
        >
          Conformitate fiscală{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${BLUE}, ${INDIGO})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            verificabilă public
          </span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: TEXT_DIM }}>
          TaxChain ancorează dovezile de plată a impozitelor pe blockchain Ethereum.
          Oricine poate verifica dacă o entitate și-a declarat obligațiile fiscale —
          fără a vedea date financiare private.
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-8 mt-10">
          {[
            { value: entities.length, label: "Entități înregistrate", color: BLUE },
            { value: withProofs, label: "Entități cu dovezi", color: GREEN },
            { value: "Sepolia", label: "Rețea blockchain", color: INDIGO },
          ].map(({ value, label, color }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold font-display" style={{ color }}>
                {value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: TEXT_DIM }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="border-y" style={{ borderColor: "rgba(27,42,69,0.9)" }}>
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: "⛓",
              title: "Ancorat pe Ethereum",
              desc: "Fiecare dovadă de conformitate fiscală este înregistrată imutabil pe Sepolia testnet. Hash-ul nu poate fi modificat retroactiv.",
              color: BLUE,
              bg: BLUE_BG,
            },
            {
              icon: "🔐",
              title: "ZK Groth16 Privacy",
              desc: "Dovezile ZK probează matematic că obligațiile fiscale sunt corecte, fără a expune facturile individuale sau sumele detaliate.",
              color: INDIGO,
              bg: INDIGO_BG,
            },
            {
              icon: "✓",
              title: "Verificare instantă",
              desc: "Partenerii de business sau autoritățile pot verifica conformitatea oricărei entități în timp real, fără intermediari.",
              color: GREEN,
              bg: GREEN_BG,
            },
          ].map(({ icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="rounded-2xl p-6"
              style={{ background: bg, border: `1px solid ${color}22` }}
            >
              <span className="text-2xl mb-3 block">{icon}</span>
              <h3 className="font-semibold mb-2 text-sm" style={{ color }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: TEXT_DIM }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2
          className="text-xl font-semibold font-display mb-2 text-center"
          style={{ color: TEXT }}
        >
          Caută entitate
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: TEXT_DIM }}>
          Introduceți numele sau codul fiscal al entității
        </p>

        <div className="relative mb-6">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
            style={{ color: TEXT_FAINT }}
          >
            ⌕
          </span>
          <input
            autoFocus
            type="text"
            placeholder="ex. Exemplu SRL sau RO12345678"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: "rgba(27,42,69,0.5)",
              border: `1px solid rgba(27,42,69,0.9)`,
              color: TEXT,
            }}
            onFocus={(e) => (e.currentTarget.style.border = `1px solid ${BLUE_BG.replace("0.12", "0.6")}`)}
            onBlur={(e) => (e.currentTarget.style.border = "1px solid rgba(27,42,69,0.9)")}
          />
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm" style={{ color: TEXT_FAINT }}>
            Se încarcă entitățile...
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-10 text-sm rounded-2xl"
            style={{ color: TEXT_DIM, background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            {query
              ? `Nicio entitate găsită pentru „${query}"`
              : "Nicio entitate înregistrată în sistem."}
          </div>
        ) : (
          <>
            <p className="text-xs mb-3" style={{ color: TEXT_FAINT }}>
              {filtered.length} {filtered.length === 1 ? "entitate" : "entități"} găsite
              {totalPages > 1 && ` · Pagina ${page} din ${totalPages}`}
            </p>
            <div className="space-y-2">
              {paginated.map((e) => (
                <EntityCard key={e.fiscal_code} entity={e} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-xs px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-30"
                  style={{ background: BLUE_BG, color: BLUE, border: `1px solid rgba(0,127,255,0.25)` }}
                >
                  ← Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                    .reduce<(number | "…")[]>((acc, n, i, arr) => {
                      if (i > 0 && (n as number) - (arr[i - 1] as number) > 1) acc.push("…");
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, i) =>
                      n === "…" ? (
                        <span key={`ellipsis-${i}`} className="text-xs px-1" style={{ color: TEXT_FAINT }}>…</span>
                      ) : (
                        <button
                          key={n}
                          onClick={() => setPage(n as number)}
                          className="text-xs w-7 h-7 rounded-lg font-medium transition-all"
                          style={
                            page === n
                              ? { background: BLUE, color: "#fff" }
                              : { background: SURFACE, color: TEXT_DIM, border: `1px solid ${BORDER}` }
                          }
                        >
                          {n}
                        </button>
                      )
                    )}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-xs px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-30"
                  style={{ background: BLUE_BG, color: BLUE, border: `1px solid rgba(0,127,255,0.25)` }}
                >
                  Următor →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer
        className="border-t py-8 text-center text-xs"
        style={{ borderColor: "rgba(27,42,69,0.9)", color: TEXT_FAINT }}
      >
        TaxChain · Proiect de licență · Conformitate fiscală pe blockchain ·{" "}
        <Link to="/login" style={{ color: `rgba(0,127,255,0.7)` }}>
          Autentificare
        </Link>
      </footer>
    </div>
  );
}
