import { useContext } from "react";
import { EntityContext } from "./EntityContext";

export function useEntity() {
  return useContext(EntityContext);
}
