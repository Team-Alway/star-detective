"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  DETECTOR_COLORS,
  formatDay,
  formatDec,
  formatRA,
  skyJson,
  skyPaths,
  type Spectrum as SpectrumData,
} from "@/lib/sky";
import ApiErrorPanel from "./ApiErrorPanel";

const W = 360;
const H = 220;
const M = { l: 46, r: 10, t: 12, b: 38 };
const X_DOMAIN: [number, number] = [0.7, 5.1];

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

function fmtFlux(value: number) {
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 1000 || abs < 0.01) return value.toExponential(1);
  return String(Number(value.toPrecision(3)));
}

export default function Spectrum({
  ra,
  dec,
  epochId,
  epochDate,
  picked,
  onReset,
}: {
  ra: number;
  dec: number;
  epochId: string | null;
  epochDate: string | null;
  picked: boolean;
  onReset: () => void;
}) {
  const [scope, setScope] = useState<"epoch" | "all">(epochId ? "epoch" : "all");
  const epoch = scope === "all" || !epochId ? "all" : epochId;
  const key = skyPaths.spectrum(ra, dec, epoch);
  const { data, error, isLoading, mutate } = useSWR(key, skyJson<SpectrumData>, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    keepPreviousData: true,
  });

  const points = (data?.points ?? []).filter(
    (p) => Number.isFinite(p.wavelength_um) && Number.isFinite(p.flux_mjy_sr),
  );
  const lows = points.map((p) => p.flux_mjy_sr - (p.error ?? 0));
  const highs = points.map((p) => p.flux_mjy_sr + (p.error ?? 0));
  const yTicks = points.length ? niceTicks(Math.min(0, ...lows), Math.max(...highs)) : [0, 1];
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const x = (w: number) => M.l + ((w - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0])) * (W - M.l - M.r);
  const y = (f: number) => M.t + (1 - (f - yMin) / (yMax - yMin || 1)) * (H - M.t - M.b);
  const xTicks = [1, 2, 3, 4, 5];
  const present = Array.from(new Set(points.map((p) => p.detector))).sort();

  const caption = `Spectrum at RA ${formatRA(ra)}, Dec ${formatDec(dec)}${
    epoch === "all" ? ", all epochs" : epochDate ? `, ${formatDay(epochDate)}` : ""
  }: ${points.length} measurements`;

  return (
    <section className="ex-panel" aria-labelledby="ex-spec-title">
      <div className="ex-panel-head">
        <h2 id="ex-spec-title" className="ex-panel-title">
          Spectrum
        </h2>
        <div className="ex-seg" role="group" aria-label="Spectrum epochs">
          <button
            type="button"
            className={`ex-pill ex-pill-sm${epoch !== "all" ? " is-on" : ""}`}
            aria-pressed={epoch !== "all"}
            disabled={!epochId}
            onClick={() => setScope("epoch")}
          >
            This date
          </button>
          <button
            type="button"
            className={`ex-pill ex-pill-sm${epoch === "all" ? " is-on" : ""}`}
            aria-pressed={epoch === "all"}
            onClick={() => setScope("all")}
          >
            All dates
          </button>
        </div>
      </div>
      <p className="ex-muted ex-spec-where">
        {picked ? "At the spot you tapped" : "At the crosshair"} · <span className="ex-data">{formatRA(ra)} {formatDec(dec)}</span>
        {picked && (
          <>
            {" "}
            <button type="button" className="ex-text-btn" onClick={onReset}>
              Back to target
            </button>
          </>
        )}
      </p>

      {error && !data ? (
        <ApiErrorPanel key={key} error={error} onRetry={() => mutate()} what="the spectrum" />
      ) : (
        <figure className="ex-spec-fig" aria-busy={isLoading}>
          <svg viewBox={`0 0 ${W} ${H}`} className="ex-spec-svg" role="img" aria-label={caption}>
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className={t === 0 ? "ax-zero" : "ax-grid"} />
                <text x={M.l - 6} y={y(t) + 3.5} textAnchor="end" className="ax-text">
                  {fmtFlux(t)}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <text key={`x${t}`} x={x(t)} y={H - M.b + 14} textAnchor="middle" className="ax-text">
                {t}
              </text>
            ))}
            <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" className="ax-title">
              Wavelength (µm)
            </text>
            <text
              transform={`translate(11 ${(M.t + H - M.b) / 2}) rotate(-90)`}
              textAnchor="middle"
              className="ax-title"
            >
              Flux (MJy/sr)
            </text>
            {points.map((p, i) =>
              p.error ? (
                <line
                  key={`e${i}`}
                  x1={x(p.wavelength_um)}
                  x2={x(p.wavelength_um)}
                  y1={y(p.flux_mjy_sr - p.error)}
                  y2={y(p.flux_mjy_sr + p.error)}
                  className="ax-err"
                />
              ) : null,
            )}
            {points.map((p, i) => (
              <circle
                key={`p${i}`}
                cx={x(p.wavelength_um)}
                cy={y(p.flux_mjy_sr)}
                r={4}
                fill={DETECTOR_COLORS[(p.detector - 1 + 6) % 6]}
                className="ax-dot"
              >
                <title>
                  {`D${p.detector} · ${p.wavelength_um.toFixed(3)} µm · ${fmtFlux(p.flux_mjy_sr)}${
                    p.error ? ` ± ${fmtFlux(p.error)}` : ""
                  } MJy/sr · ${formatDay(p.date_obs)}`}
                </title>
              </circle>
            ))}
          </svg>
          {isLoading && <p className="ex-spec-overlay">Measuring…</p>}
          {!isLoading && data && points.length === 0 && (
            <p className="ex-spec-overlay">No measurements at this spot{epoch !== "all" ? " on this date" : ""}.</p>
          )}
          {present.length > 0 && (
            <figcaption className="ex-legend">
              {present.map((d) => (
                <span key={d}>
                  <i style={{ background: DETECTOR_COLORS[(d - 1 + 6) % 6] }} />D{d}
                </span>
              ))}
            </figcaption>
          )}
        </figure>
      )}
      {data?.note && <p className="ex-note">{data.note}</p>}

      {points.length > 0 && (
        <details className="ex-table">
          <summary>Show as table</summary>
          <div className="ex-table-scroll">
            <table>
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  <th scope="col">λ (µm)</th>
                  <th scope="col">Flux (MJy/sr)</th>
                  <th scope="col">±</th>
                  <th scope="col">Det.</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {[...points]
                  .sort((p, q) => p.wavelength_um - q.wavelength_um)
                  .map((p, i) => (
                    <tr key={i}>
                      <td>{p.wavelength_um.toFixed(3)}</td>
                      <td>{fmtFlux(p.flux_mjy_sr)}</td>
                      <td>{p.error ? fmtFlux(p.error) : "—"}</td>
                      <td>D{p.detector}</td>
                      <td>{formatDay(p.date_obs)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
