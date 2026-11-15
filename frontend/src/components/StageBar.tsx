"use client";

import Link from "next/link";

export const STAGES = [
  { n: 1, name: "Baby Steps", href: "/academy?stage=1" },
  { n: 2, name: "Known Findings", href: "/academy?stage=2" },
  { n: 3, name: "The Solar System", href: "/academy?stage=3" },
  { n: 4, name: "Training", href: "/play" },
  { n: 5, name: "Explore", href: "/viewer" },
];

export default function StageBar({ current = 0, unlocked = 1 }: { current?: number; unlocked?: number }) {
  return (
    <ol className="stage-bar" aria-label="Academy stages">
      {STAGES.map((s) => {
        const free = s.n >= 4;
        const open = free || s.n <= unlocked;
        const state = s.n === current ? "current" : s.n < unlocked && !free ? "done" : open ? "open" : "locked";
        const label = `Stage ${s.n}: ${s.name}${s.n === 4 ? " (skip to training)" : ""}${open ? "" : " (locked)"}`;
        const inner = (
          <>
            <span className="stage-dot">{state === "done" ? "✓" : state === "locked" ? "•" : s.n}</span>
            <span className="stage-name">{s.name}</span>
          </>
        );
        return (
          <li key={s.n} className={`stage-item stage-${state}`}>
            {open ? (
              <Link href={s.href} aria-label={label} aria-current={state === "current" ? "step" : undefined} title={label}>
                {inner}
              </Link>
            ) : (
              <span aria-label={label} title={label} aria-disabled="true">
                {inner}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
