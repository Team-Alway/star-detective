"use client";

import type { Answer } from "@/lib/demo";
import "@/app/inner-game.css";

export default function AnswerButtons({
  onAnswer,
  disabled = false,
  chosen = null,
}: {
  onAnswer?: (answer: Answer) => void;
  disabled?: boolean;
  chosen?: Answer | null;
}) {
  return (
    <div className="ig-answers" role="group" aria-label="Did anything move?">
      <button
        type="button"
        className="ig-answer"
        disabled={disabled}
        aria-pressed={chosen === "still"}
        onClick={() => onAnswer?.("still")}
      >
        {chosen === "still" && <span aria-hidden>✓</span>}
        Nothing moving
      </button>
      <button
        type="button"
        className="ig-answer ig-answer-primary"
        disabled={disabled}
        aria-pressed={chosen === "moved"}
        onClick={() => onAnswer?.("moved")}
      >
        {chosen === "moved" && <span aria-hidden>✓</span>}
        I see movement
      </button>
    </div>
  );
}
