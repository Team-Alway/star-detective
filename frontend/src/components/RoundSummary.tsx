"use client";

import Link from "next/link";
import { useMemo, useRef, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import SiteNav from "@/components/SiteNav";
import { formatDelta, resultSubtitle, type RoundEntry } from "@/lib/demo";
import { SAMPLE_RESULTS } from "@/lib/round";
import { unlockStage } from "@/lib/progress";
import { storageKey, type PlayerProgress } from "@/lib/xp";
import "@/app/inner-game.css";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function readRaw() {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export default function RoundSummary() {
  const root = useRef<HTMLDivElement>(null);
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);

  const live = useMemo<RoundEntry[] | null>(() => {
    if (!raw) return null;
    try {
      const round = (JSON.parse(raw) as PlayerProgress).round;
      return round && round.length > 0 ? round : null;
    } catch {
      return null;
    }
  }, [raw]);

  const entries = live ?? SAMPLE_RESULTS;
  const isSample = live === null;
  const correct = entries.filter((entry) => entry.correct).length;
  const xp = entries.reduce((sum, entry) => sum + entry.delta, 0);
  const hasGlitchMiss = entries.some((entry) => entry.kind === "glitch" && !entry.correct);
  const hasStaticMiss = entries.some((entry) => entry.kind === "none" && !entry.correct);

  const blurb = isSample
    ? "You spotted the difference in three patches. Take another look at the one that fooled you."
    : correct === entries.length
      ? "Every patch read correctly. Compare again in the viewer at your own pace."
      : `You got ${correct} of ${entries.length}. Take another look at the ones that fooled you.`;

  const takeaway =
    hasGlitchMiss || isSample
      ? "A dot that appears once is not always a mover."
      : hasStaticMiss
        ? "A star can change brightness without moving at all."
        : "A mover shifts while nearby stars stay put.";

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scope = root.current;
        if (!scope) return;
        const words = scope.querySelectorAll("[data-ig-word]");
        const rows = scope.querySelectorAll("[data-ig-rise]");
        if (words.length) gsap.from(words, { yPercent: 110, duration: 0.9, stagger: 0.08, ease: "power4.out" });
        if (rows.length) gsap.from(rows, { y: 24, opacity: 0, duration: 0.6, stagger: 0.07, delay: 0.2, ease: "power3.out" });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [isSample] },
  );

  return (
    <div className="sd-page ig-page" ref={root}>
      <SiteNav active="play" />
      <main className="ig-wrap">
        <p className="ig-eyebrow">
          Round complete · <b>{isSample ? "Sample results" : "Your results"}</b>
        </p>
        <h1 className="ig-title">
          <span className="ig-title-word">
            <span data-ig-word>Case</span>
          </span>{" "}
          <span className="ig-title-word">
            <span data-ig-word>closed</span>
          </span>
        </h1>

        <div className="ig-sum-grid">
          <svg className="ig-orbits" viewBox="0 0 400 400" aria-hidden focusable="false">
            <circle className="ig-ring" cx="200" cy="200" r="190" />
            <circle className="ig-ring" cx="200" cy="200" r="130" opacity="0.6" />
            <circle className="ig-dot" cx="66" cy="66" r="4" />
            <circle className="ig-dot" cx="330" cy="200" r="3" opacity="0.7" />
          </svg>

          <section aria-label="Score">
            <p className="ig-score" data-ig-rise>
              <b>{correct}</b>
              <span>/{entries.length}</span>
            </p>
            <p className="ig-score-cap" data-ig-rise>
              {correct} of {entries.length} correct
            </p>
            <p className="ig-lede" data-ig-rise>
              {blurb}
            </p>
            <div className="ig-sum-actions" data-ig-rise>
              <Link className="ig-pill ig-pill-lg ig-pill-primary" href="/play">
                Play again
              </Link>
              <Link className="ig-pill ig-pill-lg" href="/viewer" onClick={() => unlockStage(5)}>
                Enter Explore mode <span className="ig-arrow" aria-hidden>→</span>
              </Link>
            </div>
          </section>

          <section className="ig-sum-side" aria-label="Your patches">
            <dl className="ig-spec" data-ig-rise>
              <div>
                <dt>Round XP</dt>
                <dd className="ig-accent">{formatDelta(xp)}</dd>
              </div>
              <div>
                <dt>Patches</dt>
                <dd>{entries.length}</dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd>{isSample ? "Sample, not live" : "Practice round"}</dd>
              </div>
            </dl>

            <ol className="ig-results">
              {entries.map((entry, index) => {
                const tone = entry.delta > 0 ? "correct" : entry.delta < 0 ? "wrong" : "neutral";
                return (
                  <li key={entry.patchId} data-ig-rise>
                    <span className="ig-res-num" aria-hidden>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="ig-res-title">
                        <span className="sr-only">Patch {index + 1}: </span>
                        {entry.label}
                      </span>
                      <span className="ig-res-sub">{resultSubtitle(entry)}</span>
                    </span>
                    <span className="ig-res-end">
                      <span className={`ig-res-mark ig-tone-${entry.correct ? "correct" : "wrong"}`}>
                        {entry.correct ? "✓ Right" : "✕ Missed"}
                      </span>
                      <span className={`ig-res-xp ig-tone-${tone}`}>{formatDelta(entry.delta)}</span>
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="ig-note" data-ig-rise>
              <p className="ig-eyebrow">
                <b>Takeaway</b>
              </p>
              <p>{takeaway} Compare again in the viewer: nothing is scored there.</p>
            </div>
            <p className="ig-foot">
              {isSample
                ? "A sample four-patch round. This is not a live result."
                : "A practice round. Each patch carries the data label shown on its images (Real or Simulated)."}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
