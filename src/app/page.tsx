"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

function Button({ children, href, variant = "primary", className = "" }: { children: React.ReactNode; href?: string; variant?: "primary" | "secondary" | "ghost"; className?: string }) {
  const classes = `button button-${variant} ${className}`;
  return href ? <a className={classes} href={href}>{children}</a> : <button className={classes}>{children}</button>;
}

export default function Home() {
  const [isBlinking, setIsBlinking] = useState(false);

  return (
    <main className="landing-page">
      <nav className="navigation" aria-label="Primary navigation">
        <Link className="brand" href="/">Star Detective</Link>
        <div className="nav-links">
          <Button href="/play" variant="secondary">Quick Spotter</Button>
          <Button href="/viewer" variant="ghost">Viewer</Button>
          <Button href="/about" variant="ghost">About the data</Button>
        </div>
      </nav>
      <section className="landing-content">
        <div className="intro-column">
          <p className="eyebrow">4 SKY PATCHES. ONE SIMPLE QUESTION.</p>
          <h1>Star<br />Detective</h1>
          <p className="intro-copy">Two photos of the same sky, taken at different times. Can you spot what moved?</p>
          <div className="intro-actions">
            <Button href="/play">Start hunting</Button>
            <Button href="/viewer" variant="ghost">Open the viewer</Button>
          </div>
          <p className="microcopy">Quick Spotter · No sign-up needed</p>
          <div className="mission-note">
            <p>Real images from NASA&apos;s SPHEREx mission</p>
            <span>Design preview · verified image pairs still required.</span>
          </div>
        </div>
        <div className="reference-column">
          <div className="sky-image">
            <Image src="/figma/spherex-detector.jpeg" alt="A dense field of stars from NASA's SPHEREx mission" fill priority sizes="(max-width: 760px) 100vw, 672px" />
            <span className="date-label">A · 27 MAR 2025</span>
            <span className="scale-label">Scale not calibrated</span>
          </div>
          <div className="comparison-bar">
            <button className="blink-control" onClick={() => setIsBlinking((value) => !value)} aria-pressed={isBlinking}>
              <Image src="/figma/asset-2.svg" alt="" width={20} height={20} />
              <span>Start blink</span><small>Slow</small>
            </button>
            <span>Blink is {isBlinking ? "on" : "off"} until you start it.</span>
          </div>
          <p className="image-caption">REFERENCE IMAGE · 27 Mar 2025 · NASA/JPL-Caltech · Uncalibrated commissioning image</p>
        </div>
      </section>
    </main>
  );
}
