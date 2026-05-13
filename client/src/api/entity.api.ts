import { api } from "./axios";
import type { EntitySummary } from "../types";

export const entityApi = {
  getMyEntities(): Promise<EntitySummary[]> {
    return api.get("/entitate/mele").then((r) => r.data);
  },

  addEntity(entityType: "PF" | "PJ", entityId: string): Promise<EntitySummary> {
    return api
      .post("/entitate/adauga", { entity_type: entityType, entity_id: entityId })
      .then((r) => r.data);
  },

  removeEntity(id: string): Promise<void> {
    return api.delete(`/entitate/${id}`).then(() => undefined);
  },
};
