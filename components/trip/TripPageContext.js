import { createContext, useContext } from "react";

export const TripPageContext = createContext(null);

export function useTripPage() {
  const ctx = useContext(TripPageContext);
  if (!ctx) {
    throw new Error("useTripPage must be used within TripPageContext.Provider");
  }
  return ctx;
}
