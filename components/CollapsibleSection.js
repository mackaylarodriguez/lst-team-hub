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
 * @param {boolean} [props.forceOpen] when true, keeps the panel open (e.g. while adding content)
 * @param {"default" | "slim"} [props.variant]
 */
export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  persistOpenKey,
  forceOpen = false,
  badge,
  rightSlot,
  children,
  className = "",
  style,
  variant = "default",
}) {
  const isSlim = variant === "slim";
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
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  useEffect(() => {
    if (!persistOpenKey || typeof window === "undefined") return;
    window.localStorage.setItem(persistOpenKey, open ? "1" : "0");
  }, [open, persistOpenKey]);
  const id = useId();
  const panelId = `${id}-panel`;
  const buttonId = `${id}-button`;
  const isOpen = forceOpen || open;

  const rootClassName = [className, isSlim ? "collapsibleSection collapsibleSectionSlim" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootClassName || undefined}
      style={
        isSlim
          ? style
          : {
              border: "1px solid rgba(47, 73, 147, 0.14)",
              borderRadius: 12,
              background: "#fff",
              overflow: "hidden",
              ...style,
            }
      }
    >
      <div
        className={isSlim ? "collapsibleSectionSlimHeader" : "collapsibleSectionDefaultHeader"}
        style={
          isSlim
            ? undefined
            : {
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: "var(--collapsible-header-bg, rgba(245, 241, 234, 0.45))",
              }
        }
      >
        <button
          id={buttonId}
          type="button"
          className={isSlim ? "collapsibleSectionSlimToggle" : "btn collapsibleSectionDefaultToggle"}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          style={
            isSlim
              ? undefined
              : {
                  flex: 1,
                  textAlign: "left",
                  display: "flex",
                  gap: 10,
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  font: "inherit",
                }
          }
        >
          <span
            className={isSlim ? "collapsibleSectionSlimChevron" : "collapsibleSectionDefaultChevron"}
            aria-hidden
            style={isSlim ? undefined : { flexShrink: 0 }}
          >
            {isOpen ? "\u25BC" : "\u25B6"}
          </span>
          <span
            className={isSlim ? "collapsibleSectionSlimTitleWrap" : "collapsibleSectionDefaultTitleWrap"}
            style={isSlim ? undefined : { flex: 1, minWidth: 0 }}
          >
            <span
              className={isSlim ? "collapsibleSectionSlimTitle" : "collapsibleSectionDefaultTitle"}
            >
              {title}
            </span>
            {subtitle ? (
              <span
                className={isSlim ? "collapsibleSectionSlimSubtitle small" : "small"}
                style={isSlim ? undefined : { display: "block", marginTop: 2, opacity: 0.85 }}
              >
                {subtitle}
              </span>
            ) : null}
          </span>
          {badge ? (
            <span className={isSlim ? "collapsibleSectionSlimBadge" : undefined} style={isSlim ? undefined : { flexShrink: 0 }}>
              {badge}
            </span>
          ) : null}
        </button>
        {rightSlot ? <div style={{ flexShrink: 0 }}>{rightSlot}</div> : null}
      </div>
      {isOpen ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className={isSlim ? "collapsibleSectionSlimPanel" : "collapsibleSectionDefaultPanel"}
          style={isSlim ? undefined : { padding: "12px 14px 14px" }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
