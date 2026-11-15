"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { View } from "@/lib/sky";

const ALADIN_SRC = "https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js";

const SURVEYS = [
  { id: "CDS/P/2MASS/color", label: "2MASS", note: "near-infrared, 1998–2001" },
  { id: "CDS/P/allWISE/color", label: "AllWISE", note: "mid-infrared, 2010–2011" },
  { id: "CDS/P/DSS2/color", label: "DSS", note: "visible light, 1950s–1990s" },
];

/* Minimal typing for the bits of the Aladin Lite v3 API we use. */
type AladinInstance = {
  gotoRaDec: (ra: number, dec: number) => void;
  setFoV: (deg: number) => void;
  setImageSurvey?: (id: string) => void;
  setBaseImageLayer?: (id: string) => void;
  addCatalog: (catalog: unknown) => void;
  removeLayers?: () => void;
};
type AladinGlobal = {
  init: Promise<void>;
  aladin: (el: HTMLElement, options: Record<string, unknown>) => AladinInstance;
  catalogFromVizieR: (id: string, target: string, radiusDeg: number, options: Record<string, unknown>) => unknown;
};

function getA(): AladinGlobal | undefined {
  return (window as unknown as { A?: AladinGlobal }).A;
}

/** "Compare with other telescopes": Aladin Lite, loaded only when opened. */
export default function AladinPanel({ view }: { view: View }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [survey, setSurvey] = useState(SURVEYS[0].id);
  const [gaia, setGaia] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  const aladin = useRef<AladinInstance | null>(null);

  function start() {
    const A = getA();
    if (!A || !host.current) {
      setStatus("failed");
      return;
    }
    A.init
      .then(() => {
        if (!host.current) return;
        aladin.current = A.aladin(host.current, {
          survey,
          fov: view.fov / 60,
          target: `${view.ra} ${view.dec}`,
          cooFrame: "ICRS",
          showReticle: true,
          showLayersControl: false,
          showGotoControl: false,
          showFullscreenControl: false,
          showShareControl: false,
          showSimbadPointerControl: false,
          showCooGridControl: false,
          showProjectionControl: false,
          showFrame: true,
        });
        setStatus("ready");
      })
      .catch(() => setStatus("failed"));
  }

  // Give up if the script never arrives.
  useEffect(() => {
    if (status !== "loading") return;
    const timer = window.setTimeout(() => setStatus((s) => (s === "loading" ? "failed" : s)), 20000);
    return () => window.clearTimeout(timer);
  }, [status]);

  // Follow the main view and keep the overlay in sync.
  useEffect(() => {
    const instance = aladin.current;
    const A = getA();
    if (status !== "ready" || !instance || !A) return;
    try {
      instance.gotoRaDec(view.ra, view.dec);
      instance.setFoV(view.fov / 60);
      if (instance.setBaseImageLayer) instance.setBaseImageLayer(survey);
      else instance.setImageSurvey?.(survey);
      instance.removeLayers?.();
      if (gaia) {
        const catalog = A.catalogFromVizieR("I/355/gaiadr3", `${view.ra} ${view.dec}`, (view.fov / 60) * 0.75, {
          onClick: "showTable",
          name: "Gaia DR3",
          sourceSize: 10,
          color: "#ffd66b",
        });
        instance.addCatalog(catalog);
      }
    } catch {
      // A failed survey/catalogue switch leaves the previous layer in place.
    }
  }, [status, view.ra, view.dec, view.fov, survey, gaia]);

  if (status === "failed") {
    return (
      <p className="ex-muted ex-aladin-off">
        The comparison view (Aladin Lite) could not be loaded, so it is hidden for now.
      </p>
    );
  }

  return (
    <section className="ex-panel ex-compare" aria-labelledby="ex-compare-title">
      <div className="ex-panel-head">
        <h2 id="ex-compare-title" className="ex-panel-title">
          Compare with other telescopes
        </h2>
        <button
          type="button"
          className="btn btn-secondary"
          aria-expanded={open}
          aria-controls="ex-compare-body"
          onClick={() => {
            if (!open && status === "idle") setStatus("loading");
            setOpen((v) => !v);
          }}
        >
          {open ? "Hide" : "Open sky atlas"}
        </button>
      </div>
      <p className="ex-muted">
        The same spot in older all-sky surveys, with Gaia DR3 stars on top. A star that sits in a different place
        here than in SPHEREx has moved.
      </p>
      {status !== "idle" && (
        <Script src={ALADIN_SRC} strategy="afterInteractive" onReady={start} onError={() => setStatus("failed")} />
      )}
      <div id="ex-compare-body" hidden={!open}>
        <div className="ex-aladin-controls">
          <div className="ex-seg" role="group" aria-label="Survey">
            {SURVEYS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`ex-pill ex-pill-sm${survey === s.id ? " is-on" : ""}`}
                aria-pressed={survey === s.id}
                title={s.note}
                onClick={() => setSurvey(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <label className="ex-check">
            <input type="checkbox" checked={gaia} onChange={(e) => setGaia(e.target.checked)} />
            Gaia DR3 stars
          </label>
        </div>
        <div className="ex-aladin-wrap">
          {/* Aladin owns this node's children, so React must not render inside it. */}
          <div className="ex-aladin" ref={host} />
          {status === "loading" && <p className="ex-spec-overlay">Loading sky atlas…</p>}
        </div>
        <p className="ex-credit">Aladin Lite · CDS, Strasbourg · {SURVEYS.find((s) => s.id === survey)?.note}</p>
      </div>
    </section>
  );
}
