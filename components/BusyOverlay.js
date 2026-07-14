import { useEffect, useState } from "react";

const BUSY_EVENT = "lst-busy-overlay";

let busyActive = false;
/** @type {HTMLElement | null} */
let activeSaveControl = null;
let activeSaveOriginalHtml = "";
let activeSaveOriginalValue = "";
let activeSaveOriginalDisabled = false;
let activeSaveIsInput = false;
let restoreTimeoutId = null;

export function isBusyActive() {
  return busyActive;
}

function getControlLabel(el) {
  if (!el) return "";
  if (el.tagName === "INPUT") return String(el.value || "");
  return String(el.textContent || "").replace(/\s+/g, " ").trim();
}

function setControlLabel(el, label) {
  if (!el) return;
  if (el.tagName === "INPUT") {
    el.value = label;
    return;
  }
  el.textContent = label;
}

function rememberSaveControl(el) {
  if (!el) return;
  if (restoreTimeoutId) {
    clearTimeout(restoreTimeoutId);
    restoreTimeoutId = null;
  }
  if (activeSaveControl && activeSaveControl !== el) {
    restoreSaveControl();
  }
  activeSaveControl = el;
  activeSaveIsInput = el.tagName === "INPUT";
  activeSaveOriginalHtml = activeSaveIsInput ? "" : el.innerHTML;
  activeSaveOriginalValue = activeSaveIsInput ? String(el.value || "") : "";
  activeSaveOriginalDisabled = Boolean(el.disabled);
  el.dataset.lstSaveBusy = "1";
}

function restoreSaveControl() {
  const el = activeSaveControl;
  if (!el) return;
  if (el.dataset.lstSaveBusy === "1") {
    if (activeSaveIsInput) {
      el.value = activeSaveOriginalValue || "Save";
    } else if (activeSaveOriginalHtml) {
      el.innerHTML = activeSaveOriginalHtml;
    } else {
      el.textContent = "Save";
    }
    el.disabled = activeSaveOriginalDisabled;
  }
  delete el.dataset.lstSaveBusy;
  el.removeAttribute("aria-busy");
  activeSaveControl = null;
  activeSaveOriginalHtml = "";
  activeSaveOriginalValue = "";
}

function applySavingLabel(message) {
  const el = activeSaveControl;
  if (!el || el.dataset.lstSaveBusy !== "1") return false;
  setControlLabel(el, message || "Saving…");
  el.disabled = true;
  el.setAttribute("aria-busy", "true");
  return true;
}

function applySavedLabel(message) {
  const el = activeSaveControl;
  if (!el || el.dataset.lstSaveBusy !== "1") return false;
  const current = getControlLabel(el);
  // React may have already rewritten the button (e.g. Save → Edit).
  if (current && !/saving|deleting|adding/i.test(current)) {
    delete el.dataset.lstSaveBusy;
    el.removeAttribute("aria-busy");
    el.disabled = activeSaveOriginalDisabled;
    activeSaveControl = null;
    return false;
  }
  setControlLabel(el, message || "Saved");
  el.disabled = true;
  el.removeAttribute("aria-busy");
  if (restoreTimeoutId) clearTimeout(restoreTimeoutId);
  restoreTimeoutId = setTimeout(() => {
    restoreTimeoutId = null;
    restoreSaveControl();
  }, 1200);
  return true;
}

/**
 * Mark save in progress (updates the Save button when available).
 * @param {string} [message]
 */
export function showBusy(message = "Saving…") {
  if (typeof window === "undefined") return;
  busyActive = true;
  applySavingLabel(message);
  window.dispatchEvent(
    new CustomEvent(BUSY_EVENT, { detail: { mode: "busy", message: String(message || "Saving…") } })
  );
}

/**
 * Mark save complete (Save button → Saved, or a small chip).
 * @param {string} [message]
 * @param {number} [durationMs]
 */
export function showBusyDone(message = "Saved", durationMs = 1400) {
  if (typeof window === "undefined") return;
  busyActive = false;
  const usedButton = applySavedLabel(message);
  window.dispatchEvent(
    new CustomEvent(BUSY_EVENT, {
      detail: {
        mode: "done",
        message: String(message || "Saved"),
        durationMs: Number.isFinite(durationMs) ? durationMs : 1400,
        // Only show the floating chip when the button itself did not take "Saved".
        preferChip: !usedButton,
      },
    })
  );
}

/** Clear busy state and restore the Save button. */
export function hideBusy() {
  if (typeof window === "undefined") return;
  busyActive = false;
  if (restoreTimeoutId) {
    clearTimeout(restoreTimeoutId);
    restoreTimeoutId = null;
  }
  restoreSaveControl();
  window.dispatchEvent(new CustomEvent(BUSY_EVENT, { detail: { mode: "hide" } }));
}

/**
 * Run an async action with Saving → Saved feedback.
 * Errors clear busy state and rethrow (caller can toast).
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
  if (
    /\bsave\b/.test(label) &&
    (label.includes("note") ||
      label.includes("contact") ||
      label.includes("host") ||
      label.includes("url") ||
      label.includes("task"))
  ) {
    return true;
  }
  return false;
}

/**
 * Lightweight save feedback host (mount once in Shell).
 * Prefer in-button Saving… / Saved; use a small chip only when needed.
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
        restoreSaveControl();
        setState(null);
        failsafeTimeoutId = null;
      }, 25000);
    }

    function handle(e) {
      const { mode, message, durationMs, preferChip } = e.detail || {};
      clearTimers();
      if (mode === "hide" || !mode) {
        setState(null);
        return;
      }
      if (mode === "busy") {
        // Button already shows Saving…; keep a tiny non-blocking chip only as backup
        // when no save button was captured.
        if (!activeSaveControl) {
          setState({ mode: "busy", message: message || "Saving…" });
        } else {
          setState(null);
        }
        armFailsafe();
        return;
      }
      if (mode === "done") {
        if (preferChip) {
          setState({ mode: "done", message: message || "Saved" });
          doneTimeoutId = setTimeout(() => {
            setState(null);
            doneTimeoutId = null;
          }, durationMs ?? 1400);
        } else {
          setState(null);
        }
      }
    }

    function onSaveClick(e) {
      const control = e.target?.closest?.("button, input[type='submit'], input[type='button']");
      if (!isSaveActionControl(control)) return;
      rememberSaveControl(control);
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
  const isDone = state.mode === "done";

  return (
    <div
      className={`saveFeedbackChip${isDone ? " saveFeedbackChipDone" : ""}${
        isBusy ? " saveFeedbackChipBusy" : ""
      }`}
      role="status"
      aria-live="polite"
      aria-busy={isBusy}
    >
      {state.message}
    </div>
  );
}
