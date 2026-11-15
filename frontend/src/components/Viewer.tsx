"use client";

import { useState } from "react";
import useSWR from "swr";
import ArchiveState from "@/components/ArchiveState";
import BlinkControls, { useBlink } from "@/components/BlinkControls";
import PatchCard from "@/components/PatchCard";
import SiteNav from "@/components/SiteNav";
import SkyImage from "@/components/SkyImage";
import StatePanel from "@/components/StatePanel";
import SwipeCompare from "@/components/SwipeCompare";
import { absoluteUrl, fetchPatches } from "@/lib/api";
import { SOURCE_URL } from "@/lib/demo";
import { formatDate, type ImageSet } from "@/lib/round";
import type { PatchSummary } from "@/lib/types";

type ViewerPatch = {
  id: string;
  /** Card title, e.g. "Patch 01". */
  title: string;
  /** Heading above the image. */
  heading: string;
  lines: string[];
  /** False when there is no second date yet. */
  ready: boolean;
  images: ImageSet;
  details: {
    coordinates: string;
    observationA: string;
    observationB: string;
    wavelength: string;
    source: { label: string; href?: string };
    noteLabel: string;
    note: string;
    mobileNote: string;
  };
};

const SAVED_IMAGES: ImageSet = {
  mode: "saved",
  srcA: "/figma/spherex-detector.jpeg",
  srcB: "/figma/spherex-detector.jpeg",
  dateA: "2025-03-27",
  dateB: "2025-03-27",
};

/** Bundled reference preview, used when the API is unreachable. */
const SAVED_PATCHES: ViewerPatch[] = ["Patch 01", "Patch 02", "Patch 03", "Patch 04"].map(
  (title, index) => ({
    id: `saved-${index + 1}`,
    title,
    heading: title,
    lines: index === 0 ? ["27 Mar 2025", "Reference preview"] : ["Dataset pending", "Preview thumbnail"],
    ready: index === 0,
    images: SAVED_IMAGES,
    details: {
      coordinates: "Not available in this reference",
      observationA: "27 Mar 2025",
      observationB: "Awaiting verified epoch",
      wavelength: "Infrared detector preview",
      source: { label: "NASA / JPL image source ↗", href: SOURCE_URL },
      noteLabel: "REFERENCE PREVIEW",
      note: "Swipe shows the comparison layout using one image. A second observation is still required. No coordinates or catalogue matches are inferred.",
      mobileNote:
        "Preview only. All thumbnails and the comparison use one reference image, not verified paired observations.",
    },
  }),
);

function shortName(title: string) {
  return title.includes(":") ? title.slice(title.indexOf(":") + 1).trim() : title;
}

function fromApi(patch: PatchSummary, index: number): ViewerPatch {
  const [first, second] = patch.epochs;
  const note = `${patch.briefing} ${
    patch.data_tag === "Simulated"
      ? "This patch is simulated and is labelled as such."
      : "Anything you notice here is a candidate, not a discovery."
  }`;
  return {
    id: patch.id,
    title: `Patch ${String(index + 1).padStart(2, "0")}`,
    heading: shortName(patch.title),
    lines: [formatDate(first.date_obs), `${patch.data_tag} · ${patch.instrument}`],
    ready: true,
    images: {
      mode: "api",
      srcA: absoluteUrl(first.gamified_image_url),
      srcB: absoluteUrl(second.gamified_image_url),
      dateA: first.date_obs,
      dateB: second.date_obs,
      tag: patch.data_tag,
    },
    details: {
      coordinates: `${patch.ra_hms} / ${patch.dec_dms}`,
      observationA: formatDate(first.date_obs),
      observationB: formatDate(second.date_obs),
      wavelength: patch.default_band,
      source: { label: `${patch.instrument} · ${patch.data_tag} data` },
      noteLabel: `${patch.data_tag.toUpperCase()} DATA`,
      note,
      mobileNote: note,
    },
  };
}

async function loadPatches() {
  const patches = await fetchPatches();
  return patches.map(fromApi);
}

type Mode = "blink" | "swipe";

export default function Viewer() {
  const [useSaved, setUseSaved] = useState(false);
  const { data, error, mutate } = useSWR(useSaved ? null : "viewer:patches", loadPatches, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  if (useSaved) return <ViewerBody patches={SAVED_PATCHES} saved />;
  if (data) return <ViewerBody patches={data} />;
  return (
    <ArchiveState
      active="viewer"
      failed={Boolean(error)}
      onRetry={() => mutate()}
      onSaved={() => setUseSaved(true)}
    />
  );
}

function ViewerBody({ patches, saved = false }: { patches: ViewerPatch[]; saved?: boolean }) {
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<Mode>("swipe");
  const blink = useBlink();
  const patch = patches[selected];
  const { details } = patch;
  const secondDate = patch.images.dateA !== patch.images.dateB || patch.images.mode === "api";

  function select(index: number) {
    setSelected(index);
    blink.reset();
  }

  return (
    <div className="sd-page">
      <SiteNav active="viewer" />
      {saved && (
        <div className="offline-bar" role="status">
          <strong>Showing saved levels while the archive is unreachable.</strong> Saved patches keep
          their original data labels.
        </div>
      )}
      <main className="viewer">
        <aside className="patch-rail" aria-label="Prepared patches">
          <p className="rail-label rail-label-desktop">PREPARED PATCHES</p>
          <div className="rail-head-mobile">
            <h2>Choose a patch</h2>
            <span>{patches.length} slots · swipe →</span>
          </div>
          <div className="rail-list">
            {patches.map((item, index) => (
              <PatchCard
                key={item.id}
                title={item.title}
                lines={item.lines}
                selected={index === selected}
                onSelect={() => select(index)}
                src={item.images.srcA}
                mode={item.images.mode}
              />
            ))}
          </div>
          <p className="footnote rail-note">
            {saved
              ? "4 patch slots · 1 reference image"
              : `${patches.length} patches · real two-date observations`}
          </p>
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
            <h1 className="viewer-title">{patch.heading}</h1>
          </div>

          {patch.ready ? (
            <>
              <div className="viewer-image">
                <SkyImage
                  key={patch.id}
                  images={patch.images}
                  side={mode === "blink" ? blink.side : "A"}
                  showTarget={false}
                >
                  {mode === "swipe" && <SwipeCompare images={patch.images} />}
                </SkyImage>
              </div>
              {mode === "blink" && <BlinkControls blink={blink} />}
              <div className="chip-row">
                <button
                  type="button"
                  className="chip chip-active"
                  disabled={mode !== "blink"}
                  onClick={() => blink.step("A")}
                  aria-pressed={mode === "blink" ? blink.side === "A" : undefined}
                >
                  <span className="chip-long">A · {formatDate(patch.images.dateA)}</span>
                  <span className="chip-short">{formatDate(patch.images.dateA)}</span>
                </button>
                {secondDate ? (
                  <button
                    type="button"
                    className="chip chip-active"
                    disabled={mode !== "blink"}
                    onClick={() => blink.step("B")}
                    aria-pressed={mode === "blink" ? blink.side === "B" : undefined}
                  >
                    <span className="chip-long">B · {formatDate(patch.images.dateB)}</span>
                    <span className="chip-short">{formatDate(patch.images.dateB)}</span>
                  </button>
                ) : (
                  <span className="chip chip-empty">
                    <span className="chip-long">Date B · pending</span>
                    <span className="chip-short">Date B pending</span>
                  </span>
                )}
              </div>
            </>
          ) : (
            <StatePanel
              className="viewer-state"
              label="NO SECOND DATE"
              title="SPHEREx has only one image of this spot so far."
              actions={
                <button type="button" className="btn btn-secondary btn-block" onClick={() => select(0)}>
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
              onClick={() => select((selected + patches.length - 1) % patches.length)}
            >
              ← Previous image
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => select((selected + 1) % patches.length)}
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
              <dd>{details.coordinates}</dd>
            </div>
            <div className="meta meta-desktop">
              <dt>Observation A</dt>
              <dd>{details.observationA}</dd>
            </div>
            <div className="meta meta-desktop">
              <dt>Observation B</dt>
              <dd>{details.observationB}</dd>
            </div>
            <div className="meta meta-mobile">
              <dt>Observation dates</dt>
              <dd>
                {details.observationA} · {details.observationB}
              </dd>
            </div>
            <div className="meta">
              <dt>Wavelength</dt>
              <dd>{details.wavelength}</dd>
            </div>
          </dl>
          <p className="details-copy">
            False colour: infrared light is invisible, so colour is added.
          </p>
          {details.source.href ? (
            <a className="details-link" href={details.source.href} target="_blank" rel="noreferrer">
              {details.source.label}
            </a>
          ) : (
            <p className="details-link">{details.source.label}</p>
          )}
          <p className="details-label">{details.noteLabel}</p>
          <p className="details-note">
            <span className="details-note-desktop">{details.note}</span>
            <span className="details-note-mobile">{details.mobileNote}</span>
          </p>
        </aside>
      </main>
      <p className="footnote viewer-footnote">
        {saved
          ? "All thumbnails use the same SPHEREx reference. Four real patch pairs and names will come from the prepared dataset."
          : "Images are rendered from NASA FITS files by the Star Detective API. Every image carries its observation date and a Real or Simulated label."}
      </p>
    </div>
  );
}
