import { useEffect, useState } from "react";

const TOAST_EVENT = "lst-toast";

export function showToast(message, type = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type } }));
}

export default function Toast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timeoutId;

    function handle(e) {
      const { message, type } = e.detail || {};
      if (!message) return;
      if (timeoutId) clearTimeout(timeoutId);
      setToast({ message, type: type || "success" });
      const ms =
        type === "error" && String(message || "").length > 120 ? 10000 : 4000;
      timeoutId = setTimeout(() => setToast(null), ms);
    }

    window.addEventListener(TOAST_EVENT, handle);
    return () => {
      window.removeEventListener(TOAST_EVENT, handle);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      className={`toast toast${toast.type === "error" ? "ToastError" : "ToastSuccess"}`}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}
