import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { entityApi } from "../api/entity.api";
import { useAuth } from "./useAuth";
import type { EntitySummary } from "../types";

const STORAGE_KEY_ID = "tc_entity_id";
const STORAGE_KEY_TYPE = "tc_entity_type";
const STORAGE_KEY_NAME = "tc_entity_name";
const STORAGE_KEY_FISCAL = "tc_entity_fiscal";

export interface ActiveEntity {
  id: string;
  type: "PF" | "PJ";
  name: string;
  fiscalCode: string;
}

interface EntityCtx {
  activeEntity: ActiveEntity | null;
  entities: EntitySummary[];
  isLoading: boolean;
  setActiveEntity: (entity: ActiveEntity | null) => void;
  refreshEntities: () => Promise<void>;
  removeEntity: (id: string) => Promise<void>;
  addEntity: (entityType: "PF" | "PJ", entityId: string) => Promise<void>;
}

export const EntityContext = createContext<EntityCtx>({} as EntityCtx);

function restoreFromStorage(): ActiveEntity | null {
  const id = localStorage.getItem(STORAGE_KEY_ID);
  const type = localStorage.getItem(STORAGE_KEY_TYPE) as "PF" | "PJ" | null;
  const name = localStorage.getItem(STORAGE_KEY_NAME);
  const fiscalCode = localStorage.getItem(STORAGE_KEY_FISCAL);
  if (id && type && name && fiscalCode) {
    return { id, type, name, fiscalCode };
  }
  return null;
}

function persistToStorage(entity: ActiveEntity | null) {
  if (entity) {
    localStorage.setItem(STORAGE_KEY_ID, entity.id);
    localStorage.setItem(STORAGE_KEY_TYPE, entity.type);
    localStorage.setItem(STORAGE_KEY_NAME, entity.name);
    localStorage.setItem(STORAGE_KEY_FISCAL, entity.fiscalCode);
  } else {
    [STORAGE_KEY_ID, STORAGE_KEY_TYPE, STORAGE_KEY_NAME, STORAGE_KEY_FISCAL].forEach(
      (k) => localStorage.removeItem(k),
    );
  }
}

export function EntityProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [activeEntity, setActiveEntityState] = useState<ActiveEntity | null>(
    restoreFromStorage,
  );
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshEntities = useCallback(async () => {
    try {
      const list = await entityApi.getMyEntities();
      setEntities(list);

      // If active entity was removed from the managed list, clear it.
      if (activeEntity) {
        const still = list.find((e) => e.entity_id === activeEntity.id);
        if (!still) {
          setActiveEntityState(null);
          persistToStorage(null);
        }
      }
    } catch {
      // Non-fatal — keep current state
    }
  }, [activeEntity]);

  useEffect(() => {
    // Wait for auth to settle before making any authenticated API calls.
    // Without this guard, unauthenticated mounts hit /entitate → 401 →
    // window.location.href="/login" → full page reload → infinite loop.
    if (authLoading) return;

    if (!user) {
      setEntities([]);
      setIsLoading(false);
      return;
    }

    // All roles use the accountant_entity table to manage their entities.
    refreshEntities().finally(() => setIsLoading(false));
  }, [user?.id, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveEntity = useCallback((entity: ActiveEntity | null) => {
    setActiveEntityState(entity);
    persistToStorage(entity);
  }, []);

  const addEntity = useCallback(
    async (entityType: "PF" | "PJ", entityId: string) => {
      await entityApi.addEntity(entityType, entityId);
      await refreshEntities();
    },
    [refreshEntities],
  );

  const removeEntity = useCallback(
    async (id: string) => {
      await entityApi.removeEntity(id);
      // If the removed entity was active, clear it
      const wasActive = entities.find(
        (e) => e.id === id && e.entity_id === activeEntity?.id,
      );
      if (wasActive) {
        setActiveEntity(null);
      }
      await refreshEntities();
    },
    [entities, activeEntity, setActiveEntity, refreshEntities],
  );

  return (
    <EntityContext.Provider
      value={{
        activeEntity,
        entities,
        isLoading,
        setActiveEntity,
        refreshEntities,
        removeEntity,
        addEntity,
      }}
    >
      {children}
    </EntityContext.Provider>
  );
}
