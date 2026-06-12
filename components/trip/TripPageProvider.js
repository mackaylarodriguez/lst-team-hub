import { useMemo } from "react";
import { TripPageContext } from "./TripPageContext";
import * as tripPageStaticApi from "./tripPageStaticApi";

/**
 * Merges hook state/handlers with static helpers so every consumer of useTripPage()
 * sees a single, complete API.
 */
export function TripPageProvider({ value, children }) {
  const merged = useMemo(() => ({ ...tripPageStaticApi, ...value }), [value]);
  return <TripPageContext.Provider value={merged}>{children}</TripPageContext.Provider>;
}
