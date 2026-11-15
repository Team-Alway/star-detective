import type { ReactNode } from "react";

/** One recovery / help / status card (design 10 · Recovery, help and answer states). */
export default function StatePanel({
  label,
  title,
  children,
  actions,
  className = "",
  role,
}: {
  label: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <section className={`state-panel ${className}`} role={role}>
      <p className="state-label">{label}</p>
      <h2 className="state-title">{title}</h2>
      {children && <div className="state-body">{children}</div>}
      {actions && <div className="state-actions">{actions}</div>}
    </section>
  );
}

export function LoadingBar() {
  return (
    <div className="loading-bar" role="progressbar" aria-label="Fetching image" aria-busy="true">
      <div className="loading-bar-fill" />
    </div>
  );
}
