"use client";

import { useCallback, useEffect, useState } from "react";
import "@/app/inner-game.css";

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
    <div className="ig-controls" role="group" aria-label="Compare images A and B">
      <button type="button" className="ig-ctl ig-ctl-main" aria-pressed={blinking} onClick={toggle}>
        <span aria-hidden>{blinking ? "■" : "▶"}</span>
        <span>{blinking ? "Stop" : "Blink"}</span>
        <small className="ig-ctl-long">{speed === "slow" ? "1/s" : "2/s"}</small>
      </button>

      <span className="ig-ctl-sep" aria-hidden />
      <div className="ig-speed-group" role="group" aria-label="Blink speed">
        <button type="button" className="ig-ctl" aria-pressed={speed === "slow"} onClick={() => setSpeed("slow")}>
          Slow
        </button>
        <button type="button" className="ig-ctl" aria-pressed={speed === "fast"} onClick={() => setSpeed("fast")}>
          Fast
        </button>
      </div>
      <button
        type="button"
        className="ig-ctl ig-speed-cycle"
        onClick={() => setSpeed(speed === "slow" ? "fast" : "slow")}
        aria-label={`Blink speed: ${speed}. Press to change.`}
      >
        {speed === "slow" ? "Slow" : "Fast"}
      </button>

      <span className="ig-ctl-sep" aria-hidden />
      <button type="button" className="ig-ctl" aria-pressed={!blinking && side === "A"} onClick={() => step("A")}>
        ← A
      </button>
      <button type="button" className="ig-ctl" aria-pressed={!blinking && side === "B"} onClick={() => step("B")}>
        B →
      </button>
    </div>
  );
}
