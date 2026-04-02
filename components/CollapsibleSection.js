import { useEffect, useId, useState } from "react";

/**
 * Minimal expandable section with optional badge and right-side slot.
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {boolean} [props.defaultOpen]
 * @param {string} [props.persistOpenKey] localStorage key to remember open/closed ("1" / "0")
 * @param {import("react").ReactNode} [props.badge]
 * @param {import("react").ReactNode} [props.rightSlot]
 * @param {import("react").ReactNode} props.children
 * @param {string} [props.className]
 * @param {object} [props.style]
 */
export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  persistOpenKey,
  badge,
  rightSlot,
  children,
  className = "",
  style,
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    if (persistOpenKey) {
      const v = window.localStorage.getItem(persistOpenKey);
      if (v === "0") return false;
      if (v === "1") return true;
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (!persistOpenKey || typeof window === "undefined") return;
    window.localStorage.setItem(persistOpenKey, open ? "1" : "0");
  }, [open, persistOpenKey]);
  const id = useId();
  const panelId = `${id}-panel`;
  const buttonId = `${id}-button`;

  return (
    <div
      className={className}
      style={{
        border: "1px solid rgba(47, 73, 147, 0.14)",
        borderRadius: 12,
        background: "#fff",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "rgba(245, 241, 234, 0.45)",
        }}
      >
        <button
          id={buttonId}
          type="button"
          className="btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          style={{
            flex: 1,
            textAlign: "left",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            font: "inherit",
          }}
        >
          <span aria-hidden style={{ fontSize: 12, marginTop: 3, flexShrink: 0 }}>
            {open ? "\u25BC" : "\u25B6"}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 800, display: "block" }}>{title}</span>
            {subtitle ? (
              <span className="small" style={{ display: "block", marginTop: 2, opacity: 0.85 }}>
                {subtitle}
              </span>
            ) : null}
          </span>
          {badge ? <span style={{ flexShrink: 0 }}>{badge}</span> : null}
        </button>
        {rightSlot ? <div style={{ flexShrink: 0 }}>{rightSlot}</div> : null}
      </div>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={buttonId} style={{ padding: "12px 14px 14px" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
