"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import LessonCard from "@/components/LessonCard";
import SiteNav from "@/components/SiteNav";
import StageQuestion from "@/components/StageQuestion";
import { EXPLORE_DESCRIPTION, LESSON_STAGES } from "@/content/academy";
import { useAuth } from "@/lib/auth";
import { awardStageQuestion, useProgress } from "@/lib/progress";
import { readProgress } from "@/lib/xp";
import "../inner-game.css";

const TOPICS: Record<number, string> = {
  1: "Infrared · False colour · SPHEREx · Glitches",
  2: "Uranus · Ceres · Pluto · WISE 0855",
  3: "Planets · Asteroid belt · Kuiper Belt · Distance",
};

/** Practice-round description. Training patches are prepared examples, so no "real" claim here. */
const TRAINING_LINE =
  "Practice patches where we already know the answer. Spot what moved and learn to tell movers from glitches.";

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function burst(host: HTMLElement | null) {
  if (!host || reducedMotion()) return;
  for (let i = 0; i < 32; i++) {
    const dot = document.createElement("span");
    dot.className = "ig-burst-dot";
    host.appendChild(dot);
    gsap.to(dot, {
      x: gsap.utils.random(-280, 280),
      y: gsap.utils.random(-220, 220),
      opacity: 0,
      scale: gsap.utils.random(0.4, 2),
      duration: 1.2,
      ease: "power2.out",
      onComplete: () => dot.remove(),
    });
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Huge accent title, one mask per word so GSAP can slide words up. */
function Title({ text, size = "xl" }: { text: string; size?: "xl" | "md" }) {
  return (
    <h1 className={`ig-title ${size === "md" ? "ig-title-md" : ""}`}>
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`}>
          <span className="ig-title-word">
            <span data-ig-word>{word}</span>
          </span>{" "}
        </span>
      ))}
    </h1>
  );
}

function Orbits() {
  return (
    <svg className="ig-orbits" viewBox="0 0 400 400" aria-hidden focusable="false">
      <circle className="ig-ring" cx="200" cy="200" r="190" />
      <circle className="ig-ring" cx="200" cy="200" r="140" opacity="0.7" />
      <circle className="ig-ring" cx="200" cy="200" r="90" opacity="0.5" />
      <circle className="ig-dot" cx="334" cy="66" r="4" />
      <circle className="ig-dot" cx="60" cy="230" r="3" opacity="0.7" />
      <circle className="ig-dot" cx="263" cy="263" r="2.5" opacity="0.6" />
    </svg>
  );
}

export default function AcademyClient() {
  const { xp, stage: unlocked, user } = useProgress();
  const { logout } = useAuth();
  const [active, setActive] = useState<number | null>(null); // lesson stage being studied
  const [card, setCard] = useState(0);
  const [toast, setToast] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const burstHost = useRef<HTMLDivElement>(null);

  // ?stage=N deep links: 4 → Training, 5 → Explore, 1–3 open a lesson if it is unlocked.
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("stage"));
    if (n === 4) window.location.replace("/play");
    else if (n === 5) window.location.replace("/viewer");
    else if (n >= 1 && n <= 3 && n <= (readProgress().stage ?? 1)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of the URL after hydration
      setActive(n);
    }
  }, []);

  // Title reveal + staggered rows, re-run when switching between overview and a lesson.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scope = root.current;
        if (!scope) return;
        const words = scope.querySelectorAll("[data-ig-word]");
        const rows = scope.querySelectorAll("[data-ig-rise]");
        if (words.length) gsap.from(words, { yPercent: 110, duration: 0.9, stagger: 0.08, ease: "power4.out" });
        if (rows.length) gsap.from(rows, { y: 28, opacity: 0, duration: 0.7, stagger: 0.08, delay: 0.2, ease: "power3.out" });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [active] },
  );

  const lesson = LESSON_STAGES.find((s) => s.stage === active);
  const total = lesson ? lesson.cards.length : 0;
  const cleared = Math.min(3, Math.max(0, unlocked - 1));

  const go = useCallback((next: number) => {
    const box = stageBox.current;
    if (!box || reducedMotion()) {
      setCard(next);
      return;
    }
    gsap.to(box, {
      x: -24,
      opacity: 0,
      duration: 0.16,
      onComplete: () => {
        setCard(next);
        gsap.fromTo(box, { x: 24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" });
      },
    });
  }, []);

  // ← / → step through the cards while a lesson is open.
  useEffect(() => {
    if (!lesson) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [role='slider']")) return;
      if (e.key === "ArrowRight" && card < total) go(card + 1);
      else if (e.key === "ArrowLeft" && card > 0) go(card - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lesson, card, total, go]);

  function open(stage: number) {
    setToast("");
    setActive(stage);
    setCard(0);
    window.scrollTo({ top: 0 });
  }

  function close() {
    setActive(null);
    setCard(0);
  }

  function solved(stage: number) {
    const fresh = awardStageQuestion(stage);
    burst(burstHost.current);
    setToast(
      stage < 3
        ? `${fresh ? "+20 XP · " : ""}Stage ${pad(stage + 1)} unlocked`
        : `${fresh ? "+20 XP · " : ""}Stage 04 Training is ready`,
    );
    window.setTimeout(close, 1500);
  }

  const skip = (
    <Link href="/play" className="ig-pill ig-pill-primary">
      Skip to training <span className="ig-arrow" aria-hidden>→</span>
    </Link>
  );

  return (
    <div className="sd-page ig-page" ref={root}>
      <SiteNav active="academy" />
      <div ref={burstHost} className="ig-burst" />

      <main className="ig-wrap">
        <div className="ig-topbar">
          <div className="ig-topbar-left">
            {lesson ? (
              <button type="button" className="ig-link" onClick={close}>
                ← All stages
              </button>
            ) : (
              <p className="ig-eyebrow">
                Star Detective · <b>Astronomy academy</b>
              </p>
            )}
          </div>
          {skip}
        </div>

        {toast && (
          <div className="ig-toast" role="status">
            <span>✓ {toast}</span>
            <button type="button" className="ig-pill" onClick={() => setToast("")}>
              Dismiss
            </button>
          </div>
        )}

        {lesson ? (
          <section aria-label={`Stage ${lesson.stage}: ${lesson.name}`}>
            <div className="ig-lesson-head">
              <p className="ig-eyebrow">
                Stage {pad(lesson.stage)} · <b>{lesson.subtitle}</b>
              </p>
              <Title text={lesson.name} size="md" />
            </div>

            <div className="ig-steps" role="group" aria-label="Lesson progress">
              {lesson.cards.map((c, i) => (
                <button
                  key={c.title}
                  type="button"
                  className={`ig-step ${i === card ? "ig-step-current" : i < card ? "ig-step-past" : ""}`}
                  aria-label={`Card ${i + 1} of ${total}: ${c.title}`}
                  aria-current={i === card ? "step" : undefined}
                  onClick={() => go(i)}
                />
              ))}
              <button
                type="button"
                className={`ig-step ig-step-check ${card === total ? "ig-step-current" : ""}`}
                aria-label="Stage check question"
                aria-current={card === total ? "step" : undefined}
                onClick={() => go(total)}
              >
                <span aria-hidden>CHECK</span>
              </button>
            </div>

            <div ref={stageBox}>
              {card < total ? (
                <LessonCard card={lesson.cards[card]} index={card} total={total} />
              ) : (
                <StageQuestion key={lesson.stage} stage={lesson} onCorrect={() => solved(lesson.stage)} />
              )}
            </div>

            <nav className="ig-lesson-nav" aria-label="Lesson navigation">
              <button
                type="button"
                className="ig-pill ig-pill-lg"
                disabled={card === 0}
                onClick={() => go(card - 1)}
              >
                ← Back
              </button>
              <span className="ig-lesson-hint" aria-hidden>
                ← / → keys
              </span>
              {card < total ? (
                <button type="button" className="ig-pill ig-pill-lg ig-pill-primary" onClick={() => go(card + 1)}>
                  {card === total - 1 ? "Take the check" : "Next"} <span className="ig-arrow" aria-hidden>→</span>
                </button>
              ) : (
                <button type="button" className="ig-pill ig-pill-lg" onClick={() => go(0)}>
                  Review cards
                </button>
              )}
            </nav>
          </section>
        ) : (
          <>
            <section className="ig-hero">
              <Orbits />
              <div>
                <Title text="Academy" />
                <p className="ig-lede" data-ig-rise>
                  Five stages from zero to real NASA data. Learn the words, meet the famous finds, then hunt for
                  things that move in SPHEREx sky images.
                </p>
              </div>
              <div className="ig-hero-side" data-ig-rise>
                <dl className="ig-spec">
                  <div>
                    <dt>Detective</dt>
                    <dd>{user ? user.display_name : "Guest"}</dd>
                  </div>
                  <div>
                    <dt>Experience</dt>
                    <dd className="ig-accent">{xp} XP</dd>
                  </div>
                  <div>
                    <dt>Lessons cleared</dt>
                    <dd>{cleared} / 3</dd>
                  </div>
                </dl>
                <div className="ig-meter" aria-hidden>
                  <span style={{ width: `${(cleared / 3) * 100}%` }} />
                </div>
                <div className="ig-hero-actions" style={{ marginTop: 20 }}>
                  <Link href="/leaderboard" className="ig-link">
                    Leaderboard
                  </Link>
                  {user ? (
                    <button type="button" className="ig-link" onClick={() => logout()}>
                      Log out
                    </button>
                  ) : (
                    <Link href="/login" className="ig-link">
                      Log in to save progress
                    </Link>
                  )}
                </div>
              </div>
            </section>

            <section className="ig-journey-head" aria-labelledby="ig-journey-label">
              <h2 id="ig-journey-label" className="ig-section-label">
                The journey
              </h2>
              <ol className="ig-journey">
                {LESSON_STAGES.map((s) => {
                  const locked = s.stage > unlocked;
                  const done = unlocked > s.stage;
                  const current = s.stage === unlocked;
                  const state = locked ? "Locked" : done ? "✓ Cleared" : "Ready";
                  return (
                    <li key={s.stage} className={`ig-row ${current ? "ig-row-current" : ""}`} data-ig-rise>
                      <button
                        type="button"
                        className="ig-row-btn"
                        aria-disabled={locked || undefined}
                        aria-label={`Stage ${s.stage}: ${s.name}. ${locked ? `Locked: finish stage ${s.stage - 1} first` : done ? "Cleared, review" : "Ready, start"}`}
                        onClick={() => {
                          if (!locked) open(s.stage);
                        }}
                      >
                        <span className="ig-row-num" aria-hidden>
                          {pad(s.stage)}
                        </span>
                        <span className="ig-row-text">
                          <span className="ig-row-name">{s.name}</span>
                          <span className="ig-row-line">{s.subtitle}</span>
                          <span className="ig-row-topics">
                            {s.cards.length} cards · {TOPICS[s.stage]}
                          </span>
                        </span>
                        <span
                          className={`ig-row-state ${done ? "ig-state-done" : locked ? "" : "ig-state-ready"}`}
                          aria-hidden
                        >
                          {locked ? `Locked · finish ${pad(s.stage - 1)}` : state}
                        </span>
                        <span className="ig-row-arrow" aria-hidden>
                          {locked ? "–" : "→"}
                        </span>
                      </button>
                    </li>
                  );
                })}
                <li className="ig-row" data-ig-rise>
                  <Link href="/play" className="ig-row-btn">
                    <span className="ig-row-num" aria-hidden>
                      04
                    </span>
                    <span className="ig-row-text">
                      <span className="ig-row-name">Training</span>
                      <span className="ig-row-line">{TRAINING_LINE}</span>
                    </span>
                    <span className="ig-row-state ig-state-open">Always open</span>
                    <span className="ig-row-arrow" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
                <li className="ig-row" data-ig-rise>
                  <Link href="/viewer" className="ig-row-btn">
                    <span className="ig-row-num" aria-hidden>
                      05
                    </span>
                    <span className="ig-row-text">
                      <span className="ig-row-name">Explore</span>
                      <span className="ig-row-line">{EXPLORE_DESCRIPTION}</span>
                    </span>
                    <span className="ig-row-state ig-state-open">Always open</span>
                    <span className="ig-row-arrow" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              </ol>
              <p className="ig-journey-foot">
                Each lesson ends with one check question worth +20 XP. Passing it unlocks the next stage.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
