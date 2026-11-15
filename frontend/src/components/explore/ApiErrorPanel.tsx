"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/sky";

/**
 * Friendly failure state. A 503 means NASA's IRSA archive is down: count down
 * `retry_after` seconds, then retry automatically (the button retries now).
 */
export default function ApiErrorPanel({
  error,
  onRetry,
  what = "this patch of sky",
}: {
  error: unknown;
  onRetry: () => void;
  what?: string;
}) {
  const api = error instanceof ApiError ? error : null;
  const down = api?.status === 503;
  const [remaining, setRemaining] = useState(down ? Math.max(1, Math.round(api?.retryAfter ?? 30)) : 0);

  useEffect(() => {
    if (!down) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          onRetry();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [down, onRetry]);

  let title = `We could not load ${what}.`;
  let body = api?.message || "Something went wrong while talking to the server.";
  if (down) {
    title = "NASA’s archive is taking a break.";
    body =
      "The IRSA archive that serves SPHEREx images is not answering right now. This usually clears up in a minute or two.";
  } else if (api?.status === 0) {
    title = "The Star Detective server is not reachable.";
    body = "Check your connection, or try again in a moment.";
  } else if (api?.status === 404) {
    title = "SPHEREx has no images here yet.";
    body = api.message && !/^Request failed/.test(api.message) ? api.message : "Try another target, or a larger field of view.";
  }

  return (
    <div className="ex-error" role="alert">
      <p className="ex-label">{down ? "Archive unavailable" : "Could not load"}</p>
      <p className="ex-error-title">{title}</p>
      <p className="ex-error-body">{body}</p>
      <div className="ex-error-actions">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Try again
        </button>
        {down && remaining > 0 && (
          <span className="ex-countdown" aria-live="polite">
            Retrying in <b>{remaining}s</b>
          </span>
        )}
      </div>
    </div>
  );
}
