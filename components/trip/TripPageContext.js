import { createContext, useContext } from "react";

export const TripPageContext = createContext(null);

export function useTripPage() {
  const ctx = useContext(TripPageContext);
  if (!ctx) {
    throw new Error("useTripPage must be used within TripPageContext.Provider");
  }
  if (process.env.NODE_ENV !== "production") {
    return new Proxy(ctx, {
      get(target, prop) {
        if (prop in target || typeof prop === "symbol") return target[prop];
        const key = String(prop);
        console.warn(
          `[useTripPage] "${key}" is not on the trip page context. ` +
            "Add it to useTripPageModel return, tripPageStaticApi.js, or run npm run sync:trip-page-return"
        );
        return undefined;
      },
    });
  }
  return ctx;
}
