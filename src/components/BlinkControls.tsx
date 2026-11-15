"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export type Side = "A" | "B";
export type BlinkSpeed = "slow" | "fast";

/** Slow = 1 swap/sec, Fast = 2 swaps/sec. Never faster than 3. */
const INTERVAL: Record<BlinkSpeed, number> = { slow: 1000, fast: 500 };

export function useBlink() {
  const [side, setSide] = useState<Side>("A");
  const [blinking, setBlinking] = useState(false);
  const [speed, setSpeed] = useState<BlinkSpeed>("slow");

  useEffect(() => {
    if (!blinking) return;
    const timer = window.setInterval(
      () => setSide((current) => (current === "A" ? "B" : "A")),
      INTERVAL[speed],
    );
    return () => window.clearInterval(timer);
  }, [blinking, speed]);

  const toggle = useCallback(() => setBlinking((value) => !value), []);
  const step = useCallback((next: Side) => {
    setBlinking(false);
    setSide(next);
  }, []);
  const reset = useCallback(() => {
    setBlinking(false);
    setSide("A");
  }, []);

  return { side, blinking, speed, setSpeed, toggle, step, reset };
}

export type BlinkState = ReturnType<typeof useBlink>;

export default function BlinkControls({ blink }: { blink: BlinkState }) {
  const { side, blinking, speed, setSpeed, toggle, step } = blink;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, dialog, [role='slider']")) return;
      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      } else if (event.key === "ArrowLeft") {
        step("A");
      } else if (event.key === "ArrowRight") {
        step("B");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, step]);

  return (
    <div className="blink-row">
      <button
        type="button"
        className="blink-control blink-toggle"
        aria-pressed={blinking}
        onClick={toggle}
      >
        {!blinking && <Image src="/figma/asset-2.svg" alt="" width={20} height={20} />}
        <span>
          <span className="blink-word-long">{blinking ? "Stop blink" : "Start blink"}</span>
          <span className="blink-word-short">{blinking ? "Stop" : "Blink"}</span>
        </span>
        <small className="blink-speed-hint">{speed === "slow" ? "Slow" : "Fast"}</small>
      </button>

      <div className="speed-group" role="group" aria-label="Blink speed">
        <button
          type="button"
          className={`btn ${speed === "slow" ? "btn-active" : "btn-ghost"} btn-w72`}
          aria-pressed={speed === "slow"}
          onClick={() => setSpeed("slow")}
        >
          Slow
        </button>
        <button
          type="button"
          className={`btn ${speed === "fast" ? "btn-active" : "btn-ghost"} btn-w72`}
          aria-pressed={speed === "fast"}
          onClick={() => setSpeed("fast")}
        >
          Fast
        </button>
      </div>
      <button
        type="button"
        className="btn btn-secondary speed-cycle"
        onClick={() => setSpeed(speed === "slow" ? "fast" : "slow")}
        aria-label={`Blink speed: ${speed}. Press to change.`}
      >
        {speed === "slow" ? "Slow" : "Fast"} <small aria-hidden>⌄</small>
      </button>

      <button
        type="button"
        className="btn btn-secondary step-button"
        aria-pressed={!blinking && side === "A"}
        onClick={() => step("A")}
      >
        ← A
      </button>
      <button
        type="button"
        className="btn btn-secondary step-button"
        aria-pressed={!blinking && side === "B"}
        onClick={() => step("B")}
      >
        B →
      </button>
    </div>
  );
}
