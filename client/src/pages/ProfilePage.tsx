import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { proofApi, type PublicProfile } from "../api/proof.api";
import type { FiscalProof } from "../types";

function ProofCard({ proof }: { proof: FiscalProof }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(111,0,255,0.3)",
      }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="text-sm font-semibold font-mono"
            style={{ color: "#6F00FF" }}
          >
            {proof.period_from} → {proof.period_to}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(111,0,255,0.15)", color: "#6F00FF" }}
          >
            ZK Groth16
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(57,255,20,0.1)", color: "#39FF14", border: "1px solid rgba(57,255,20,0.2)" }}
          >
            ✓ Conform
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(57,255,20,0.06)", color: "#39FF14", border: "1px solid rgba(57,255,20,0.15)" }}
          >
            ✓ Ancorat pe Sepolia
          </span>
        </div>
        <a
          href={`https://sepolia.etherscan.io/tx/${proof.tx_hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono px-3 py-1.5 rounded-lg transition-all"
          style={{ background: "rgba(0,127,255,0.1)", color: "#007FFF", border: "1px solid rgba(0,127,255,0.25)" }}
        >
          Etherscan ↗
        </a>
      </div>

      <p className="mt-3 text-xs" style={{ color: "rgba(111,0,255,0.7)" }}>
        Dovadă criptografică Groth16: obligațiile fiscale sunt dovedite matematic fără a expune
        date financiare private.
      </p>

      <div className="mt-3 pt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
        <span>Bloc #{proof.block_number.toLocaleString("ro-RO")}</span>
        <span className="font-mono truncate" style={{ maxWidth: "200px" }}>{proof.proof_hash}</span>
        <span>{new Date(proof.anchored_at).toLocaleDateString("ro-RO")}</span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { fiscalCode } = useParams<{ fiscalCode: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fiscalCode) return;
    proofApi
      .getPublicProfile(fiscalCode)
      .then(setProfile)
      .catch(() => setError("Nicio dovadă găsită pentru acest cod fiscal."))
      .finally(() => setLoading(false));
  }, [fiscalCode]);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg, #0f172a)", color: "var(--text, #f1f5f9)" }}
    >
      <div className="w-full max-w-4xl mx-auto px-4 py-12 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <Link
            to="/"
            className="text-xs font-mono mb-6 inline-block"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            ← TaxChain
          </Link>
          <div
            className="rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-start gap-4 flex-wrap">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
                style={{ background: "rgba(57,255,20,0.12)", color: "#39FF14", border: "1px solid rgba(57,255,20,0.2)" }}
              >
                {loading ? "?" : (profile?.entity_name?.[0] ?? "?")}
              </div>
              <div className="flex-1 min-w-0">
                <h1
                  className="text-2xl font-bold font-display"
                  style={{ color: "#f1f5f9" }}
                >
                  {loading ? "Se încarcă..." : (profile?.entity_name ?? "Entitate necunoscută")}
                </h1>
                <p className="text-sm mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {fiscalCode} · {profile?.entity_type === "PF" ? "Persoană Fizică" : "Persoană Juridică"}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span
                    className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{ background: "rgba(57,255,20,0.1)", color: "#39FF14", border: "1px solid rgba(57,255,20,0.2)" }}
                  >
                    ✓ Profil public de conformitate fiscală
                  </span>
                  <span
                    className="text-xs px-3 py-1 rounded-full"
                    style={{ background: "rgba(0,127,255,0.1)", color: "#007FFF", border: "1px solid rgba(0,127,255,0.2)" }}
                  >
                    Ancorat pe Ethereum Sepolia
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About ZK */}
        <div
          className="rounded-xl px-5 py-4 mb-8 text-sm"
          style={{
            background: "rgba(111,0,255,0.06)",
            border: "1px solid rgba(111,0,255,0.2)",
            color: "rgba(111,0,255,0.8)",
          }}
        >
          <strong style={{ color: "#6F00FF" }}>Ce dovedesc aceste certificate?</strong>
          <p className="mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            Fiecare dovadă certifică că entitatea și-a declarat obligațiile fiscale (TVA, CAS, CASS,
            impozit pe venit/profit) pentru perioada indicată, ancorând un hash imutabil pe blockchain.
            Dovezile marcate <strong style={{ color: "#6F00FF" }}>ZK Groth16</strong> probează
            criptografic corectitudinea sumelor fără a expune facturile individuale.
          </p>
        </div>

        {/* Proofs */}
        {loading && (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.3)" }}>
            Se încarcă dovezile...
          </div>
        )}

        {error && (
          <div
            className="rounded-xl px-5 py-8 text-center"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
          >
            {error}
          </div>
        )}

        {profile && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                {profile.proofs.length} dovezi de conformitate
              </h2>
            </div>
            <div className="space-y-4">
              {profile.proofs.map((p) => (
                <ProofCard key={p.id} proof={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
