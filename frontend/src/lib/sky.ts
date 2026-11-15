/**
 * Sky helpers for Stage 5 "Explore": coordinate parsing/formatting, the
 * tangent-plane maths for the image overlay, and the /api/v2 sky client.
 *
 * Self-check (Node >= 22.18 strips the types natively):
 *   node --input-type=module -e "import('./src/lib/sky.ts').then(m => m.skySelfCheck())"
 */

/* ------------------------------------------------------------------ */
/* Coordinate parsing                                                  */
/* ------------------------------------------------------------------ */

const NUM = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)`;

/** Split a sexagesimal string into numeric parts plus a sign. Returns null if malformed. */
function splitSexagesimal(input: string, units: RegExp): { sign: number; parts: number[] } | null {
  let text = input.trim().toLowerCase().replace(/[′’']/g, "m").replace(/[″"]/g, "s").replace(/°/g, "d");
  if (!text) return null;
  let sign = 1;
  if (text[0] === "-" || text[0] === "−") {
    sign = -1;
    text = text.slice(1).trim();
  } else if (text[0] === "+") {
    text = text.slice(1).trim();
  }
  // Replace unit letters / colons with spaces, but only in the allowed positions.
  const normalised = text.replace(units, " ").replace(/:/g, " ").trim();
  if (!normalised) return null;
  const tokens = normalised.split(/\s+/);
  if (tokens.length > 3) return null;
  const parts: number[] = [];
  for (const token of tokens) {
    if (!new RegExp(`^${NUM}$`).test(token) || /^[+-]/.test(token)) return null;
    parts.push(Number(token));
  }
  // Only the last component may be fractional; minutes/seconds must be < 60.
  for (let i = 0; i < parts.length - 1; i++) if (!Number.isInteger(parts[i])) return null;
  for (let i = 1; i < parts.length; i++) if (parts[i] >= 60) return null;
  return { sign, parts };
}

function isPlainDecimal(text: string) {
  return new RegExp(`^${NUM}$`).test(text.trim().replace(/^−/, "-"));
}

/**
 * Right ascension -> decimal degrees, or null.
 * Accepts decimal degrees ("133.795", "133.795d"), or hours as
 * "08h55m10.831s", "08:55:10.83", "08 55 10.83", "8h55.2m".
 */
export function parseRA(input: string): number | null {
  const text = input.trim();
  if (!text) return null;
  if (isPlainDecimal(text) || /^\d+(?:\.\d+)?\s*(?:d|deg|°)$/i.test(text)) {
    const value = parseFloat(text.replace(/−/, "-"));
    return value >= 0 && value < 360 ? value : null;
  }
  if (/^[-+−]/.test(text)) return null;
  const split = splitSexagesimal(text, /\s*[hms]\s*/g);
  if (!split || split.parts.length < 2) return null;
  const [h, m = 0, s = 0] = split.parts;
  if (h >= 24) return null;
  const deg = (h + m / 60 + s / 3600) * 15;
  return deg < 360 ? deg : null;
}

/**
 * Declination -> decimal degrees, or null.
 * Accepts "-7.245", "-07d14m42.53s", "-07:14:42.5", "-07 14 42.5", "+04°41′36″".
 */
export function parseDec(input: string): number | null {
  const text = input.trim();
  if (!text) return null;
  if (isPlainDecimal(text) || /^[-+−]?\d+(?:\.\d+)?\s*(?:d|deg|°)$/i.test(text)) {
    const value = parseFloat(text.replace(/−/, "-"));
    return value >= -90 && value <= 90 ? value : null;
  }
  const split = splitSexagesimal(text, /\s*(?:d|deg|m|s)\s*/g);
  if (!split || split.parts.length < 2) return null;
  const [d, m = 0, s = 0] = split.parts;
  const deg = split.sign * (d + m / 60 + s / 3600);
  return deg >= -90 && deg <= 90 ? deg : null;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

function pad(value: number, width: number, decimals = 0) {
  const text = value.toFixed(decimals);
  const [int, frac] = text.split(".");
  return int.padStart(width, "0") + (frac ? `.${frac}` : "");
}

/** 133.795 -> "08h55m10.80s" */
export function formatRA(deg: number, decimals = 2) {
  let totalSeconds = Number((((deg % 360) + 360) % 360 / 15 * 3600).toFixed(decimals));
  if (totalSeconds >= 86400) totalSeconds -= 86400;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds - h * 3600) / 60);
  const s = totalSeconds - h * 3600 - m * 60;
  return `${pad(h, 2)}h${pad(m, 2)}m${pad(s, 2, decimals)}s`;
}

/** -7.245 -> "−07°14′42.0″" */
export function formatDec(deg: number, decimals = 1) {
  const sign = deg < 0 ? "−" : "+";
  const totalSeconds = Number((Math.abs(deg) * 3600).toFixed(decimals));
  const d = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds - d * 3600) / 60);
  const s = totalSeconds - d * 3600 - m * 60;
  return `${sign}${pad(d, 2)}°${pad(m, 2)}′${pad(s, 2, decimals)}″`;
}

/** Short decimal form used in URLs and inputs. */
export function fmtDeg(deg: number, decimals = 5) {
  return String(Number(deg.toFixed(decimals)));
}

/* ------------------------------------------------------------------ */
/* Image geometry                                                      */
/* ------------------------------------------------------------------ */

const RAD = Math.PI / 180;

/**
 * Click position inside a north-up / east-left square cutout -> RA/Dec.
 * fx, fy are 0..1 from the top-left corner. The cutout is assumed to be a
 * gnomonic (TAN) projection centred on (ra0, dec0) whose full width is fov.
 */
export function pixelToSky(fx: number, fy: number, ra0: number, dec0: number, fovArcmin: number) {
  const fov = (fovArcmin / 60) * RAD;
  const xi = -(fx - 0.5) * fov; // east is left
  const eta = -(fy - 0.5) * fov; // north is up
  const d0 = dec0 * RAD;
  const denom = Math.cos(d0) - eta * Math.sin(d0);
  const ra = ra0 + Math.atan2(xi, denom) / RAD;
  const dec = Math.atan2(Math.sin(d0) + eta * Math.cos(d0), Math.hypot(xi, denom)) / RAD;
  return { ra: ((ra % 360) + 360) % 360, dec };
}

/** Inverse of pixelToSky, used by the self-check. */
export function skyToPixel(ra: number, dec: number, ra0: number, dec0: number, fovArcmin: number) {
  const fov = (fovArcmin / 60) * RAD;
  const a = ra * RAD, d = dec * RAD, a0 = ra0 * RAD, d0 = dec0 * RAD;
  const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a - a0);
  const xi = (Math.cos(d) * Math.sin(a - a0)) / cosc;
  const eta = (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a - a0)) / cosc;
  return { fx: 0.5 - xi / fov, fy: 0.5 - eta / fov };
}

/** A round scale-bar length (~1/4 of the field) and its width as a fraction of the image. */
export function scaleBar(fovArcmin: number) {
  const stepsArcsec = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800];
  const target = (fovArcmin * 60) / 4;
  let best = stepsArcsec[0];
  for (const step of stepsArcsec) if (step <= target) best = step;
  const label = best >= 60 ? `${best / 60}′` : `${best}″`;
  return { label, fraction: best / (fovArcmin * 60) };
}

/* ------------------------------------------------------------------ */
/* Instrument constants                                                */
/* ------------------------------------------------------------------ */

export type Detector = "all" | "1" | "2" | "3" | "4" | "5" | "6";
export type Stretch = "asinh" | "linear" | "log";
export type Mode = "flip" | "blink" | "swipe" | "diff" | "stack";

/** SPHEREx detector arrays and their approximate wavelength coverage (µm). */
export const DETECTORS: { id: Detector; label: string; range: string }[] = [
  { id: "all", label: "All", range: "0.75–5.0 µm co-added" },
  { id: "1", label: "D1", range: "0.75–1.09 µm" },
  { id: "2", label: "D2", range: "1.10–1.62 µm" },
  { id: "3", label: "D3", range: "1.63–2.41 µm" },
  { id: "4", label: "D4", range: "2.42–3.82 µm" },
  { id: "5", label: "D5", range: "3.83–4.41 µm" },
  { id: "6", label: "D6", range: "4.42–5.00 µm" },
];

/** Categorical colours per detector (validated dark-surface palette, fixed order). */
export const DETECTOR_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c"];

export const FOVS = [2, 4, 6, 10, 20, 30];
export const MODES: Mode[] = ["flip", "blink", "swipe", "diff", "stack"];
export const STRETCHES: Stretch[] = ["asinh", "linear", "log"];

/* ------------------------------------------------------------------ */
/* API (v2)                                                            */
/* ------------------------------------------------------------------ */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type SkyTarget = {
  id: string;
  name: string;
  ra: number;
  dec: number;
  fov_arcmin: number;
  kind: string;
  description: string;
};
export type Resolved = { name: string; ra: number; dec: number };
export type Epoch = { id: string; date_obs: string; mjd: number; detectors: number[]; n_images: number };
export type SkySearch = {
  query: { ra: number; dec: number; fov_arcmin: number };
  source: string;
  data_tag: string;
  epochs: Epoch[];
  notes: string[];
};
export type SpectrumPoint = {
  wavelength_um: number;
  flux_mjy_sr: number;
  error: number | null;
  detector: number;
  date_obs: string;
};
export type Spectrum = { ra: number; dec: number; points: SpectrumPoint[]; note?: string };
export type SkyMeta = {
  epoch: string;
  date_obs: string;
  n_images: number;
  obs_ids: string[];
  detectors: number[];
  wavelength_range_um: number[] | null;
  flags: Record<string, number>;
  flagged_fraction: number | null;
  source_urls: string[];
};

export class ApiError extends Error {
  status: number;
  retryAfter: number | null;
  constructor(message: string, status: number, retryAfter: number | null) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

export async function skyJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`);
  } catch {
    throw new ApiError("Could not reach the Star Detective server.", 0, null);
  }
  if (!response.ok) {
    let detail = "";
    let retryAfter: number | null = Number(response.headers.get("retry-after")) || null;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
      if (typeof body.retry_after === "number") retryAfter = body.retry_after;
    } catch {}
    throw new ApiError(detail || `Request failed (${response.status})`, response.status, retryAfter);
  }
  return response.json();
}

export type View = { ra: number; dec: number; fov: number };

export const skyPaths = {
  targets: () => "/api/v2/targets",
  resolve: (name: string) => `/api/v2/resolve?${qs({ name })}`,
  search: (v: View) => `/api/v2/sky/search?${qs({ ra: fmtDeg(v.ra), dec: fmtDeg(v.dec), fov: v.fov })}`,
  meta: (v: View, epoch: string, detector: Detector = "all") =>
    `/api/v2/sky/meta?${qs({ ra: fmtDeg(v.ra), dec: fmtDeg(v.dec), fov: v.fov, epoch, detector })}`,
  spectrum: (ra: number, dec: number, epoch: string) =>
    `/api/v2/sky/spectrum?${qs({ ra: fmtDeg(ra, 6), dec: fmtDeg(dec, 6), epoch })}`,
};

export function frameUrl(v: View, epoch: string, detector: Detector, stretch: Stretch, size: number) {
  return `${API_URL}/api/v2/sky/frame.png?${qs({
    ra: fmtDeg(v.ra), dec: fmtDeg(v.dec), fov: v.fov, epoch, detector, stretch, size,
  })}`;
}

export function combineUrl(v: View, a: string, b: string, op: "diff" | "sum", detector: Detector, size: number) {
  return `${API_URL}/api/v2/sky/combine.png?${qs({
    ra: fmtDeg(v.ra), dec: fmtDeg(v.dec), fov: v.fov, a, b, op, detector, size,
  })}`;
}

/** "2025-05-01T03:12:00" -> "1 May 2025" */
export function formatDay(iso: string) {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/* ------------------------------------------------------------------ */
/* Self-check                                                          */
/* ------------------------------------------------------------------ */

export function skySelfCheck() {
  const close = (a: number | null, b: number, tol = 1e-4) => a !== null && Math.abs(a - b) < tol;
  const cases: [string, boolean][] = [
    ["ra decimal", close(parseRA("133.795"), 133.795)],
    ["ra deg suffix", close(parseRA("133.795d"), 133.795)],
    ["ra hms letters", close(parseRA("08h55m10.831s"), (8 + 55 / 60 + 10.831 / 3600) * 15)],
    ["ra colons", close(parseRA("08:55:10.83"), (8 + 55 / 60 + 10.83 / 3600) * 15)],
    ["ra spaces", close(parseRA("08 55 10.83"), (8 + 55 / 60 + 10.83 / 3600) * 15)],
    ["ra h m only", close(parseRA("8h55.5m"), (8 + 55.5 / 60) * 15)],
    ["ra rejects 24h", parseRA("24:00:00") === null],
    ["ra rejects 360", parseRA("360") === null],
    ["ra rejects negative", parseRA("-10") === null],
    ["ra rejects 61 min", parseRA("08:61:00") === null],
    ["ra rejects text", parseRA("barnard") === null],
    ["ra rejects empty", parseRA("  ") === null],
    ["dec decimal", close(parseDec("-7.245"), -7.245)],
    ["dec dms letters", close(parseDec("-07d14m42.53s"), -(7 + 14 / 60 + 42.53 / 3600))],
    ["dec spaces", close(parseDec("-07 14 42.5"), -(7 + 14 / 60 + 42.5 / 3600))],
    ["dec colons +", close(parseDec("+04:41:36"), 4 + 41 / 60 + 36 / 3600)],
    ["dec unicode", close(parseDec("+04°41′36″"), 4 + 41 / 60 + 36 / 3600)],
    ["dec minus zero", close(parseDec("-00 30 00"), -0.5)],
    ["dec unicode minus", close(parseDec("−00:30:00"), -0.5)],
    ["dec rejects 91", parseDec("91") === null],
    ["dec rejects junk", parseDec("1 2 3 4") === null],
    ["dec rejects inner sign", parseDec("10 -5 3") === null],
    ["format ra", formatRA(133.795) === "08h55m10.80s"],
    ["format dec", formatDec(-7.245) === "−07°14′42.0″"],
    ["format ra roundtrip", close(parseRA(formatRA(271.1234, 3)), 271.1234, 1e-5)],
    ["format dec rounding", formatDec(10.999999) === "+11°00′00.0″"],
    ["scale bar 6'", scaleBar(6).label === "1′" && close(scaleBar(6).fraction, 1 / 6)],
    ["scale bar 2'", scaleBar(2).label === "30″"],
  ];
  // Tangent plane: centre maps to centre; round trip off-centre; east is left.
  const c = pixelToSky(0.5, 0.5, 133.795, -7.245, 6);
  cases.push(["tan centre", close(c.ra, 133.795, 1e-9) && close(c.dec, -7.245, 1e-9)]);
  const p = pixelToSky(0.1, 0.8, 133.795, -7.245, 30);
  const back = skyToPixel(p.ra, p.dec, 133.795, -7.245, 30);
  cases.push(["tan roundtrip", close(back.fx, 0.1, 1e-9) && close(back.fy, 0.8, 1e-9)]);
  cases.push(["east is left", pixelToSky(0.25, 0.5, 133.795, -7.245, 6).ra > 133.795]);
  cases.push(["north is up", pixelToSky(0.5, 0.25, 133.795, -7.245, 6).dec > -7.245]);
  const top = pixelToSky(0.5, 0, 10, 0, 60);
  cases.push(["half fov north", close(top.dec, 0.5, 1e-3)]);
  const wrap = pixelToSky(0.9, 0.5, 0.01, 20, 30);
  cases.push(["ra wraps", wrap.ra > 359]);

  const failed = cases.filter(([, ok]) => !ok).map(([name]) => name);
  const summary = `sky.ts self-check: ${cases.length - failed.length}/${cases.length} passed`;
  if (failed.length) throw new Error(`${summary}. Failed: ${failed.join(", ")}`);
  console.log(summary);
  return true;
}
