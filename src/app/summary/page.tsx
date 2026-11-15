import Image from "next/image";
import Link from "next/link";

export default function SummaryPage() {
  return (
    <main className="summary-page">
      <header className="summary-navigation">
        <Link className="summary-brand" href="/">Star Detective</Link>
        <span className="summary-mode">QUICK SPOTTER</span>
        <div className="summary-progress" aria-label="Patch 3 of 4">
          <span>Patch 3 of 4</span>
          <div className="summary-progress-lines" aria-hidden="true"><i className="active" /><i className="active" /><i className="active" /><i /></div>
        </div>
        <span className="summary-xp">XP <strong>150</strong></span>
        <nav className="summary-nav-actions" aria-label="Page actions">
          <Link href="/viewer">Viewer</Link>
          <Link className="wide" href="/about">About the data</Link>
        </nav>
      </header>

      <div className="summary-layout">
        <section className="evidence-image" aria-label="Evidence image">
          <Image src="/figma/spherex-detector.jpeg" alt="SPHEREx reference image showing a simulated moving object" fill priority sizes="(max-width: 760px) 100vw, 43vw" />
          <span className="summary-date">A&nbsp; - 27 MAR 2025</span>
          <span className="summary-scale">Scale not calibrated</span>
          <span className="motion-marker glitch-marker wrong-marker" aria-label="Simulated glitch marker">·</span>
          <span className="glitch-label wrong-label">ONE IMAGE ONLY</span>
        </section>

        <section className="result-column">
          <p className="result-eyebrow">THE EVIDENCE / PATCH 3</p>
          <h1>That was a glitch</h1>
          <p className="xp-earned wrong-xp">−25 XP</p>
          <p className="chosen-answer">You chose “I see movement”.</p>
          <span className="simulated-tag">Simulated glitch</span>

          <article className="evidence-card">
            <h2>Glitch example</h2>
            <p>Simulated camera artifact · design preview</p>
            <p className="evidence-data">27 Mar 2025 · demo A / B</p>
            <p>Movement not measured in demo</p>
            <a href="https://www.nasa.gov/" target="_blank" rel="noreferrer">NASA / JPL image source ↗</a>
          </article>

          <div className="how-tell">
            <p className="result-eyebrow">HOW YOU CAN TELL</p>
            <p>A cosmic ray can hit the camera in one image only. A mark that appears once is not evidence of movement across the sky.</p>
          </div>

          <div className="result-actions">
            <Link className="next-patch" href="/play">Next patch</Link>
            <Link className="open-viewer" href="/viewer">Open in viewer</Link>
          </div>
          <p className="summary-disclaimer">Example outcome. Replace with a verified patch and catalogue match before live play.</p>
        </section>
      </div>
      <p className="summary-footer">DESIGN PREVIEW · One SPHEREx reference image. A / B and target motion are simulated, not separate observations.</p>
    </main>
  );
}
