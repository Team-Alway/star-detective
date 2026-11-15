"use client";

import Image from "next/image";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Side } from "@/components/BlinkControls";
import type { PatchKind } from "@/lib/demo";
import { formatDate, type ImageSet } from "@/lib/round";
import StatePanel, { LoadingBar } from "@/components/StatePanel";

const SAVED_SRC = "/figma/spherex-detector.jpeg";

/**
 * One image. "saved" images are the bundled SPHEREx crop (zoomed to match the design frame);
 * "api" images are the backend's rendered FITS PNGs and fill the frame as-is.
 */
export function SkyPhoto({
  src = SAVED_SRC,
  mode = "saved",
  hidden = false,
  onLoad,
  onError,
  imageKey,
}: {
  src?: string;
  mode?: "api" | "saved";
  hidden?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  imageKey?: number;
}) {
  return (
    <div
      className={`sky-photo ${mode === "api" ? "sky-photo-plain" : ""}`}
      style={hidden ? { visibility: "hidden" } : undefined}
      aria-hidden
    >
      <Image
        key={imageKey}
        src={src}
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
  images,
  side = "A",
  patchKind = "none",
  showTarget = true,
  children,
  className = "",
}: {
  images: ImageSet;
  side?: Side;
  patchKind?: PatchKind;
  showTarget?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);
  const simulated = images.mode === "saved";
  const date = side === "A" ? images.dateA : images.dateB;
  const label = `${side} · ${formatDate(date).toUpperCase()}${images.tag ? ` · ${images.tag.toUpperCase()}` : ""}`;

  function retry() {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }

  return (
    <div className={`sky-frame ${className}`}>
      <SkyPhoto
        imageKey={attempt}
        mode={images.mode}
        src={images.srcA}
        hidden={side !== "A"}
        onLoad={() => setStatus((current) => (current === "failed" ? current : "ready"))}
        onError={() => setStatus("failed")}
      />
      {images.srcB !== images.srcA && (
        <SkyPhoto
          imageKey={attempt}
          mode={images.mode}
          src={images.srcB}
          hidden={side !== "B"}
          onError={() => setStatus("failed")}
        />
      )}
      <span className="sky-date">{label}</span>
      {simulated && <span className="sky-scale">Scale not calibrated</span>}

      {status === "ready" && simulated && showTarget && patchKind === "mover" && <Target side={side} />}
      {status === "ready" && simulated && showTarget && patchKind === "glitch" && side === "A" && (
        <GlitchMark />
      )}
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
              <button type="button" className="btn btn-primary" onClick={retry}>
                Try again
              </button>
            }
          >
            Try the request again or continue with saved data.
          </StatePanel>
        </div>
      )}
    </div>
  );
}
