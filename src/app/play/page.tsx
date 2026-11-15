"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const answers = ["Nothing moving", "I see movement"];

export default function PlayPage() {
  const [frame, setFrame] = useState<"A" | "B">("A");
  const [isBlinking, setIsBlinking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  function toggleBlink() {
    setIsBlinking((current) => !current);
    setFrame((current) => (current === "A" ? "B" : "A"));
  }

  function stepFrame(nextFrame: "A" | "B") {
    setIsBlinking(false);
    setFrame(nextFrame);
  }

  return (
    <main className="play-page">
      <header className="play-navigation">
        <Link className="play-brand" href="/">
          Star Detective
        </Link>
        <span className="play-mode">QUICK SPOTTER</span>
        <div className="patch-progress" aria-label="Patch 1 of 4">
          <span>Patch 1 of 4</span>
          <div className="progress-lines" aria-hidden="true">
            <i className="active" />
            <i />
            <i />
            <i />
          </div>
        </div>
        <span className="play-xp">XP 0</span>
        <nav className="play-nav-actions" aria-label="Page actions">
          <Link className="play-nav-button" href="/viewer">
            Viewer
          </Link>
          <Link className="play-nav-button wide" href="/about">
            About the data
          </Link>
        </nav>
      </header>

      <div className="play-layout">
        <section className="spotter-column" aria-label="Sky image comparison">
          <div className={`spotter-image ${frame === "B" ? "frame-b" : ""}`}>
            <Image
              src="/figma/spherex-detector.jpeg"
              alt="Dense star field from the SPHEREx detector"
              fill
              priority
              sizes="(max-width: 760px) 100vw, 43vw"
            />
            <span className="spotter-date">A&nbsp; - 27 MAR 2025</span>
            <span className="spotter-scale">Scale not calibrated</span>
          </div>
          <div className="spotter-controls">
            <button className="start-blink" type="button" onClick={toggleBlink}>
              <span aria-hidden="true">▷</span> {isBlinking ? "Stop blink" : "Start blink"} <small>Slow</small>
            </button>
            <button className={`speed-button ${!isBlinking ? "selected" : ""}`} type="button" onClick={() => setIsBlinking(false)}>
              Slow
            </button>
            <button className="speed-button" type="button" onClick={toggleBlink}>
              Fast
            </button>
            <button className="frame-button" type="button" onClick={() => stepFrame("A")} aria-pressed={frame === "A"}>
              ← A
            </button>
            <button className="frame-button" type="button" onClick={() => stepFrame("B")} aria-pressed={frame === "B"}>
              B →
            </button>
          </div>
          <div className="answer-row" aria-label="Choose an answer">
            {answers.map((option) => (
              <button className={`answer-button ${answer === option ? "chosen" : ""}`} key={option} type="button" onClick={() => setAnswer(option)} aria-pressed={answer === option}>
                {option}
              </button>
            ))}
          </div>
          <p className="design-caption">DESIGN PREVIEW · One SPHEREx reference image. A / B and target motion are simulated, not science observations.</p>
        </section>

        <section className="question-column">
          <p className="question-eyebrow">ONE PATCH. ONE QUESTION.</p>
          <h1>Watch the two images flip. Did anything move?</h1>
          <p className="question-copy">You don’t need to find the exact spot. Compare the images, then choose an answer below.</p>

          <ol className="how-it-works">
            <li><strong>01</strong><span>Compare</span><small>Press Start blink, or step between A and B.</small></li>
            <li><strong>02</strong><span>Choose</span><small>Nothing moving, or I see movement.</small></li>
            <li><strong>03</strong><span>Learn</span><small>See the answer, then try the next patch.</small></li>
          </ol>

          <p className="looking-label">What am I looking at?</p>
          <div className="control-note">
            <strong>YOU CONTROL THE COMPARISON</strong>
            <p>Blink never starts on its own. Manual stepping is always available. Demo images use the same NASA reference with a test target added.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
