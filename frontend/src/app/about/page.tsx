import SiteNav from "@/components/SiteNav";
import { SOURCE_URL } from "@/lib/demo";

export const metadata = { title: "About the data · Star Detective" };

const DEFINITIONS = [
  {
    term: "Real",
    tone: "ab-tone-accent",
    text: "An observation from the mission. “Known object” means it has been identified; “unverified” means it has not.",
  },
  {
    term: "Glitch",
    tone: "ab-tone-muted",
    text: "An artifact from the detector or processing, not a moving object. Different wavelengths can also create apparent changes.",
  },
  {
    term: "Candidate",
    tone: "ab-tone-candidate",
    text: "An unusual signal that still needs checks. A candidate is not a discovery.",
  },
  {
    term: "Simulated",
    tone: "ab-tone-simulated",
    text: "A real background with a test target added. Added targets and motion are disclosed on the reveal.",
  },
];

/* Mirrors frontend/public/space/CREDITS.md — keep the two in sync. */
const CREDITS: { what: string; who: string; url?: string; label?: string }[] = [
  {
    what: "SPHEREx observations",
    who: "NASA/JPL-Caltech/IPAC, SPHEREx. Commissioning image PIA26280 (27 Mar 2025).",
    url: SOURCE_URL,
    label: "NASA/JPL",
  },
  {
    what: "Cosmic Cliffs, Carina Nebula",
    who: "Webb NIRCam. NASA, ESA, CSA, STScI.",
    url: "https://images.nasa.gov/details/carina_nebula",
    label: "NASA images",
  },
  {
    what: "Sunrise above Earth’s horizon",
    who: "ISS photo iss072e838362. NASA/JSC, public domain.",
    url: "https://images.nasa.gov/details/iss072e838362",
    label: "NASA images",
  },
  {
    what: "Pillars of Creation",
    who: "NASA, ESA, Hubble Heritage Team (STScI/AURA).",
    url: "https://commons.wikimedia.org/wiki/File:Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg",
    label: "Wikimedia",
  },
  {
    what: "Jupiter",
    who: "NASA/ESA/Hubble.",
    url: "https://commons.wikimedia.org/wiki/File:Jupiter.jpg",
    label: "Wikimedia",
  },
  {
    what: "The Sun",
    who: "NASA Solar Dynamics Observatory AIA, 19 Aug 2010.",
    url: "https://commons.wikimedia.org/wiki/File:The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg",
    label: "Wikimedia",
  },
  {
    what: "Planet textures (Earth, Jupiter, Mars, Saturn)",
    who: "Solar System Scope, licensed CC BY 4.0, based on NASA data.",
    url: "https://www.solarsystemscope.com/textures/",
    label: "Solar System Scope",
  },
  {
    what: "Asteroid 3D model (1999 RQ36 / Bennu)",
    who: "NASA 3D Resources.",
    url: "https://science.nasa.gov/3d-resources/1999-rq36-asteroid/",
    label: "NASA 3D",
  },
];

export default function AboutPage() {
  return (
    <div className="in-page sd-page">
      <SiteNav active="about" />
      <main className="in-main">
        <p className="in-eyebrow">The data behind the dots</p>
        <h1 className="in-title">Real sky. Honest labels.</h1>
        <p className="in-lede">
          Star Detective is a way to practise looking at astronomy data — not a claim to find Planet X.
        </p>

        <section className="ab-section" aria-labelledby="ab-labels">
          <h2 id="ab-labels" className="ab-h2">
            Four labels
          </h2>
          <div className="ab-body">
            <dl className="ab-terms">
              {DEFINITIONS.map((item) => (
                <div key={item.term}>
                  <dt className={item.tone}>{item.term}</dt>
                  <dd>{item.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="ab-section" aria-labelledby="ab-data">
          <h2 id="ab-data" className="ab-h2">
            About the data
          </h2>
          <div className="ab-body">
            <p>
              <strong>Stage 4 (Training)</strong> uses simulated examples: a real background with test targets
              added. Every one is tagged <em>Simulated</em>, and the reveal says what was added.
            </p>
            <p>
              <strong>Stage 5 (Explore)</strong> fetches real SPHEREx images from the{" "}
              <a href="https://irsa.ipac.caltech.edu/" target="_blank" rel="noreferrer">
                NASA/IPAC Infrared Science Archive (IRSA)
              </a>{" "}
              by sky coordinates, from SPHEREx Data Release 1 (spherex_dr1).
            </p>
            <p>Data credit: NASA/JPL-Caltech/IPAC, SPHEREx.</p>
          </div>
        </section>

        <section className="ab-section" aria-labelledby="ab-method">
          <h2 id="ab-method" className="ab-h2">
            Method
          </h2>
          <div className="ab-body">
            <div className="ab-qa">
              <div>
                <h3 className="ab-h3">What is SPHEREx?</h3>
                <p>
                  SPHEREx is a NASA mission surveying the sky in infrared light. Its detectors measure light in
                  wavelength bands. Infrared is invisible to our eyes, so visible colours are assigned to make a
                  false-colour image.
                </p>
              </div>
              <div>
                <h3 className="ab-h3">Why do candidates need checks?</h3>
                <p>
                  Most candidates turn out to be known objects or image artifacts. Compare independent
                  observations and check catalogues before drawing conclusions. One bright mark in one image is
                  not evidence of a new object.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="ab-section" aria-labelledby="ab-credits">
          <h2 id="ab-credits" className="ab-h2">
            Image and data credits
          </h2>
          <div className="ab-body">
            <ul className="ab-credits">
              {CREDITS.map((c) => (
                <li key={c.what}>
                  <span className="ab-credit-what">{c.what}</span>
                  <span className="ab-credit-who">{c.who}</span>
                  {c.url ? (
                    <a className="ab-credit-src" href={c.url} target="_blank" rel="noreferrer">
                      {c.label} ↗
                    </a>
                  ) : (
                    <span />
                  )}
                </li>
              ))}
            </ul>
            <p className="ab-note">
              NASA media is generally free to use with credit. The SPHEREx commissioning image is early and
              uncalibrated, and not ready for scientific use.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
