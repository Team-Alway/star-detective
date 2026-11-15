"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Mascot from "@/components/Mascot";
import SiteNav from "@/components/SiteNav";
import StarBorder from "@/components/StarBorder";
import { STAGES } from "@/components/StageBar";
import { setSpaceScroll } from "@/components/space/spaceStage";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** The 3D camera finishes its dive into the telescope at this fraction of the story scroll. */
const SCENE_END = 0.86;

/** Story captions: [start, end] are fractions of the story scroll. */
const CHAPTERS: { from: number; to: number; side: "left" | "right" | "center"; text: React.ReactNode }[] = [
  { from: 0.13, to: 0.27, side: "left", text: <>there is a galaxy called the <em>Milky Way</em>,</> },
  { from: 0.36, to: 0.45, side: "right", text: <>and in it, a peculiar planet: <em>Earth</em>.</> },
  {
    from: 0.48,
    to: 0.565,
    side: "left",
    text: <>For more than <em>2,000 years</em>, we looked up at the stars and wondered what was out there.</>,
  },
  {
    from: 0.585,
    to: 0.66,
    side: "left",
    text: <>Until some brave detectives, the <em>astronomers</em>, picked up their most powerful tool: <em>the telescope</em>.</>,
  },
  {
    from: 0.675,
    to: 0.775,
    side: "left",
    text: <>This is <em>SPHEREx</em>, NASA&apos;s telescope for mapping the whole sky. Take a look through it.</>,
  },
];

const SPECS: [string, string][] = [
  ["Agency", "NASA"],
  ["Launched", "2025"],
  ["Light", "Infrared"],
  ["Colours", "102"],
  ["Coverage", "Whole sky"],
  ["Repeat", "About every 6 months"],
];

const BLURBS = [
  "Learn the key words.",
  "See how real objects were found.",
  "What is out there, and why near things seem to move.",
  "Spot what moved in real SPHEREx images.",
  "Compare the sky yourself.",
];

/** Seconds for the story to play through on its own. */
const AUTOPLAY_SECONDS = 48;

export default function Home() {
  const root = useRef<HTMLElement>(null);
  const auto = useRef<gsap.core.Tween | null>(null);
  const [playing, setPlaying] = useState(false);

  const storyEnd = () => (document.querySelector<HTMLElement>(".story")!.offsetHeight - window.innerHeight) * 0.985;
  const stop = () => {
    auto.current?.kill();
    auto.current = null;
    setPlaying(false);
  };
  /** Plays the story by scrolling the page for the visitor. Any scroll, tap or key press hands control back. */
  const play = (delay = 0) => {
    auto.current?.kill();
    const end = storyEnd();
    const from = window.scrollY >= end - 4 ? 0 : window.scrollY;
    const pos = { y: from };
    setPlaying(true);
    auto.current = gsap.to(pos, {
      y: end,
      delay,
      duration: Math.max(2, AUTOPLAY_SECONDS * (1 - from / end)),
      ease: "none",
      onUpdate: () => window.scrollTo(0, pos.y),
      onComplete: stop,
    });
  };
  const skip = () => {
    stop();
    window.scrollTo({ top: storyEnd(), behavior: "smooth" });
  };

  useGSAP(
    () => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".story",
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => setSpaceScroll(self.progress / SCENE_END),
        },
      });
      // Opening line is visible on load, then leaves.
      tl.to(".cap-open", { autoAlpha: 0, y: -50, duration: 0.04 }, 0.07);
      tl.to(".scroll-hint", { autoAlpha: 0, duration: 0.02 }, 0.02);
      gsap.utils.toArray<HTMLElement>(".cap-step").forEach((el, i) => {
        const c = CHAPTERS[i];
        tl.fromTo(el, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.03 }, c.from);
        tl.to(el, { autoAlpha: 0, y: -50, duration: 0.03 }, c.to);
      });
      // Look through the telescope: an iris opens onto the real SPHEREx sky, then we zoom in.
      tl.fromTo(".scope", { clipPath: "circle(0% at 50% 50%)", autoAlpha: 1 }, { clipPath: "circle(80% at 50% 50%)", duration: 0.08 }, 0.79);
      tl.fromTo(".scope-meta", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, 0.86);
      tl.fromTo(".scope-img", { scale: 1 }, { scale: 3, duration: 0.09, ease: "power1.inOut" }, 0.87);
      tl.fromTo(".scope-cta", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.03 }, 0.955);
      tl.to({}, { duration: 0.015 }, 0.985); // hold the final frame
      tl.to(".story-controls", { autoAlpha: 0, duration: 0.02 }, 0.95);

      // After the story: reveal each block as it scrolls in.
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.from(el, { scrollTrigger: { trigger: el, start: "top 85%" }, y: 50, opacity: 0, duration: 0.9, ease: "power3.out" });
      });
      gsap.from(".journey-row", {
        scrollTrigger: { trigger: ".journey", start: "top 70%" },
        y: 40,
        opacity: 0,
        stagger: 0.1,
        duration: 0.7,
        ease: "power3.out",
      });
      gsap.to(".mission-word", {
        scrollTrigger: { trigger: ".mission", start: "top bottom", end: "bottom top", scrub: true },
        xPercent: -8,
        ease: "none",
      });

      // Autoplay on arrival, unless the visitor prefers reduced motion or has already scrolled.
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce && window.scrollY < 10) play(1.4);
      const handBack = (e: Event) => {
        if ((e.target as HTMLElement | null)?.closest?.(".story-controls")) return;
        if (auto.current) stop();
      };
      const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
      events.forEach((name) => window.addEventListener(name, handBack, { passive: true }));
      return () => {
        events.forEach((name) => window.removeEventListener(name, handBack));
        auto.current?.kill();
        setSpaceScroll(0);
      };
    },
    { scope: root },
  );

  return (
    <>
      <SiteNav />
      <main ref={root} className="home">
        <section className="story" aria-label="The story of the star detectives">
          <div className="story-stage">
            <h1 className="cap cap-center cap-open">
              In the vast <em>universe</em>&hellip;
            </h1>
            {CHAPTERS.map((c) => (
              <p key={c.from} className={`cap cap-step cap-${c.side}`}>
                {c.text}
              </p>
            ))}
            <p className="scroll-hint">Scroll, or sit back and watch</p>

            <div className="scope">
              <Image
                className="scope-img"
                src="/space/telescope-stars.jpg"
                alt="A cosmic sky full of stars observed by an astronomical observatory telescope"
                fill
                priority
                sizes="100vw"
              />
              <div className="scope-meta">
                <span className="scope-tag">Real Sky</span>
                <span className="scope-date">ESO / NASA · All-Sky Deep Field</span>
              </div>
              <div className="scope-cta">
                <Mascot size={96} />
                <h2>
                  A sky full of <em>stars</em>. Something out there is moving.
                </h2>
                <p>Can you spot it, detective?</p>
                <div className="scope-actions">
                  <StarBorder as={Link} href="/academy" color="#e8d7ff" className="cta-primary">
                    Start the academy
                  </StarBorder>
                  <Link href="/play" className="btn btn-secondary cta-secondary">
                    Skip to training
                  </Link>
                </div>
              </div>
            </div>

            <div className="story-controls">
              <button type="button" className="btn btn-secondary" onClick={() => (playing ? stop() : play())} aria-pressed={playing}>
                {playing ? "❚❚ Pause" : "▶ Play story"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={skip}>
                Skip ↓
              </button>
            </div>
          </div>
        </section>

        <div className="after">
          <section className="mission" aria-labelledby="mission-h">
            <div className="mission-head reveal">
              <div>
                <p className="eyebrow">Technical specifications</p>
                <h2 id="mission-h" className="mission-name">SPHEREx</h2>
              </div>
              <dl className="specs">
                {SPECS.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="mission-art" aria-hidden>
              <span className="mission-word">SPHEREx</span>
              <svg className="orbits" viewBox="0 0 600 600">
                <circle cx="300" cy="300" r="150" />
                <circle cx="300" cy="300" r="215" />
                <circle cx="300" cy="300" r="285" />
                <g className="orbit-dots">
                  <circle cx="300" cy="150" r="7" />
                  <circle cx="486" cy="192" r="5" />
                  <circle cx="92" cy="246" r="9" />
                  <circle cx="165" cy="551" r="4" />
                </g>
              </svg>
              <div className="mission-lens">
                <Image src="/figma/spherex-detector.jpeg" alt="" fill sizes="420px" />
              </div>
            </div>
            <p className="mission-note reveal">
              One telescope. The whole sky, again and again. Every pass is a new photo to compare with the last.
            </p>
          </section>

          <section className="method" aria-labelledby="method-h">
            <div className="method-copy reveal">
              <p className="eyebrow">The method</p>
              <h2 id="method-h" className="big-title">
                Blink.<br />
                Compare.<br />
                <em>Spot.</em>
              </h2>
              <p className="lede">
                Flip between two photos of the same sky. Stars stay put. Anything nearby jumps. The same trick found Pluto in 1930.
              </p>
            </div>
            <div className="blink-demo reveal" role="img" aria-label="Animation: two photos of the same stars alternate. One dot changes position between them.">
              <span className="blink-frame">
                {[
                  [12, 18, 3], [78, 12, 2], [34, 40, 2], [88, 52, 4], [20, 72, 3], [58, 84, 2], [70, 30, 2], [44, 64, 3], [8, 48, 2], [92, 86, 2],
                ].map(([x, y, r]) => (
                  <i key={`${x}-${y}`} style={{ left: `${x}%`, top: `${y}%`, width: r * 2, height: r * 2 }} />
                ))}
                <i className="mover" />
              </span>
              <span className="blink-label"><b>A</b><b>B</b></span>
            </div>
          </section>

          <section className="journey" aria-labelledby="journey-h">
            <div className="journey-head reveal">
              <p className="eyebrow">Five stages</p>
              <h2 id="journey-h" className="big-title">
                Your <em>journey</em>
              </h2>
            </div>
            <ol className="journey-list">
              {STAGES.map((s, i) => (
                <li key={s.n} className="journey-row">
                  <Link href={s.n >= 4 ? s.href : `/academy?stage=${s.n}`}>
                    <span className="journey-num">0{s.n}</span>
                    <span className="journey-name">{s.name}</span>
                    <span className="journey-blurb">{BLURBS[i]}</span>
                    <span className="journey-arrow" aria-hidden>↗</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </>
  );
}
