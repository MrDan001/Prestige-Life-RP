"use client";

import { useEffect, useRef, useState } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "accent";
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", tone = "accent", onConfirm, onClose }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => confirmRef.current?.focus(), 30);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-dialog-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="app-dialog" role="alertdialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message">
        <div className={"app-dialog-symbol " + tone} aria-hidden="true">{tone === "danger" ? "!" : "?"}</div>
        <div className="app-dialog-copy">
          <span className="app-dialog-eyebrow">PRESTIGE LIFE · CONFIRMATION</span>
          <h2 id="app-dialog-title">{title}</h2>
          <p id="app-dialog-message">{message}</p>
        </div>
        <div className="app-dialog-actions">
          <button type="button" className="app-dialog-cancel" onClick={onClose} disabled={busy}>Cancel</button>
          <button ref={confirmRef} type="button" className={"app-dialog-confirm " + tone} onClick={confirm} disabled={busy}>
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
