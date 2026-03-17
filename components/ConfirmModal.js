import { useEffect, useRef } from "react";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onCancel?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (open && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="appModalOverlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.45)",
        display: "grid",
        placeItems: "center",
        padding: 20,
        zIndex: 50,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div
        className="card pad confirmModalCard"
        style={{ width: "min(400px, 100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title" style={{ margin: "0 0 8px 0", fontSize: 18 }}>
          {title}
        </h2>
        <p id="confirm-modal-desc" className="small" style={{ margin: "0 0 20px 0", color: "var(--muted)" }}>
          {message}
        </p>
        <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
          <button
            ref={cancelRef}
            type="button"
            className="btn"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={variant === "danger" ? "btn btnDanger" : "btn btnPrimary"}
            onClick={() => onConfirm?.()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
