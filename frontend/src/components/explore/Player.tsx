"use client";
/* eslint-disable @next/next/no-img-element -- frames are dynamic PNGs rendered by our API */

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  DETECTORS,
  MODES,
  STRETCHES,
  combineUrl,
  formatDay,
  frameUrl,
  scaleBar,
  type Detector,
  type Mode,
  type SkySearch,
  type Stretch,
  type View,
} from "@/lib/sky";
import { usePreload } from "./usePreload";
import type { UrlPatch } from "./useExploreUrl";

const SIZE = 512;
const SPEEDS = [0.5, 1, 2, 3, 4];

const MODE_LABEL: Record<Mode, string> = {
  flip: "Flip-book",
  blink: "Blink",
  swipe: "Swipe",
  diff: "Difference",
  stack: "Stack",
};

const MODE_HELP: Record<Mode, string> = {
  flip: "Every SPHEREx visit in date order. Stars stay put; anything that moves hops from frame to frame.",
  blink: "Flip between two dates. A moving object jumps; a star stays still.",
  swipe: "Drag the divider (or focus it and use the arrow keys) to compare two dates.",
  diff: "B minus A. White (orange when faint) = appeared, brighter on date B. Blue = disappeared, brighter on date A. Black = no change.",
  stack: "A and B added together. A mover shows up twice; steady stars just get brighter.",
};

export type Pick = { fx: number; fy: number } | null;

export default function Player({
  view,
  search,
  mode,
  detector,
  stretch,
  epochId,
  aId,
  bId,
  reducedMotion,
  pick,
  onPick,
  onUrl,
}: {
  view: View;
  search: SkySearch;
  mode: Mode;
  detector: Detector;
  stretch: Stretch;
  epochId: string | null;
  aId: string | null;
  bId: string | null;
  reducedMotion: boolean;
  pick: Pick;
  onPick?: (pick: { fx: number; fy: number }) => void;
  onUrl: (patch: UrlPatch) => void;
}) {
  const ids = useId();
  const epochs = useMemo(() => [...search.epochs].sort((x, y) => x.mjd - y.mjd), [search.epochs]);
  const n = epochs.length;
  const indexOf = (id: string | null) => (id ? epochs.findIndex((e) => e.id === id) : -1);

  const urlIndex = indexOf(epochId);
  const [index, setIndex] = useState<number | null>(null);
  const current = Math.min(n - 1, Math.max(0, index ?? (urlIndex >= 0 ? urlIndex : 0)));
  const aIndex = indexOf(aId) >= 0 ? indexOf(aId) : 0;
  const bIndex = indexOf(bId) >= 0 ? indexOf(bId) : n - 1;

  const [side, setSide] = useState<"A" | "B">("A");
  const [fps, setFps] = useState(2);
  const [loop, setLoop] = useState(true);
  const [play, setPlay] = useState<"auto" | "on" | "off">("auto");
  const [nonce, setNonce] = useState(0);

  const withNonce = (url: string) => (nonce ? `${url}&_r=${nonce}` : url);
  const frames = epochs.map((e) => withNonce(frameUrl(view, e.id, detector, stretch, SIZE)));
  const combine =
    mode === "diff" || mode === "stack"
      ? withNonce(combineUrl(view, epochs[aIndex]?.id ?? "", epochs[bIndex]?.id ?? "", mode === "diff" ? "diff" : "sum", detector, SIZE))
      : "";
  const needed =
    mode === "flip" ? frames : mode === "diff" || mode === "stack" ? [combine] : [frames[aIndex], frames[bIndex]];
  const preload = usePreload(n ? needed : []);

  const playable = (mode === "flip" || mode === "blink") && preload.ready && preload.loaded > 1 && n > 1;
  const playing = playable && (play === "on" || (play === "auto" && !reducedMotion));

  // Interval callbacks read the latest frame from a ref.
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (mode === "blink") {
        setSide((value) => (value === "A" ? "B" : "A"));
        return;
      }
      const at = currentRef.current;
      if (at >= n - 1) {
        if (loop) setIndex(0);
        else setPlay("off");
      } else {
        setIndex(at + 1);
      }
    }, 1000 / fps);
    return () => window.clearInterval(timer);
  }, [playing, fps, loop, mode, n]);

  function goTo(next: number) {
    const clamped = ((next % n) + n) % n;
    setPlay("off");
    setIndex(clamped);
    onUrl({ epoch: epochs[clamped].id });
  }

  function togglePlay() {
    if (!playable) return;
    if (playing) {
      setPlay("off");
      if (mode === "flip") onUrl({ epoch: epochs[current].id });
    } else {
      if (mode === "flip" && !loop && current >= n - 1) setIndex(0);
      setPlay("on");
    }
  }

  function step(delta: 1 | -1) {
    if (mode === "blink") {
      setPlay("off");
      setSide(delta < 0 ? "A" : "B");
    } else if (mode === "flip") {
      goTo(current + delta);
    }
  }

  // Keyboard: space = play/pause, arrows = step. Ignore form fields and sliders.
  const keyRef = useRef({ togglePlay, step });
  useEffect(() => {
    keyRef.current = { togglePlay, step };
  });
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, [role='slider'], [contenteditable='true'], .ex-aladin")) return;
      if (event.code === "Space") {
        if (target?.closest("button, a, summary")) return; // native activation
        event.preventDefault();
        keyRef.current.togglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        keyRef.current.step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        keyRef.current.step(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (n === 0) {
    return (
      <div className="ex-empty" role="status">
        <p className="ex-error-title">SPHEREx has not imaged this spot yet.</p>
        <p className="ex-error-body">
          {search.notes.filter((note) => !/^Collections searched/i.test(note)).join(" ") ||
            "SPHEREx maps the whole sky every six months, so new dates keep arriving."}{" "}
          Try another target or a larger field of view.
        </p>
      </div>
    );
  }

  const tag = search.data_tag || "Real";
  const allFailed = preload.ready && preload.loaded === 0;
  const shownEpoch = mode === "flip" ? epochs[current] : mode === "blink" ? epochs[side === "A" ? aIndex : bIndex] : null;
  const dateLabel =
    mode === "flip"
      ? `${formatDay(epochs[current].date_obs)} · ${current + 1}/${n}`
      : mode === "blink"
        ? `${side} · ${formatDay(shownEpoch!.date_obs)}`
        : mode === "diff"
          ? `B − A · ${formatDay(epochs[aIndex].date_obs)} → ${formatDay(epochs[bIndex].date_obs)}`
          : mode === "swipe"
            ? null
            : `A + B · ${formatDay(epochs[aIndex].date_obs)} + ${formatDay(epochs[bIndex].date_obs)}`;

  function clickImage(event: ReactPointerEvent<HTMLDivElement>) {
    if (!onPick || mode === "swipe") return;
    const box = event.currentTarget.getBoundingClientRect();
    const fx = (event.clientX - box.left) / box.width;
    const fy = (event.clientY - box.top) / box.height;
    if (fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1) onPick({ fx, fy });
  }

  const visibleFrame = (url: string, i: number, visible: boolean, extra = "") =>
    preload.status(url) === "ok" ? (
      <img
        key={`${i}-${url}`}
        src={url}
        alt=""
        className={`ex-frame${extra}`}
        data-on={visible || undefined}
        draggable={false}
      />
    ) : null;

  const scale = scaleBar(view.fov);
  const altText = `SPHEREx ${MODE_LABEL[mode].toLowerCase()} view of RA ${view.ra.toFixed(4)}°, Dec ${view.dec.toFixed(4)}°, ${view.fov}′ field${dateLabel ? `, ${dateLabel}` : ""}`;

  return (
    <div className="ex-player">
      <div className="ex-modes" role="group" aria-label="Viewing mode">
        {MODES.map((value) => (
          <button
            key={value}
            type="button"
            className={`ex-pill${mode === value ? " is-on" : ""}`}
            aria-pressed={mode === value}
            disabled={n < 2 && value !== "flip"}
            onClick={() => {
              setPlay("auto");
              onUrl({ mode: value === "flip" ? null : value });
            }}
          >
            {MODE_LABEL[value]}
          </button>
        ))}
      </div>

      <figure className="ex-figure">
        <div
          className="ex-stage"
          role="group"
          aria-label={altText}
          onPointerUp={clickImage}
          data-pickable={onPick && mode !== "swipe" ? true : undefined}
        >
          {mode === "flip" && frames.map((url, i) => visibleFrame(url, i, i === current))}
          {mode === "blink" && (
            <>
              {visibleFrame(frames[aIndex], aIndex, side === "A")}
              {bIndex !== aIndex && visibleFrame(frames[bIndex], bIndex, side === "B")}
            </>
          )}
          {mode === "swipe" && <Swipe a={frames[aIndex]} b={frames[bIndex]} ready={preload.ready} aDate={epochs[aIndex].date_obs} bDate={epochs[bIndex].date_obs} />}
          {(mode === "diff" || mode === "stack") && visibleFrame(combine, -1, true)}

          {mode === "flip" && preload.status(frames[current]) === "err" && (
            <p className="ex-frame-missing">This date could not be rendered.</p>
          )}

          <Overlay pick={pick} scaleLabel={scale.label} scaleFraction={scale.fraction} />

          {dateLabel && (
            <span className="ex-date" aria-live={playing ? "off" : "polite"}>
              {dateLabel}
            </span>
          )}
          <span className="ex-tag">{tag}</span>

          {!preload.ready && (
            <div className="ex-loading" role="status">
              <span>
                Loading {preload.total > 1 ? "frames" : "image"} {preload.loaded + preload.failed}/{preload.total}
              </span>
              {preload.loaded === 0 && <small>A new patch of sky can take a few minutes the first time while we fetch it from NASA. After that it&apos;s instant.</small>}
              <span className="ex-progress" aria-hidden>
                <i style={{ width: `${((preload.loaded + preload.failed) / Math.max(1, preload.total)) * 100}%` }} />
              </span>
            </div>
          )}
          {allFailed && (
            <div className="ex-loading ex-loading-err" role="alert">
              <span>The images could not be rendered. NASA’s archive may be busy.</span>
              <button type="button" className="btn btn-primary" onClick={() => setNonce((value) => value + 1)}>
                Try again
              </button>
            </div>
          )}
        </div>
        <figcaption className="ex-credit">
          <span>NASA/JPL-Caltech/IPAC · SPHEREx</span>
          {preload.failed > 0 && !allFailed && <span>{preload.failed} of {preload.total} frames failed to load</span>}
        </figcaption>
      </figure>

      {mode === "flip" && (
        <div className="ex-transport">
          <div className="ex-buttons">
            <button type="button" className="ex-icon-btn" onClick={() => step(-1)} aria-label="Previous date" disabled={n < 2}>
              <svg viewBox="0 0 24 24" aria-hidden><path d="M7 5v14M19 5 9 12l10 7z" /></svg>
            </button>
            <button
              type="button"
              className="ex-icon-btn ex-play"
              onClick={togglePlay}
              disabled={!playable}
              aria-label={playing ? "Pause" : "Play"}
              aria-keyshortcuts="Space"
            >
              {playing ? (
                <svg viewBox="0 0 24 24" aria-hidden><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden><path d="M7 4l13 8-13 8z" /></svg>
              )}
            </button>
            <button type="button" className="ex-icon-btn" onClick={() => step(1)} aria-label="Next date" disabled={n < 2}>
              <svg viewBox="0 0 24 24" aria-hidden><path d="M17 5v14M5 5l10 7-10 7z" /></svg>
            </button>
            <button
              type="button"
              className={`ex-pill ex-pill-sm${loop ? " is-on" : ""}`}
              aria-pressed={loop}
              onClick={() => setLoop((value) => !value)}
            >
              Loop
            </button>
            <SpeedSelect id={`${ids}-fps`} fps={fps} setFps={setFps} />
          </div>
          <Timeline
            id={`${ids}-scrub`}
            dates={epochs.map((e) => e.date_obs)}
            value={current}
            onChange={goTo}
          />
        </div>
      )}

      {mode === "blink" && (
        <div className="ex-transport">
          <div className="ex-buttons">
            <button
              type="button"
              className={`ex-pill${side === "A" && !playing ? " is-on" : ""}`}
              aria-pressed={side === "A" && !playing}
              onClick={() => step(-1)}
            >
              ← A
            </button>
            <button
              type="button"
              className="ex-icon-btn ex-play"
              onClick={togglePlay}
              disabled={!playable}
              aria-label={playing ? "Stop blinking" : "Start blinking"}
              aria-keyshortcuts="Space"
            >
              {playing ? (
                <svg viewBox="0 0 24 24" aria-hidden><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden><path d="M7 4l13 8-13 8z" /></svg>
              )}
            </button>
            <button
              type="button"
              className={`ex-pill${side === "B" && !playing ? " is-on" : ""}`}
              aria-pressed={side === "B" && !playing}
              onClick={() => step(1)}
            >
              B →
            </button>
            <SpeedSelect id={`${ids}-fps`} fps={fps} setFps={setFps} />
          </div>
        </div>
      )}

      <div className="ex-settings">
        {mode !== "flip" && (
          <>
            <EpochSelect id={`${ids}-a`} label="Date A" epochs={epochs} value={aIndex} onChange={(i) => onUrl({ a: epochs[i].id })} />
            <EpochSelect id={`${ids}-b`} label="Date B" epochs={epochs} value={bIndex} onChange={(i) => onUrl({ b: epochs[i].id })} />
          </>
        )}
        <div className="ex-field">
          <label className="ex-label" htmlFor={`${ids}-det`}>
            Detector
          </label>
          <select
            id={`${ids}-det`}
            className="ex-select"
            value={detector}
            onChange={(e) => onUrl({ detector: e.target.value === "all" ? null : e.target.value })}
          >
            {DETECTORS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} · {d.range}
              </option>
            ))}
          </select>
        </div>
        <div className="ex-field">
          <label className="ex-label" htmlFor={`${ids}-str`}>
            Stretch
          </label>
          <select
            id={`${ids}-str`}
            className="ex-select"
            value={stretch}
            disabled={mode === "diff" || mode === "stack"}
            onChange={(e) => onUrl({ stretch: e.target.value === "asinh" ? null : e.target.value })}
          >
            {STRETCHES.map((s) => (
              <option key={s} value={s}>
                {s === "asinh" ? "Asinh (balanced)" : s === "linear" ? "Linear" : "Log (faint detail)"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className={`ex-help${mode === "diff" ? " ex-help-diff" : ""}`}>
        {mode === "diff" && (
          <span className="ex-diff-key" aria-hidden>
            <i className="k-white" /> appeared <i className="k-blue" /> disappeared
          </span>
        )}
        {MODE_HELP[mode]}
        {onPick && mode !== "swipe" && " Tap the image to see the spectrum at that spot."}
      </p>
    </div>
  );
}

function SpeedSelect({ id, fps, setFps }: { id: string; fps: number; setFps: (fps: number) => void }) {
  return (
    <div className="ex-speed">
      <label htmlFor={id} className="ex-label">
        Speed
      </label>
      <select id={id} className="ex-select ex-select-sm" value={fps} onChange={(e) => setFps(Number(e.target.value))}>
        {SPEEDS.map((value) => (
          <option key={value} value={value}>
            {value} fps
          </option>
        ))}
      </select>
    </div>
  );
}

function EpochSelect({
  id,
  label,
  epochs,
  value,
  onChange,
}: {
  id: string;
  label: string;
  epochs: SkySearch["epochs"];
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="ex-field">
      <label className="ex-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="ex-select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {epochs.map((epoch, i) => (
          <option key={epoch.id} value={i}>
            {formatDay(epoch.date_obs)} · {epoch.n_images} img
          </option>
        ))}
      </select>
    </div>
  );
}

function Timeline({
  id,
  dates,
  value,
  onChange,
}: {
  id: string;
  dates: string[];
  value: number;
  onChange: (index: number) => void;
}) {
  const n = dates.length;
  return (
    <div className="ex-timeline">
      <label htmlFor={id} className="sr-only">
        Observation date
      </label>
      <div className="ex-track">
        <input
          id={id}
          type="range"
          min={0}
          max={Math.max(0, n - 1)}
          step={1}
          value={value}
          disabled={n < 2}
          aria-valuetext={`${formatDay(dates[value])}, date ${value + 1} of ${n}`}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="ex-ticks" aria-hidden>
          {dates.map((date, i) => (
            <i
              key={`${date}-${i}`}
              className={i === value ? "is-on" : undefined}
              style={{ left: n > 1 ? `${(i / (n - 1)) * 100}%` : "50%" }}
            />
          ))}
        </div>
      </div>
      <div className="ex-timeline-ends">
        <span>{formatDay(dates[0])}</span>
        <b>{formatDay(dates[value])}</b>
        <span>{formatDay(dates[n - 1])}</span>
      </div>
    </div>
  );
}

function Overlay({ pick, scaleLabel, scaleFraction }: { pick: Pick; scaleLabel: string; scaleFraction: number }) {
  return (
    <div className="ex-overlay" aria-hidden>
      <svg className="ex-cross" viewBox="0 0 100 100">
        <path d="M50 38V45M50 55V62M38 50H45M55 50H62" />
      </svg>
      {pick && (
        <svg className="ex-pick" viewBox="0 0 100 100">
          <circle cx={pick.fx * 100} cy={pick.fy * 100} r={2.4} />
        </svg>
      )}
      <div className="ex-scale" style={{ width: `${scaleFraction * 100}%` }}>
        <span>{scaleLabel}</span>
        <i />
      </div>
      <svg className="ex-compass" viewBox="0 0 48 48">
        <path d="M34 34V12M34 12l-4 6M34 12l4 6M34 34H12M12 34l6-4M12 34l6 4" />
        <text x="34" y="8">N</text>
        <text x="5" y="37">E</text>
      </svg>
    </div>
  );
}

function Swipe({ a, b, ready, aDate, bDate }: { a: string; b: string; ready: boolean; aDate: string; bDate: string }) {
  const [position, setPosition] = useState(50);
  const frame = useRef<HTMLDivElement>(null);

  function moveTo(clientX: number) {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100)));
  }

  return (
    <div
      ref={frame}
      className="ex-swipe"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) moveTo(event.clientX);
      }}
    >
      {ready && <img src={a} alt="" className="ex-frame" data-on draggable={false} />}
      {ready && (
        <img
          src={b}
          alt=""
          className="ex-frame"
          data-on
          draggable={false}
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        />
      )}
      <span className="ex-swipe-label ex-swipe-a">A · {formatDay(aDate)}</span>
      <span className="ex-swipe-label ex-swipe-b">B · {formatDay(bDate)}</span>
      <div className="ex-swipe-line" style={{ left: `${position}%` }} />
      <div
        className="ex-swipe-grip"
        style={{ left: `${position}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Swipe position between date A and date B"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setPosition((value) => Math.max(0, value - 5));
          if (event.key === "ArrowRight") setPosition((value) => Math.min(100, value + 5));
        }}
      >
        ↔
      </div>
    </div>
  );
}
