import { useState } from "react";
import { AppLayout } from "../components/ui/AppLayout";
import { useEntity } from "../auth/useEntity";
import { useToast } from "../components/ui/Toast";
import { Spinner } from "../components/ui/ui";
import type { EntitySummary } from "../types";
import { persoanaFizicaApi } from "../api/persoanaFizica.api";
import { persoanaJuridicaApi } from "../api/persoanaJuridica.api";
import type { PersoanaFizica, PersoanaJuridica } from "../types";

// ── Entity card ───────────────────────────────────────────────────────────────

function EntityCard({
  entity,
  isActive,
  onActivate,
  onRemove,
}: {
  entity: EntitySummary;
  isActive: boolean;
  onActivate: () => void;
  onRemove: () => void;
}) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove();
    setRemoving(false);
  };

  return (
    <div
      className="card p-5 fade-up transition-all duration-200"
      style={{
        border: isActive
          ? "2px solid var(--blue)"
          : "1px solid var(--border)",
        boxShadow: isActive ? "0 0 0 3px color-mix(in srgb, var(--blue) 20%, transparent)" : "var(--shadow-sm)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-mono px-2 py-0.5 rounded-full font-medium"
              style={
                entity.entity_type === "PF"
                  ? {
                      background: "color-mix(in srgb, var(--blue) 15%, transparent)",
                      color: "var(--blue)",
                    }
                  : {
                      background: "color-mix(in srgb, var(--green) 15%, transparent)",
                      color: "var(--green)",
                    }
              }
            >
              {entity.entity_type === "PF" ? "Persoană Fizică" : "Persoană Juridică"}
            </span>
            {isActive && (
              <span
                className="text-xs font-mono px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "color-mix(in srgb, var(--blue) 20%, transparent)",
                  color: "var(--blue)",
                }}
              >
                ✓ Activă
              </span>
            )}
          </div>
          <p
            className="font-display text-lg font-semibold truncate"
            style={{ color: "var(--text)" }}
          >
            {entity.name}
          </p>
          <p className="font-mono text-xs mt-1" style={{ color: "var(--text-dim)" }}>
            {entity.entity_type === "PF" ? "CNP" : "CIF"}: {entity.fiscal_code}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {!isActive && (
          <button
            type="button"
            onClick={onActivate}
            className="btn-primary text-sm py-1.5 px-4"
          >
            Selectează
          </button>
        )}
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors font-medium"
          style={{
            color: "var(--red)",
            border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)",
            background: "transparent",
          }}
        >
          {removing ? "..." : "Elimină"}
        </button>
      </div>
    </div>
  );
}

// ── Add entity modal ──────────────────────────────────────────────────────────

function AddEntityModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (type: "PF" | "PJ", id: string) => Promise<void>;
}) {
  const [entityType, setEntityType] = useState<"PF" | "PJ">("PJ");
  const [pfList, setPfList] = useState<PersoanaFizica[]>([]);
  const [pjList, setPjList] = useState<PersoanaJuridica[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadList = async (type: "PF" | "PJ") => {
    setListLoading(true);
    setSelectedId("");
    try {
      if (type === "PF") {
        const list = await persoanaFizicaApi.getAll();
        setPfList(list);
      } else {
        const list = await persoanaJuridicaApi.getAll();
        setPjList(list);
      }
      setLoaded(true);
    } catch {
      // ignore
    } finally {
      setListLoading(false);
    }
  };

  const handleTypeChange = (t: "PF" | "PJ") => {
    setEntityType(t);
    setLoaded(false);
    loadList(t);
  };

  const handleAdd = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await onAdd(entityType, selectedId);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Load PJ list on mount
  if (!loaded && !listLoading) {
    loadList(entityType);
  }

  const options =
    entityType === "PF"
      ? pfList.map((p) => ({ id: p.id, label: `${p.prenume} ${p.nume} (CNP: ${p.cnp})` }))
      : pjList.map((p) => ({ id: p.id, label: `${p.denumire} (CIF: ${p.cod_fiscal})` }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card modal-content w-full max-w-md p-6"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <h2
          className="font-display text-xl font-semibold mb-5"
          style={{ color: "var(--text)" }}
        >
          Adaugă entitate gestionată
        </h2>

        {/* Type tabs */}
        <div
          className="flex gap-1 p-1 rounded-lg mb-5"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          {(["PJ", "PF"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className="flex-1 py-2 rounded-md text-sm font-medium transition-all duration-150"
              style={
                entityType === t
                  ? { background: "var(--blue)", color: "#fff" }
                  : { color: "var(--text-dim)" }
              }
            >
              {t === "PF" ? "Persoană Fizică" : "Persoană Juridică"}
            </button>
          ))}
        </div>

        {/* Entity select */}
        {listLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="mb-5">
            <label
              className="block text-xs font-mono uppercase tracking-wider mb-2"
              style={{ color: "var(--text-dim)" }}
            >
              {entityType === "PF" ? "Persoană fizică" : "Persoană juridică"}
            </label>
            <select
              className="input w-full"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">— Selectează —</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {options.length === 0 && (
              <p className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>
                Nicio entitate disponibilă. Creează mai întâi o{" "}
                {entityType === "PF" ? "persoană fizică" : "persoană juridică"} din meniul de administrare.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Anulează
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedId || saving}
            className="btn-primary"
          >
            {saving ? "Se adaugă..." : "Adaugă"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function EntitiesPage() {
  const { entities, isLoading, activeEntity, setActiveEntity, addEntity, removeEntity } =
    useEntity();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);

  const handleActivate = (e: EntitySummary) => {
    setActiveEntity({
      id: e.entity_id,
      type: e.entity_type,
      name: e.name,
      fiscalCode: e.fiscal_code,
    });
    toast(`Entitate activă: ${e.name}`, "ok");
  };

  const handleRemove = async (e: EntitySummary) => {
    await removeEntity(e.id);
    toast(`${e.name} a fost eliminat din lista gestionată.`, "info");
  };

  const handleAdd = async (type: "PF" | "PJ", id: string) => {
    await addEntity(type, id);
    toast("Entitate adăugată cu succes.", "ok");
  };

  return (
    <AppLayout>
      <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 fade-up">
          <h1
            className="font-display text-2xl font-bold"
            style={{ color: "var(--text)" }}
          >
            Entități gestionate
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
            Selectează o entitate pentru a lucra în contextul acesteia. Toate
            facturile, partenerii și rapoartele vor fi filtrate per entitate.
          </p>
        </div>

        {/* Active entity banner */}
        {activeEntity && (
          <div
            className="rounded-xl px-5 py-4 mb-6 fade-up flex items-center gap-3"
            style={{
              background: "color-mix(in srgb, var(--blue) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--blue) 30%, transparent)",
              animationDelay: "40ms",
            }}
          >
            <div className="flex-1">
              <p className="text-xs font-mono uppercase tracking-wider mb-0.5" style={{ color: "var(--blue)" }}>
                Entitate activă curentă
              </p>
              <p className="font-semibold" style={{ color: "var(--text)" }}>
                {activeEntity.name}
              </p>
              <p className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>
                {activeEntity.type === "PF" ? "Persoană Fizică" : "SRL / Persoană Juridică"} ·{" "}
                {activeEntity.type === "PF" ? "CNP" : "CIF"}: {activeEntity.fiscalCode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveEntity(null)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-dim)", border: "1px solid var(--border)" }}
            >
              Dezactivează
            </button>
          </div>
        )}

        {/* Entity list */}
        {isLoading ? (
          <div className="card p-12 text-center">
            <Spinner />
          </div>
        ) : entities.length === 0 ? (
          <div className="card p-12 text-center fade-up" style={{ animationDelay: "80ms" }}>
            <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
              Nu ai nicio entitate gestionată încă.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn-primary"
            >
              + Adaugă prima entitate
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {entities.map((e, i) => (
                <div
                  key={e.id}
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  <EntityCard
                    entity={e}
                    isActive={activeEntity?.id === e.entity_id}
                    onActivate={() => handleActivate(e)}
                    onRemove={() => handleRemove(e)}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn-secondary"
            >
              + Adaugă entitate
            </button>
          </>
        )}
      </div>

      {showModal && (
        <AddEntityModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}
    </AppLayout>
  );
}
