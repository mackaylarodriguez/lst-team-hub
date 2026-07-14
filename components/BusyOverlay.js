import Spinner from "@/components/Spinner";

/**
 * Centered busy / saved feedback overlay.
 * @param {{ open: boolean, mode?: "busy" | "done" | "error", message?: string }} props
 */
export default function BusyOverlay({ open, mode = "busy", message = "Saving…" }) {
  if (!open) return null;

  const isBusy = mode === "busy";
  const isError = mode === "error";

  return (
    <div className="busyOverlay" role="status" aria-live="polite" aria-busy={isBusy}>
      <div
        className={`busyOverlayCard${isError ? " busyOverlayCardError" : ""}${
          mode === "done" ? " busyOverlayCardDone" : ""
        }`}
      >
        {isBusy ? <Spinner size={36} /> : null}
        {!isBusy && mode === "done" ? (
          <div className="busyOverlayCheck" aria-hidden="true">
            ✓
          </div>
        ) : null}
        {!isBusy && isError ? (
          <div className="busyOverlayCheck busyOverlayCheckError" aria-hidden="true">
            !
          </div>
        ) : null}
        <div className="busyOverlayMessage">{message}</div>
      </div>
    </div>
  );
}
