"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const imageSrc = "/figma/spherex-detector.jpeg";
const patches = ["Patch 01", "Patch 02", "Patch 03", "Patch 04"];

export default function ViewerPage() {
  const [selectedPatch, setSelectedPatch] = useState(0);
  const [mode, setMode] = useState<"blink" | "swipe">("swipe");
  const [split, setSplit] = useState(50);

  return (
    <main className="viewer-page">
      <header className="viewer-navigation">
        <Link className="viewer-brand" href="/">Star Detective</Link>
        <nav className="viewer-nav-actions" aria-label="Page actions">
          <Link href="/play">Quick Spotter</Link>
          <Link className="current" href="/viewer">Viewer</Link>
          <Link href="/about">About the data</Link>
        </nav>
      </header>

      <div className="viewer-shell">
        <aside className="patch-sidebar">
          <p className="sidebar-label">PREPARED PATCHES</p>
          <div className="patch-list">
            {patches.map((patch, index) => (
              <button className={`patch-item ${selectedPatch === index ? "selected" : ""}`} key={patch} type="button" onClick={() => setSelectedPatch(index)}>
                <Image src={imageSrc} alt="" width={45} height={45} />
                <span><strong>{patch}</strong><small>{index === 0 ? "27 Mar 2025" : "Dataset pending"}</small><small>{index === 0 ? "Reference preview" : "Preview thumbnail"}</small></span>
              </button>
            ))}
          </div>
          <p className="sidebar-footnote">4 patch slots · 1 reference image</p>
        </aside>

        <section className="viewer-main" aria-label="Image comparison viewer">
          <div className="viewer-toolbar">
            <div className="mode-tabs" role="tablist" aria-label="Comparison mode">
              <button className={mode === "blink" ? "active" : ""} type="button" onClick={() => setMode("blink")} role="tab" aria-selected={mode === "blink"}>Blink</button>
              <button className={mode === "swipe" ? "active" : ""} type="button" onClick={() => setMode("swipe")} role="tab" aria-selected={mode === "swipe"}>Swipe</button>
            </div>
            <h1>Patch 01</h1>
          </div>

          <div className={`comparison-stage ${mode === "blink" ? "blink-mode" : ""}`}>
            <Image className="comparison-image base" src={imageSrc} alt="SPHEREx reference image A" fill sizes="(max-width: 760px) 100vw, 52vw" priority />
            <div className="comparison-image reveal" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
              <Image src={imageSrc} alt="SPHEREx reference image B" fill sizes="(max-width: 760px) 100vw, 52vw" />
            </div>
            <span className="image-date">A&nbsp; · 27 MAR 2025</span>
            <span className="image-label left">Image A</span>
            <span className="image-label right">Demo B</span>
            {mode === "swipe" && <input className="comparison-slider" type="range" min="20" max="80" value={split} onChange={(event) => setSplit(Number(event.target.value))} aria-label="Comparison split position" />}
            <span className="scale-label-viewer">Scale not calibrated</span>
          </div>

          <div className="date-controls">
            <button className="date-button active" type="button">A&nbsp; · 27 MAR 2025</button>
            <button className="date-button" type="button">Date B · pending</button>
          </div>
          <div className="image-navigation">
            <button type="button" onClick={() => setSelectedPatch(Math.max(0, selectedPatch - 1))}>← Previous image</button>
            <button type="button" onClick={() => setSelectedPatch(Math.min(patches.length - 1, selectedPatch + 1))}>Next image →</button>
          </div>
        </section>

        <aside className="data-panel">
          <p className="sidebar-label">DATA DETAILS</p>
          <dl>
            <div><dt>Coordinates (RA / Dec)</dt><dd>Not available in this reference</dd></div>
            <div><dt>Observation A</dt><dd>27 Mar 2025</dd></div>
            <div><dt>Observation B</dt><dd>Awaiting verified epoch</dd></div>
            <div><dt>Wavelength</dt><dd>Infrared detector preview</dd></div>
          </dl>
          <p className="false-colour">False colour: infrared light is invisible, so colour is added.</p>
          <a className="source-link" href="https://www.nasa.gov/" target="_blank" rel="noreferrer">NASA / JPL image source ↗</a>
          <p className="sidebar-label reference-label">REFERENCE PREVIEW</p>
          <p className="panel-copy">Swipe shows the comparison layout using one image. A second observation is still required. No coordinates or date changes are inferred.</p>
        </aside>
      </div>
      <p className="viewer-footer">All thumbnails use the same SPHEREx reference. Four real patch pairs and more will come from the prepared dataset.</p>
    </main>
  );
}
