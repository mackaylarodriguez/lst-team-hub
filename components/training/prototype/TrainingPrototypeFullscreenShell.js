import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export default function TrainingPrototypeFullscreenShell({ title, subtitle, onClose, footer, children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="trainingPrototypeFullscreen" role="dialog" aria-modal="true" aria-label={title}>
      <div className="trainingPrototypeFullscreenTop">
        <button type="button" className="btn trainingPrototypeFullscreenClose" onClick={onClose}>
          Close
        </button>
        <div className="trainingPrototypeFullscreenHeading">
          {subtitle ? <div className="trainingPrototypeFullscreenEyebrow">{subtitle}</div> : null}
          <h2 className="trainingPrototypeFullscreenTitle">{title}</h2>
        </div>
      </div>

      <div className="trainingPrototypeFullscreenBody">{children}</div>

      {footer ? <div className="trainingPrototypeFullscreenFooter">{footer}</div> : null}
    </div>,
    document.body
  );
}
