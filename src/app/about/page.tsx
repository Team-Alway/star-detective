import Link from "next/link";

const labels = [
  { title: "Real", className: "real", copy: "An observation from the mission. “Known object” means it has been identified; “unverified” means it has not." },
  { title: "Glitch", className: "glitch", copy: "An artifact from the detector or processing, not a moving object. Different wavelengths can also create apparent changes." },
  { title: "Candidate", className: "candidate", copy: "An unusual signal that still needs checks. A candidate is not a discovery." },
  { title: "Simulated", className: "simulated", copy: "A real background with a test target added. Added targets and motion are disclosed on the reveal." },
];

export default function AboutPage() {
  return (
    <main className="about-page">
      <header className="about-navigation">
        <Link className="about-brand" href="/">Star Detective</Link>
        <nav className="about-nav-actions" aria-label="Page actions">
          <Link href="/play">Quick Spotter</Link>
          <Link href="/viewer">Viewer</Link>
          <Link className="current" href="/about">About the data</Link>
        </nav>
      </header>

      <div className="about-content">
        <p className="about-eyebrow">THE DATA BEHIND THE DOTS</p>
        <h1>Real sky. Honest labels.</h1>
        <p className="about-lede">A way to practice looking — not a claim to find Planet X.</p>

        <section className="label-grid" aria-label="Data labels">
          {labels.map((label) => (
            <article className="label-card" key={label.title}>
              <h2 className={label.className}>{label.title}</h2>
              <p>{label.copy}</p>
            </article>
          ))}
        </section>

        <section className="about-columns">
          <article>
            <h2>What is SPHEREx?</h2>
            <p>SPHEREx is a NASA mission surveying the sky in infrared light. Its detectors measure light in wavelength bands. Infrared is invisible to our eyes, so visible colours are assigned to make a false-colour image.</p>
          </article>
          <article>
            <h2>Why do candidates need checks?</h2>
            <p>Most candidates turn out to be known objects or image artifacts. Compare independent observations and check catalogues before drawing conclusions. One bright mark in one image is not evidence of a new object.</p>
          </article>
        </section>

        <aside className="about-source">
          <div>
            <p>ABOUT THIS DESIGN PREVIEW</p>
            <small>PIA26280 · captured 27 Mar 2025 · NASA/JPL-Caltech. Early, uncalibrated commissioning image; not ready for scientific use.<br />A / B use the same source. Targets, motion and results are illustrative. Verified epoch papers and real patch names are required before live play.</small>
          </div>
          <a href="https://www.nasa.gov/" target="_blank" rel="noreferrer">NASA source ↗</a>
        </aside>
      </div>
    </main>
  );
}
