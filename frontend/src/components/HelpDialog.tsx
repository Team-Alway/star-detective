"use client";

import { useEffect, useRef } from "react";

export default function HelpDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="help-dialog"
      aria-labelledby="help-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="state-panel help-panel">
        <p className="state-label">FIRST VISIT &amp; HELP</p>
        <h2 id="help-title" className="state-title">
          What am I looking at?
        </h2>
        <ol className="state-body help-steps">
          <li>Compare the same patch at two times.</li>
          <li>Watch for a dot that changes position.</li>
          <li>Choose one of the two answers.</li>
        </ol>
        <div className="state-actions">
          <button type="button" className="btn btn-ghost btn-block" onClick={onClose} autoFocus>
            Got it
          </button>
        </div>
      </div>
    </dialog>
  );
}
