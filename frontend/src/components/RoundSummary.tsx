"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import SiteNav from "@/components/SiteNav";
import { formatDelta, resultSubtitle, type RoundEntry } from "@/lib/demo";
import { SAMPLE_RESULTS } from "@/lib/round";
import { storageKey, type PlayerProgress } from "@/lib/xp";

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

  return (
    <div className="sd-page">
      <SiteNav active="play" />
      <main className="summary">
        <section className="summary-lead">
          <p className="eyebrow-data">
            <span className="summary-eyebrow-desktop">
              ROUND COMPLETE / {isSample ? "SAMPLE RESULTS" : "YOUR RESULTS"}
            </span>
            <span className="summary-eyebrow-mobile">
              {isSample ? "SAMPLE ROUND" : "YOUR ROUND"} / COMPLETE
            </span>
          </p>
          <h1 className="summary-title">
            Case closed:{" "}
            <span className="summary-score">
              {correct} of {entries.length}
            </span>
          </h1>
          <p className="summary-correct">correct</p>
          <p className="summary-xp">{xp} XP</p>
          <p className="summary-blurb">{blurb}</p>
          <div className="summary-actions">
            <Link className="btn btn-primary" href="/play">
              Play again
            </Link>
            <Link className="btn btn-secondary" href="/viewer">
              Explore the patches yourself
            </Link>
          </div>
          <p className="footnote summary-note">
            {isSample
              ? "A sample four-patch round. This is not a live result."
              : "A demo round. Targets and results are simulated."}
          </p>
        </section>

        <section className="summary-results" aria-label="Your patches">
          <p className="eyebrow-data eyebrow-muted">YOUR PATCHES</p>
          <ol className="result-list">
            {entries.map((entry, index) => {
              const tone = entry.delta > 0 ? "correct" : entry.delta < 0 ? "wrong" : "neutral";
              return (
                <li key={entry.patchId} className="result-row">
                  <span className={`result-icon result-${entry.correct ? "correct" : "wrong"}`} aria-hidden>
                    {entry.correct ? "✓" : "×"}
                  </span>
                  <span className="result-text">
                    <span className="result-title">
                      Patch {String(index + 1).padStart(2, "0")} · {entry.label}
                    </span>
                    <span className="result-sub">{resultSubtitle(entry)}</span>
                    <span className="sr-only">{entry.correct ? "Correct" : "Incorrect"}</span>
                  </span>
                  <span className={`result-xp result-${tone}`}>{formatDelta(entry.delta)}</span>
                </li>
              );
            })}
          </ol>
          <div className="takeaway">
            <p>
              {hasGlitchMiss || isSample
                ? "A dot that appears once is not always a mover."
                : hasStaticMiss
                  ? "A star can change brightness without moving at all."
                  : "A mover shifts while nearby stars stay put."}
            </p>
            <p>Compare again in the viewer — nothing is scored there.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
