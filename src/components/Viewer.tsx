"use client";

import { useState } from "react";
import BlinkControls, { useBlink } from "@/components/BlinkControls";
import PatchCard from "@/components/PatchCard";
import SiteNav from "@/components/SiteNav";
import SkyImage from "@/components/SkyImage";
import StatePanel from "@/components/StatePanel";
import SwipeCompare from "@/components/SwipeCompare";
import { SOURCE_URL } from "@/lib/demo";

const PATCHES = [
  { title: "Patch 01", lines: ["27 Mar 2025", "Reference preview"], ready: true },
  { title: "Patch 02", lines: ["Dataset pending", "Preview thumbnail"], ready: false },
  { title: "Patch 03", lines: ["Dataset pending", "Preview thumbnail"], ready: false },
  { title: "Patch 04", lines: ["Dataset pending", "Preview thumbnail"], ready: false },
];

type Mode = "blink" | "swipe";

export default function Viewer() {
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<Mode>("swipe");
  const blink = useBlink();
  const patch = PATCHES[selected];

  return (
    <div className="sd-page">
      <SiteNav active="viewer" />
      <main className="viewer">
        <aside className="patch-rail" aria-label="Prepared patches">
          <p className="rail-label rail-label-desktop">PREPARED PATCHES</p>
          <div className="rail-head-mobile">
            <h2>Choose a patch</h2>
            <span>4 slots · swipe →</span>
          </div>
          <div className="rail-list">
            {PATCHES.map((item, index) => (
              <PatchCard
                key={item.title}
                title={item.title}
                lines={item.lines}
                selected={index === selected}
                onSelect={() => {
                  setSelected(index);
                  blink.reset();
                }}
              />
            ))}
          </div>
          <p className="footnote rail-note">4 patch slots · 1 reference image</p>
        </aside>

        <section className="viewer-main" aria-label={`${patch.title} comparison`}>
          <div className="viewer-toolbar">
            <div className="mode-tabs" role="group" aria-label="Comparison mode">
              <button
                type="button"
                className={`btn ${mode === "blink" ? "btn-active" : "btn-ghost"}`}
                aria-pressed={mode === "blink"}
                onClick={() => setMode("blink")}
              >
                Blink
              </button>
              <button
                type="button"
                className={`btn ${mode === "swipe" ? "btn-active" : "btn-ghost"}`}
                aria-pressed={mode === "swipe"}
                onClick={() => setMode("swipe")}
              >
                Swipe
              </button>
            </div>
            <h1 className="viewer-title">{patch.title}</h1>
          </div>

          {patch.ready ? (
            <>
              <div className="viewer-image">
                <SkyImage side={mode === "blink" ? blink.side : "A"} showTarget={false}>
                  {mode === "swipe" && <SwipeCompare />}
                </SkyImage>
              </div>
              {mode === "blink" && <BlinkControls blink={blink} />}
              <div className="chip-row">
                <span className="chip chip-active">
                  <span className="chip-long">A · 27 Mar 2025</span>
                  <span className="chip-short">27 Mar 2025</span>
                </span>
                <span className="chip chip-empty">
                  <span className="chip-long">Date B · pending</span>
                  <span className="chip-short">Date B pending</span>
                </span>
              </div>
            </>
          ) : (
            <StatePanel
              className="viewer-state"
              label="NO SECOND DATE"
              title="SPHEREx has only one image of this spot so far."
              actions={
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={() => setSelected(0)}
                >
                  Try nearby patch
                </button>
              }
            >
              Choose a nearby prepared patch with two dates.
            </StatePanel>
          )}

          <div className="step-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSelected((selected + PATCHES.length - 1) % PATCHES.length)}
            >
              ← Previous image
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSelected((selected + 1) % PATCHES.length)}
            >
              Next image →
            </button>
          </div>
        </section>

        <aside className="details" aria-label="Data details">
          <span className="sheet-handle" aria-hidden />
          <h2 className="details-heading">
            <span className="details-heading-long">DATA DETAILS</span>
            <span className="details-heading-short">Data details</span>
          </h2>
          <dl>
            <div className="meta">
              <dt>Coordinates (RA / Dec)</dt>
              <dd>Not available in this reference</dd>
            </div>
            <div className="meta meta-desktop">
              <dt>Observation A</dt>
              <dd>27 Mar 2025</dd>
            </div>
            <div className="meta meta-desktop">
              <dt>Observation B</dt>
              <dd>Awaiting verified epoch</dd>
            </div>
            <div className="meta meta-mobile">
              <dt>Observation dates</dt>
              <dd>27 Mar 2025 · date B pending</dd>
            </div>
            <div className="meta">
              <dt>Wavelength</dt>
              <dd>Infrared detector preview</dd>
            </div>
          </dl>
          <p className="details-copy">
            False colour: infrared light is invisible, so colour is added.
          </p>
          <a className="details-link" href={SOURCE_URL} target="_blank" rel="noreferrer">
            NASA / JPL <span className="details-link-desktop">image </span>source ↗
          </a>
          <p className="details-label">REFERENCE PREVIEW</p>
          <p className="details-note">
            <span className="details-note-desktop">
              Swipe shows the comparison layout using one image. A second observation is still
              required. No coordinates or catalogue matches are inferred.
            </span>
            <span className="details-note-mobile">
              Preview only. All thumbnails and the comparison use one reference image, not verified
              paired observations.
            </span>
          </p>
        </aside>
      </main>
      <p className="footnote viewer-footnote">
        All thumbnails use the same SPHEREx reference. Four real patch pairs and names will come from
        the prepared dataset.
      </p>
    </div>
  );
}
