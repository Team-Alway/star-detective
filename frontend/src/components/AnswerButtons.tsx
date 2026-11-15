"use client";

import type { Answer } from "@/lib/demo";

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
    <div className="answer-pair" role="group" aria-label="Did anything move?">
      <button
        type="button"
        className="btn btn-secondary"
        disabled={disabled}
        aria-pressed={chosen === "still"}
        onClick={() => onAnswer?.("still")}
      >
        Nothing moving
      </button>
      <button
        type="button"
        className="btn btn-primary"
        disabled={disabled}
        aria-pressed={chosen === "moved"}
        onClick={() => onAnswer?.("moved")}
      >
        I see movement
      </button>
    </div>
  );
}
