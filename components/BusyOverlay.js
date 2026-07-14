import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";

const BUSY_EVENT = "lst-busy-overlay";

let busyActive = false;

export function isBusyActive() {
  return busyActive;
}

/**
 * Show the centered busy overlay (spinner).
 * @param {string} [message]
 */
export function showBusy(message = "Saving…") {
  if (typeof window === "undefined") return;
  busyActive = true;
  window.dispatchEvent(
    new CustomEvent(BUSY_EVENT, { detail: { mode: "busy", message: String(message || "Saving…") } })
  );
}

/**
 * Show the done state briefly, then hide.
 * @param {string} [message]
 * @param {number} [durationMs]
 */
export function showBusyDone(message = "Saved", durationMs = 1000) {
  if (typeof window === "undefined") return;
  busyActive = false;
  window.dispatchEvent(
    new CustomEvent(BUSY_EVENT, {
      detail: {
        mode: "done",
        message: String(message || "Saved"),
        durationMs: Number.isFinite(durationMs) ? durationMs : 1000,
      },
    })
  );
}

/** Hide the overlay immediately. */
export function hideBusy() {
  if (typeof window === "undefined") return;
  busyActive = false;
  window.dispatchEvent(new CustomEvent(BUSY_EVENT, { detail: { mode: "hide" } }));
}

/**
 * Run an async action with Saving → Saved overlay.
 * Errors hide the overlay and rethrow (caller can toast).
 */
export async function withBusy(fn, { busy = "Saving…", done = "Saved" } = {}) {
  showBusy(busy);
  try {
    const result = await fn();
    showBusyDone(done);
    return result;
  } catch (error) {
    hideBusy();
    throw error;
  }
}

function isSaveActionControl(el) {
  if (!el || el.disabled) return false;
  const tag = el.tagName;
  if (tag !== "BUTTON" && !(tag === "INPUT" && (el.type === "submit" || el.type === "button"))) {
    return false;
  }
  const label = String(el.getAttribute("aria-label") || el.value || el.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!label) return false;
  if (label.includes("cancel") || label.includes("discard")) return false;
  if (label === "save" || label === "save changes" || label === "save record") return true;
  if (label.startsWith("save ") || label.endsWith(" save")) return true;
  if (/\bsave\b/.test(label) && (label.includes("note") || label.includes("contact") || label.includes("host") || label.includes("url") || label.includes("task"))) {
    return true;
  }
  return false;
}

/**
 * Centered busy / saved feedback overlay (mount once in Shell).
 * Also starts on Save-button clicks; pair with showToast success/error or showBusyDone/hideBusy.
 */
export default function BusyOverlay() {
  const [state, setState] = useState(null);

  useEffect(() => {
    let doneTimeoutId;
    let failsafeTimeoutId;

    function clearTimers() {
      if (doneTimeoutId) {
        clearTimeout(doneTimeoutId);
        doneTimeoutId = null;
      }
      if (failsafeTimeoutId) {
        clearTimeout(failsafeTimeoutId);
        failsafeTimeoutId = null;
      }
    }

    function armFailsafe() {
      if (failsafeTimeoutId) clearTimeout(failsafeTimeoutId);
      failsafeTimeoutId = setTimeout(() => {
        busyActive = false;
        setState(null);
        failsafeTimeoutId = null;
      }, 25000);
    }

    function handle(e) {
      const { mode, message, durationMs } = e.detail || {};
      clearTimers();
      if (mode === "hide" || !mode) {
        setState(null);
        return;
      }
      setState({ mode, message: message || (mode === "done" ? "Saved" : "Saving…") });
      if (mode === "busy") {
        armFailsafe();
      }
      if (mode === "done") {
        doneTimeoutId = setTimeout(() => {
          setState(null);
          doneTimeoutId = null;
        }, durationMs ?? 1000);
      }
    }

    function onSaveClick(e) {
      const control = e.target?.closest?.("button, input[type='submit'], input[type='button']");
      if (!isSaveActionControl(control)) return;
      showBusy("Saving…");
    }

    window.addEventListener(BUSY_EVENT, handle);
    document.addEventListener("click", onSaveClick, true);
    return () => {
      window.removeEventListener(BUSY_EVENT, handle);
      document.removeEventListener("click", onSaveClick, true);
      clearTimers();
    };
  }, []);

  if (!state) return null;

  const isBusy = state.mode === "busy";
  const isError = state.mode === "error";
  const isDone = state.mode === "done";

  return (
    <div className="busyOverlay" role="status" aria-live="polite" aria-busy={isBusy}>
      <div
        className={`busyOverlayCard${isError ? " busyOverlayCardError" : ""}${
          isDone ? " busyOverlayCardDone" : ""
        }`}
      >
        {isBusy ? <Spinner size={36} /> : null}
        {isDone ? (
          <div className="busyOverlayCheck" aria-hidden="true">
            ✓
          </div>
        ) : null}
        {isError ? (
          <div className="busyOverlayCheck busyOverlayCheckError" aria-hidden="true">
            !
          </div>
        ) : null}
        <div className="busyOverlayMessage">{state.message}</div>
      </div>
    </div>
  );
}
