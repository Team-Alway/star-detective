import SiteNav from "@/components/SiteNav";
import { SOURCE_URL } from "@/lib/demo";

export const metadata = { title: "About the data · Star Detective" };

const DEFINITIONS = [
  {
    term: "Real",
    tone: "accent",
    text: "An observation from the mission. “Known object” means it has been identified; “unverified” means it has not.",
  },
  {
    term: "Glitch",
    tone: "muted",
    text: "An artifact from the detector or processing, not a moving object. Different wavelengths can also create apparent changes.",
  },
  {
    term: "Candidate",
    tone: "candidate",
    text: "An unusual signal that still needs checks. A candidate is not a discovery.",
  },
  {
    term: "Simulated",
    tone: "simulated",
    text: "A real background with a test target added. Added targets and motion are disclosed on the reveal.",
  },
];

export default function AboutPage() {
  return (
    <div className="sd-page">
      <SiteNav active="about" />
      <main className="about">
        <p className="eyebrow-data">THE DATA BEHIND THE DOTS</p>
        <h1 className="about-title">
          Real sky. <span className="about-title-break">Honest labels.</span>
        </h1>
        <p className="about-sub">
          <span className="about-desktop">A way to practice looking — not a claim to find Planet X.</span>
          <span className="about-mobile">
            The game is a way to practice looking, not a claim to find Planet X.
          </span>
        </p>

        <div className="definitions about-desktop">
          {DEFINITIONS.map((item) => (
            <section key={item.term} className="definition">
              <h2 className={`definition-term definition-${item.tone}`}>{item.term}</h2>
              <p>{item.text}</p>
            </section>
          ))}
        </div>

        <div className="about-columns about-desktop">
          <section>
            <h2>What is SPHEREx?</h2>
            <p>
              SPHEREx is a NASA mission surveying the sky in infrared light. Its detectors measure light
              in wavelength bands. Infrared is invisible to our eyes, so visible colours are assigned to
              make a false-colour image.
            </p>
          </section>
          <section>
            <h2>Why do candidates need checks?</h2>
            <p>
              Most candidates turn out to be known objects or image artifacts. Compare independent
              observations and check catalogues before drawing conclusions. One bright mark in one image
              is not evidence of a new object.
            </p>
          </section>
        </div>

        <div className="about-stack about-mobile">
          <section>
            <h2>What is SPHEREx?</h2>
            <p>
              SPHEREx is a NASA mission surveying the sky in infrared light. Comparing observations helps
              people investigate how a source changes over time.
            </p>
          </section>
          <section>
            <h2>Why add colour?</h2>
            <p>
              Infrared is light our eyes cannot see. Visible colours are assigned to measurements from
              different wavelength bands.
            </p>
          </section>
          <section>
            <h2>Real, glitch or candidate?</h2>
            <p>
              Real means mission observations. A glitch is a detector or processing effect, not a moving
              object. A candidate is an unusual signal that still needs checks.
            </p>
          </section>
          <section>
            <h2>Evidence before excitement</h2>
            <p>
              Most candidates turn out to be known objects or artifacts. Check catalogues and independent
              observations before drawing conclusions.
            </p>
          </section>
          <section>
            <h2>What is simulated here?</h2>
            <p>
              This design uses SPHEREx image PIA26280, captured on 27 Mar 2025. A / B share one reference
              image. The target and its motion are simulated.
            </p>
          </section>
          <a className="about-source-link" href={SOURCE_URL} target="_blank" rel="noreferrer">
            NASA / JPL source ↗
          </a>
          <p className="footnote">
            NASA/JPL-Caltech · Early, uncalibrated commissioning image; not ready for scientific use.
            Verified epoch pairs are required before live play.
          </p>
        </div>

        <aside className="disclosure about-desktop">
          <div>
            <p className="disclosure-label">ABOUT THIS DESIGN PREVIEW</p>
            <p>
              PIA26280 · captured 27 Mar 2025 · NASA/JPL-Caltech. Early, uncalibrated commissioning
              image; not ready for scientific use.
            </p>
            <p>
              A / B use the same source. Targets, motion and results are illustrative. Verified epoch
              pairs and real patch names are required before live play.
            </p>
          </div>
          <a className="btn btn-ghost btn-w176" href={SOURCE_URL} target="_blank" rel="noreferrer">
            NASA source ↗
          </a>
        </aside>
      </main>
    </div>
  );
}
