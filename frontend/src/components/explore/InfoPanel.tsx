"use client";

import { useState } from "react";
import { formatDay, formatDec, formatRA, type SkyMeta, type SkySearch, type View } from "@/lib/sky";

const FLAG_HELP: Record<string, string> = {
  TRANSIENT: "single-frame hit (cosmic ray)",
  SATURATED: "too bright to measure",
  HOT: "hot pixel",
  COLD: "dead / cold pixel",
  NONFUNC: "non-functional pixel",
  PERSIST: "afterglow of a bright source",
  OVERFLOW: "readout overflow",
  SOURCE: "pixel on a known source",
};

/** "Spec sheet" for the current view: small uppercase label / value rows. */
export default function InfoPanel({
  view,
  name,
  search,
  meta,
  metaError,
  metaLoading,
}: {
  view: View;
  name: string | null;
  search: SkySearch | undefined;
  meta: SkyMeta | undefined;
  metaError: boolean;
  metaLoading: boolean;
}) {
  const [allLinks, setAllLinks] = useState(false);
  const epochs = search ? [...search.epochs].sort((x, y) => x.mjd - y.mjd) : [];
  const images = epochs.reduce((sum, e) => sum + e.n_images, 0);
  const detectors = Array.from(new Set(epochs.flatMap((e) => e.detectors))).sort();
  const flags = meta?.flags ? Object.entries(meta.flags).filter(([, count]) => count > 0).sort((x, y) => y[1] - x[1]) : [];
  const links = meta?.source_urls ?? [];
  const shownLinks = allLinks ? links : links.slice(0, 3);
  const range = meta?.wavelength_range_um;

  return (
    <section className="ex-panel" aria-labelledby="ex-info-title">
      <h2 id="ex-info-title" className="ex-panel-title">
        Data sheet
      </h2>
      <dl className="ex-specs">
        {name && <Row label="Target" value={name} />}
        <Row label="RA" value={`${formatRA(view.ra)}`} sub={`${view.ra.toFixed(5)}°`} />
        <Row label="Dec" value={formatDec(view.dec)} sub={`${view.dec.toFixed(5)}°`} />
        <Row label="Field" value={`${view.fov}′ × ${view.fov}′`} />
        {search && (
          <>
            <Row label="Epochs" value={String(epochs.length)} />
            {epochs.length > 0 && (
              <Row
                label="Dates"
                value={
                  epochs.length > 1
                    ? `${formatDay(epochs[0].date_obs)} → ${formatDay(epochs[epochs.length - 1].date_obs)}`
                    : formatDay(epochs[0].date_obs)
                }
              />
            )}
            <Row label="Images" value={String(images)} />
            <Row label="Detectors" value={detectors.length ? detectors.map((d) => `D${d}`).join(" ") : "—"} />
            <Row label="Data" value={`${search.data_tag} · ${search.source}`} />
          </>
        )}
        {meta && (
          <>
            <Row label="Epoch shown" value={formatDay(meta.date_obs)} sub={`${meta.n_images} images`} />
            {range && range.length >= 2 && (
              <Row label="Wavelength" value={`${range[0].toFixed(2)}–${range[1].toFixed(2)} µm`} />
            )}
            {meta.flagged_fraction !== null && meta.flagged_fraction !== undefined && (
              <Row label="Flagged" value={`${(meta.flagged_fraction * 100).toFixed(1)}% of pixels`} />
            )}
          </>
        )}
      </dl>

      {metaLoading && !meta && <p className="ex-muted">Loading quality flags…</p>}
      {metaError && <p className="ex-muted">Quality flags are unavailable for this epoch.</p>}

      {flags.length > 0 && (
        <div className="ex-flags">
          <p className="ex-label">Contamination flags</p>
          <ul>
            {flags.map(([flag, count]) => (
              <li key={flag}>
                <span>
                  {flag}
                  {FLAG_HELP[flag.toUpperCase()] && <small> {FLAG_HELP[flag.toUpperCase()]}</small>}
                </span>
                <b>{count.toLocaleString("en-GB")}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {links.length > 0 && (
        <div className="ex-links">
          <p className="ex-label">Source FITS on IRSA</p>
          <ul>
            {shownLinks.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {fileName(url)} ↗
                </a>
              </li>
            ))}
          </ul>
          {links.length > 3 && (
            <button type="button" className="ex-text-btn" onClick={() => setAllLinks((v) => !v)} aria-expanded={allLinks}>
              {allLinks ? "Show fewer" : `Show all ${links.length}`}
            </button>
          )}
        </div>
      )}

      {search?.notes.map((note) => (
        <p key={note} className="ex-note">
          {note}
        </p>
      ))}
    </section>
  );
}

function fileName(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || url);
  } catch {
    return url;
  }
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value}
        {sub && <small>{sub}</small>}
      </dd>
    </div>
  );
}
