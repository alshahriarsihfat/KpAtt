"use client";

import { usePortal } from "@/lib/client";

export function Toaster() {
  const { toasts } = usePortal();
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <span aria-hidden>
            {t.tone === "ok" ? "✓" : t.tone === "err" ? "!" : "i"}
          </span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
