import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { partnerApi } from "../api/partner.api";
import { AppLayout } from "../components/ui/AppLayout";
import { Confirm } from "../components/ui/Confirm";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../auth/useAuth";
import type { Partner, PartnerType } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<PartnerType, string> = {
  Client: "Client",
  Furnizor: "Furnizor",
  Ambele: "Client & Furnizor",
};

const TYPE_CLASSES: Record<PartnerType, string> = {
  Client: "badge bg-brand/15 text-brand",
  Furnizor: "badge bg-accent/15 text-accent",
  Ambele: "badge bg-warning/15 text-warning",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PartnerType | "all">("all");
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user?.role !== "Auditor";

  const load = async () => {
    try {
      const data = await partnerApi.getAll();
      setPartners(data);
    } catch {
      toast("Eroare la încărcarea partenerilor");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return partners.filter((p) => {
      const matchesSearch =
        !q ||
        p.denumire.toLowerCase().includes(q) ||
        (p.cod_fiscal ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.oras ?? "").toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || p.tip === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [partners, search, typeFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await partnerApi.delete(deleteTarget.id);
      toast(`${deleteTarget.denumire} a fost șters`);
      setDeleteTarget(null);
      load();
    } catch {
      toast("Eroare la ștergere");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl text-white mb-1">Parteneri</h1>
            <p className="text-sm text-slate-400">
              {filtered.length} înregistrări
            </p>
          </div>
          {canEdit && (
            <Link to="/partners/new" className="btn-primary">
              + Partener nou
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="text"
            placeholder="Caută după denumire, CIF, email, oraș..."
            className="input-field max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-1">
            {(["all", "Client", "Furnizor", "Ambele"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-brand text-white"
                    : "bg-surface-raised text-slate-400 border border-surface-border hover:text-white"
                }`}
              >
                {t === "all" ? "Toți" : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {[
                    "Denumire",
                    "CIF",
                    "Tip",
                    "Oraș",
                    "Email",
                    "Telefon",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs text-slate-500 uppercase tracking-wider px-4 py-3 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-surface-border/50">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-surface-border rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      {search || typeFilter !== "all"
                        ? "Niciun partener corespunzător"
                        : "Niciun partener înregistrat. Adaugă primul!"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/partners/${p.id}`)}
                      className="border-b border-surface-border/50 hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        {p.denumire}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-xs">
                        {p.cod_fiscal ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={TYPE_CLASSES[p.tip]}>
                          {TYPE_LABELS[p.tip]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {p.oras ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {p.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {p.telefon ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {canEdit && (
                          <button
                            className="btn-danger py-1 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(p);
                            }}
                          >
                            Șterge
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Confirm
        isOpen={!!deleteTarget}
        title="Confirmare ștergere"
        message={
          deleteTarget
            ? `Ești sigur că vrei să ștergi partenerul "${deleteTarget.denumire}"? Facturile existente nu vor fi afectate.`
            : ""
        }
        confirmLabel="Șterge"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
