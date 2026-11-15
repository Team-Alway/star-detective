import Image from "next/image";
import { Target, pct } from "@/components/SkyImage";
import type { Outcome } from "@/lib/demo";

function Ring({ x, y, tone }: { x: number; y: number; tone: string }) {
  return (
    <span
      className={`marker-ring marker-${tone}`}
      style={{ left: pct(x), top: pct(y) }}
    />
  );
}

function Letter({ x, y, tone, children }: { x: number; y: number; tone: string; children: string }) {
  return (
    <span className={`marker-letter marker-text-${tone}`} style={{ left: pct(x), top: pct(y) }}>
      {children}
    </span>
  );
}

/** Rings, letters and labels drawn over the image on the reveal screens. */
export default function RevealMarkers({ marker, markerLabel }: Pick<Outcome, "marker" | "markerLabel">) {
  if (marker === "found" || marker === "missed") {
    const tone = marker === "found" ? "correct" : "muted";
    return (
      <>
        <Target side="A" />
        <span className="sky-target" style={{ left: pct(334), top: pct(301) }}>
          <Image src="/figma/position-b.svg" alt="" width={4} height={4} className="sky-target-dot" />
        </span>
        <Ring x={244} y={300} tone={tone} />
        <Ring x={334} y={300} tone={tone} />
        <Letter x={234} y={252} tone={tone}>A</Letter>
        <Letter x={324} y={252} tone={tone}>B</Letter>
        <span className={`marker-arrow marker-text-${tone}`} style={{ left: pct(289), top: pct(300) }}>
          →
        </span>
      </>
    );
  }

  if (marker === "glitch-good" || marker === "glitch-fooled") {
    const good = marker === "glitch-good";
    return (
      <>
        <span className="glitch-mark" style={{ left: pct(242), top: pct(298) }} />
        <Ring x={244} y={300} tone={good ? "correct" : "wrong"} />
        <span
          className={`marker-caption ${good ? "marker-text-muted" : "marker-text-wrong"}`}
          style={{ left: pct(220), top: pct(342) }}
        >
          {markerLabel}
        </span>
      </>
    );
  }

  return null;
}
