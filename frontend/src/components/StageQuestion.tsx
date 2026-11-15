"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import Mascot, { type MascotMood } from "@/components/Mascot";
import type { AcademyStage } from "@/content/academy";
import "@/app/inner-game.css";

const LETTERS = ["A", "B", "C", "D", "E"];

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function StageQuestion({
  stage,
  onCorrect,
}: {
  stage: AcademyStage;
  onCorrect: () => void;
}) {
  const q = stage.question;
  const [picked, setPicked] = useState<number | null>(null);
  const [tried, setTried] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const wrongNow = picked !== null && picked !== q.correctIndex;
  const mood: MascotMood = solved ? "happy" : wrongNow ? "oops" : "think";
  const say = solved
    ? "Brilliant, detective!"
    : wrongNow
      ? "Not quite. Read the clue and try again!"
      : "Take your time. What do you think?";

  function choose(i: number) {
    if (solved) return;
    setPicked(i);
    const el = refs.current[i];
    const still = reducedMotion();
    if (i === q.correctIndex) {
      setSolved(true);
      if (el && !still) gsap.fromTo(el, { scale: 1 }, { scale: 1.03, duration: 0.3, yoyo: true, repeat: 1, ease: "power2.out" });
      window.setTimeout(onCorrect, 900);
    } else {
      setTried((t) => (t.includes(i) ? t : [...t, i]));
      if (el && !still) gsap.fromTo(el, { x: -10 }, { x: 0, duration: 0.5, ease: "elastic.out(1,0.25)" });
    }
  }

  return (
    <section className="ig-question" aria-labelledby={`ig-q-${stage.stage}`}>
      <p className="ig-eyebrow">
        Stage {String(stage.stage).padStart(2, "0")} check · <b>+{q.xp} XP</b>
      </p>
      <h2 id={`ig-q-${stage.stage}`} className="ig-q-prompt">
        {q.prompt}
      </h2>

      <div className="ig-q-grid">
        <div>
          <div className="ig-options" role="group" aria-label="Answer options">
            {q.options.map((option, i) => {
              const right = solved && i === q.correctIndex;
              const wrong = !right && tried.includes(i);
              return (
                <button
                  key={option}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  type="button"
                  disabled={solved}
                  onClick={() => choose(i)}
                  className={`ig-option ${right ? "ig-option-right" : wrong ? "ig-option-wrong" : ""}`}
                >
                  <span className="ig-option-letter" aria-hidden>
                    {right ? "✓" : wrong ? "✕" : LETTERS[i]}
                  </span>
                  <span className="ig-option-text">{option}</span>
                  {right && <span className="ig-option-mark">✓ Correct</span>}
                  {wrong && <span className="ig-option-mark">✕ Not this one</span>}
                </button>
              );
            })}
          </div>

          <div aria-live="polite" className="ig-feedback">
            {wrongNow && (
              <p className="ig-feedback-bad">
                ✕ Not quite. <span>{q.feedback} Try another answer.</span>
              </p>
            )}
            {solved && (
              <p className="ig-feedback-ok">
                ✓ Correct! <span>{q.feedback}</span>
              </p>
            )}
          </div>
        </div>

        <div className="ig-q-mascot">
          <Mascot mood={mood} say={say} size={140} key={picked ?? "none"} />
        </div>
      </div>
    </section>
  );
}
