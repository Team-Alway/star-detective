"use client";

import { useEffect, useState } from "react";
import {
  CircleDot,
  Clock,
  CloudSnow,
  Compass,
  Disc,
  Eye,
  Flame,
  Globe,
  HelpCircle,
  Layers,
  MoveUpRight,
  Orbit,
  Palette,
  Rocket,
  Ruler,
  Satellite,
  Search,
  Snowflake,
  Sparkle,
  Sparkles,
  Sun,
  ZapOff,
  type LucideIcon,
} from "lucide-react";
import type { AcademyCard } from "@/content/academy";
import "@/app/inner-game.css";

const ICONS: Record<string, LucideIcon> = {
  flame: Flame,
  palette: Palette,
  satellite: Satellite,
  sparkles: Sparkles,
  orbit: Orbit,
  "circle-dot": CircleDot,
  "zap-off": ZapOff,
  "search-check": Search,
  globe: Globe,
  compass: Compass,
  "move-up-right": MoveUpRight,
  layers: Layers,
  snowflake: Snowflake,
  rocket: Rocket,
  "help-circle": HelpCircle,
  sun: Sun,
  disc: Disc,
  "cloud-snow": CloudSnow,
  ruler: Ruler,
  eye: Eye,
  clock: Clock,
};

const pad = (n: number) => String(n).padStart(2, "0");

const STARS: [number, number, boolean?][] = [
  [14, 22], [80, 16, true], [64, 76], [28, 80], [90, 60], [42, 34], [8, 58], [72, 44, true],
];

function MiniStars() {
  return (
    <>
      {STARS.map(([x, y, big]) => (
        <span key={`${x}-${y}`} className={`ig-star ${big ? "ig-star-lg" : ""}`} style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
    </>
  );
}

function VisibleVsInfrared() {
  const [mode, setMode] = useState<"visible" | "infrared">("infrared");
  return (
    <div className="ig-vis">
      <div className="ig-vis-head">
        <p className="ig-eyebrow">Try it</p>
        <div className="ig-seg" role="group" aria-label="Light to look with">
          <button type="button" aria-pressed={mode === "visible"} onClick={() => setMode("visible")}>
            Our eyes
          </button>
          <button type="button" aria-pressed={mode === "infrared"} onClick={() => setMode("infrared")}>
            Infrared
          </button>
        </div>
      </div>
      <div className="ig-mini-sky" aria-hidden>
        <MiniStars />
        <span className="ig-glow" style={{ opacity: mode === "infrared" ? 1 : 0 }} />
        <span className="ig-mini-tag">{mode === "infrared" ? "Infrared view" : "Visible light view"}</span>
      </div>
      <p className="ig-vis-cap" aria-live="polite">
        {mode === "infrared"
          ? "In infrared, a cool, dim object glows in the middle of the picture."
          : "With our eyes, the same spot looks empty. The object is too cool and dim to see."}
      </p>
    </div>
  );
}

function FalseColour() {
  const bands = [
    { label: "Shorter", color: "linear-gradient(90deg,#1e40af,#38bdf8)", name: "Blue" },
    { label: "Middle", color: "linear-gradient(90deg,#047857,#5eead4)", name: "Green" },
    { label: "Longer", color: "linear-gradient(90deg,#be123c,#fbbf24)", name: "Red" },
  ];
  return (
    <div className="ig-vis">
      <div className="ig-vis-head">
        <p className="ig-eyebrow">Example colour key</p>
      </div>
      <div className="ig-band">
        {bands.map((b) => (
          <div key={b.name} className="ig-band-row">
            <span>{b.label} IR</span>
            <span className="ig-band-bar" style={{ background: b.color }} aria-hidden />
            <span>{b.name}</span>
          </div>
        ))}
      </div>
      <p className="ig-vis-cap">
        Software gives each kind of invisible infrared light a colour we can see. This key is an example: each
        image picks its own.
      </p>
    </div>
  );
}

function SpherexFacts() {
  return (
    <div className="ig-vis">
      <div className="ig-vis-head">
        <p className="ig-eyebrow">SPHEREx at a glance</p>
      </div>
      <div className="ig-bignums">
        <div className="ig-bignum">
          <b>102</b>
          <span>Infrared colours</span>
        </div>
        <div className="ig-bignum">
          <b>~6</b>
          <span>Months per sky map</span>
        </div>
        <div className="ig-bignum">
          <b>2025</b>
          <span>Launched</span>
        </div>
      </div>
      <dl className="ig-spec" style={{ marginTop: 20 }}>
        <div>
          <dt>Operator</dt>
          <dd>NASA</dd>
        </div>
        <div>
          <dt>Sees</dt>
          <dd>Near-infrared light</dd>
        </div>
      </dl>
    </div>
  );
}

function PlutoBlink() {
  const [plate, setPlate] = useState<"A" | "B">("A");
  const [playing, setPlaying] = useState(false); // never starts on its own

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setPlate((p) => (p === "A" ? "B" : "A")), 1000);
    return () => window.clearInterval(t);
  }, [playing]);

  return (
    <div className="ig-vis">
      <div className="ig-vis-head">
        <p className="ig-eyebrow">Blink like Tombaugh</p>
        <div className="ig-seg" role="group" aria-label="Photo plate">
          <button type="button" aria-pressed={!playing && plate === "A"} onClick={() => { setPlaying(false); setPlate("A"); }}>
            A
          </button>
          <button type="button" aria-pressed={!playing && plate === "B"} onClick={() => { setPlaying(false); setPlate("B"); }}>
            B
          </button>
          <button type="button" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
            {playing ? "Stop" : "Blink"}
          </button>
        </div>
      </div>
      <div className="ig-mini-sky" aria-hidden>
        <MiniStars />
        <span className="ig-mover" style={plate === "A" ? { left: "47%", top: "52%" } : { left: "56%", top: "46%" }} />
        <span className="ig-mini-tag">Plate {plate} · {plate === "A" ? "23 Jan 1930" : "29 Jan 1930"}</span>
      </div>
      <p className="ig-vis-cap">
        Switch between A and B. The stars stay put. The yellow dot jumps: that was Pluto.
      </p>
    </div>
  );
}

function GlitchVsReal() {
  return (
    <div className="ig-vis">
      <div className="ig-compare">
        <div>
          <h4 style={{ color: "var(--sd-wrong)" }}>✕ Glitch</h4>
          <p>A particle hits the camera once.</p>
          <dl className="ig-spec">
            <div><dt>Image A</dt><dd>Dot</dd></div>
            <div><dt>Image B</dt><dd>Gone</dd></div>
          </dl>
        </div>
        <div>
          <h4 style={{ color: "var(--sd-correct)" }}>✓ Real object</h4>
          <p>It is there every time, maybe in a new place.</p>
          <dl className="ig-spec">
            <div><dt>Image A</dt><dd>Dot</dd></div>
            <div><dt>Image B</dt><dd>Dot</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function AuScale() {
  const stops = [
    { name: "Sun", au: 0, color: "#fbbf24" },
    { name: "Earth", au: 1, color: "#38bdf8" },
    { name: "Jupiter", au: 5.2, color: "#c9b6ff" },
    { name: "Neptune", au: 30, color: "#83d9f1" },
  ];
  return (
    <div className="ig-vis">
      <div className="ig-vis-head">
        <p className="ig-eyebrow">Drawn to scale</p>
      </div>
      <div className="ig-au-line" aria-hidden>
        {stops.map((s) => (
          <span key={s.name} className="ig-au-dot" style={{ left: `${(s.au / 30) * 100}%`, background: s.color }} />
        ))}
      </div>
      <dl className="ig-spec" style={{ marginTop: 28 }}>
        {stops.map((s) => (
          <div key={s.name}>
            <dt>{s.name}</dt>
            <dd>{s.au} AU</dd>
          </div>
        ))}
      </dl>
      <p className="ig-vis-cap">1 AU ≈ 150 million km. Earth is that tiny gap next to the Sun.</p>
    </div>
  );
}

function Parallax() {
  return (
    <div className="ig-vis">
      <div className="ig-vis-head">
        <p className="ig-eyebrow">Near vs far</p>
      </div>
      <div className="ig-parallax">
        <div>
          <span className="ig-row-num" style={{ fontSize: 34, color: "var(--sd-accent)" }} aria-hidden>●</span>
          <p>You, moving</p>
        </div>
        <div>
          <span className="ig-row-num" style={{ fontSize: 34, color: "#ffd27a" }} aria-hidden>↔</span>
          <p>Near object: shifts a lot</p>
        </div>
        <div>
          <span className="ig-row-num" style={{ fontSize: 34, color: "#fff" }} aria-hidden>· · ·</span>
          <p>Far stars: stay put</p>
        </div>
      </div>
    </div>
  );
}

const VISUAL_ICONS = ["flame", "palette", "satellite", "layers", "zap-off", "ruler", "eye"];

function Visual({ icon }: { icon: string }) {
  switch (icon) {
    case "flame":
      return <VisibleVsInfrared />;
    case "palette":
      return <FalseColour />;
    case "satellite":
      return <SpherexFacts />;
    case "layers":
      return <PlutoBlink />;
    case "zap-off":
      return <GlitchVsReal />;
    case "ruler":
      return <AuScale />;
    case "eye":
      return <Parallax />;
    default:
      return null;
  }
}

/** One lesson card: counter, big title, child-readable text, optional tip and visual. */
export default function LessonCard({ card, index, total }: { card: AcademyCard; index: number; total: number }) {
  const Icon = ICONS[card.icon] ?? Sparkle;
  const hasVisual = VISUAL_ICONS.includes(card.icon);

  return (
    <article data-lesson-card className={`ig-card ${hasVisual ? "" : "ig-card-solo"}`} aria-roledescription="lesson card">
      <div>
        <div className="ig-card-kicker">
          <span className="ig-card-icon" aria-hidden>
            <Icon size={22} strokeWidth={1.75} />
          </span>
          <p className="ig-count" aria-label={`Card ${index + 1} of ${total}`}>
            <b>{pad(index + 1)}</b> / {pad(total)}
          </p>
        </div>
        <h2 className="ig-card-title">{card.title}</h2>
        <p className="ig-card-text">{card.text}</p>
        {card.intel && (
          <div className="ig-tip">
            <p className="ig-eyebrow">
              <b>Detective tip</b>
            </p>
            <p>{card.intel}</p>
          </div>
        )}
      </div>
      {hasVisual && (
        <div>
          <Visual icon={card.icon} />
        </div>
      )}
    </article>
  );
}
