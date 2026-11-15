import Image from "next/image";
import { Target, pct } from "@/components/SkyImage";
import type { Outcome, Point, RoundPatch } from "@/lib/round";

function Ring({ at, tone }: { at: Point; tone: string }) {
  return (
    <span className={`marker-ring marker-${tone}`} style={{ left: pct(at.x), top: pct(at.y) }} />
  );
}

function Letter({ at, tone, children }: { at: Point; tone: string; children: string }) {
  return (
    <span
      className={`marker-letter marker-text-${tone}`}
      style={{ left: pct(at.x - 10), top: pct(at.y - 48) }}
    >
      {children}
    </span>
  );
}

/** Rings, letters and labels drawn over the image on the reveal screens. */
export default function RevealMarkers({
  patch,
  outcome,
}: {
  patch: RoundPatch;
  outcome: Pick<Outcome, "marker" | "markerLabel" | "tone">;
}) {
  const { marker, markerLabel } = outcome;
  const { a, b } = patch.positions;
  const simulated = patch.images.mode === "saved";

  if (marker === "found" || marker === "missed") {
    const tone = marker === "found" ? "correct" : "muted";
    return (
      <>
        {simulated && (
          <>
            <Target side="A" />
            <span className="sky-target" style={{ left: pct(b.x), top: pct(b.y + 1) }}>
              <Image src="/figma/position-b.svg" alt="" width={4} height={4} className="sky-target-dot" />
            </span>
          </>
        )}
        <Ring at={a} tone={tone} />
        <Ring at={b} tone={tone} />
        <Letter at={a} tone={tone}>A</Letter>
        <Letter at={b} tone={tone}>B</Letter>
        <span
          className={`marker-arrow marker-text-${tone}`}
          style={{ left: pct((a.x + b.x) / 2), top: pct((a.y + b.y) / 2) }}
        >
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
        <Ring at={a} tone={good ? "correct" : "wrong"} />
        <span
          className={`marker-caption ${good ? "marker-text-muted" : "marker-text-wrong"}`}
          style={{ left: pct(a.x - 24), top: pct(a.y + 42) }}
        >
          {markerLabel}
        </span>
      </>
    );
  }

  if (marker === "static") {
    const tone = outcome.tone === "correct" ? "correct" : "wrong";
    return (
      <>
        <Ring at={a} tone={tone} />
        <span
          className="marker-caption marker-text-muted"
          style={{ left: pct(Math.max(12, a.x - 80)), top: pct(a.y + 42) }}
        >
          {markerLabel}
        </span>
      </>
    );
  }

  return null;
}
