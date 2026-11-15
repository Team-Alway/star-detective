"use client";

import Image from "next/image";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Side } from "@/components/BlinkControls";
import type { PatchKind } from "@/lib/demo";
import StatePanel, { LoadingBar } from "@/components/StatePanel";

const SRC = "/figma/spherex-detector.jpeg";

/** Image only: the SPHEREx detector crop used in every design frame. */
export function SkyPhoto({
  onLoad,
  onError,
  imageKey,
}: {
  onLoad?: () => void;
  onError?: () => void;
  imageKey?: number;
}) {
  return (
    <div className="sky-photo" aria-hidden>
      <Image
        key={imageKey}
        src={SRC}
        alt=""
        fill
        priority
        unoptimized
        sizes="608px"
        ref={(element) => {
          if (element?.complete && element.naturalWidth > 0) onLoad?.();
        }}
        onLoad={onLoad}
        onError={onError}
      />
    </div>
  );
}

/** Marker position inside the 608 × 608 design frame, expressed in percent. */
export function pct(value: number) {
  return `${(value / 608) * 100}%`;
}

const A_POS = { x: 245.79, y: 300.98 };
const B_POS = { x: 334, y: 301 };

export function Target({ side }: { side: Side }) {
  const pos = side === "A" ? A_POS : B_POS;
  return (
    <span className="sky-target" style={{ left: pct(pos.x), top: pct(pos.y) }}>
      <Image src="/figma/target-halo.svg" alt="" width={11} height={11} className="sky-target-halo" />
      <Image src="/figma/target.svg" alt="" width={4} height={4} className="sky-target-dot" />
    </span>
  );
}

function GlitchMark() {
  return <span className="glitch-mark" style={{ left: pct(242), top: pct(298) }} />;
}

export default function SkyImage({
  side = "A",
  patchKind = "none",
  showTarget = true,
  children,
  className = "",
}: {
  side?: Side;
  patchKind?: PatchKind;
  showTarget?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);

  function retry() {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }

  return (
    <div className={`sky-frame ${className}`}>
      <SkyPhoto
        imageKey={attempt}
        onLoad={() => setStatus((current) => (current === "failed" ? current : "ready"))}
        onError={() => setStatus("failed")}
      />
      <span className="sky-date">
        {side} · 27 MAR 2025
      </span>
      <span className="sky-scale">Scale not calibrated</span>

      {status === "ready" && showTarget && patchKind === "mover" && <Target side={side} />}
      {status === "ready" && showTarget && patchKind === "glitch" && side === "A" && <GlitchMark />}
      {status === "ready" && children}

      {status === "loading" && (
        <div className="sky-overlay" role="status">
          <p className="state-title">Fetching image from the NASA archive</p>
          <div className="loading-skeleton" />
          <LoadingBar />
          <p className="state-note">A progress line shows that the request is still active.</p>
        </div>
      )}
      {status === "failed" && (
        <div className="sky-overlay sky-overlay-solid">
          <StatePanel
            label="IMAGE FAILED"
            title="We could not load this image."
            role="alert"
            actions={
              <>
                <button type="button" className="btn btn-primary" onClick={retry}>
                  Try again
                </button>
                <button type="button" className="btn btn-secondary" onClick={retry}>
                  Play a saved level
                </button>
              </>
            }
          >
            Try the request again or continue with saved data.
          </StatePanel>
        </div>
      )}
    </div>
  );
}
