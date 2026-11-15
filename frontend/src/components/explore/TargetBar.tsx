"use client";

import { useId, useState, type FormEvent } from "react";
import {
  ApiError,
  FOVS,
  fmtDeg,
  parseDec,
  parseRA,
  skyJson,
  skyPaths,
  type Resolved,
  type SkyTarget,
  type View,
} from "@/lib/sky";

export type PickTarget = (target: { ra: number; dec: number; fov?: number; name?: string | null; detector?: string }) => void;

export default function TargetBar({
  targets,
  targetsError,
  view,
  fov,
  name,
  onPick,
  onFov,
}: {
  targets: SkyTarget[] | undefined;
  targetsError: boolean;
  view: View | null;
  fov: number;
  name: string | null;
  onPick: PickTarget;
  onFov: (fov: number) => void;
}) {
  const fovId = useId();
  const fovOptions = FOVS.includes(fov) ? FOVS : [...FOVS, fov].sort((x, y) => x - y);
  return (
    <section className="ex-targets" aria-label="Choose a patch of sky">
      <div className="ex-chips" role="group" aria-label="Test targets">
        <span className="ex-label">Test targets</span>
        {targets?.map((target) => {
          const active =
            !!view && Math.abs(view.ra - target.ra) < 1e-4 && Math.abs(view.dec - target.dec) < 1e-4;
          return (
            <button
              key={target.id}
              type="button"
              className={`ex-chip${active ? " is-on" : ""}`}
              aria-pressed={active}
              title={target.description}
              // Brown dwarfs are cold: SPHEREx sees them only at its longest wavelengths (detector 6).
              onClick={() => onPick({ ra: target.ra, dec: target.dec, fov: target.fov_arcmin, name: target.name, detector: target.kind === "brown_dwarf" ? "6" : "all" })}
            >
              {target.name}
              <small>{target.kind.replace(/_/g, " ")}</small>
            </button>
          );
        })}
        {!targets && !targetsError && (
          <span className="ex-chip ex-chip-skeleton" aria-hidden>
            Loading targets…
          </span>
        )}
        {targetsError && <span className="ex-muted">Preset targets are unavailable. Enter coordinates below.</span>}
      </div>

      <div className="ex-forms">
        <NameSearch onPick={onPick} />
        {/* Re-mount when the view changes elsewhere so the inputs show the new values. */}
        <CoordForm key={view ? `${view.ra},${view.dec}` : "none"} view={view} name={name} onPick={onPick} />
        <div className="ex-field ex-fov">
          <label htmlFor={fovId} className="ex-label">
            Field of view
          </label>
          <select id={fovId} className="ex-select" value={fov} onChange={(e) => onFov(Number(e.target.value))}>
            {fovOptions.map((value) => (
              <option key={value} value={value}>
                {value}′ × {value}′
              </option>
            ))}
          </select>
          <p className="ex-hint">Larger fields catch faster movers but load slower.</p>
        </div>
      </div>
    </section>
  );
}

function NameSearch({ onPick }: { onPick: PickTarget }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = query.trim();
    if (!name) {
      setMessage("Type an object name, for example Barnard’s Star.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const found = await skyJson<Resolved>(skyPaths.resolve(name));
      onPick({ ra: found.ra, dec: found.dec, name: found.name?.replace(/^NAME\s+/, "") || name });
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      setMessage(
        status === 404
          ? `No object called “${name}” was found. Try another spelling or enter coordinates.`
          : status === 503
            ? "The name service is down right now. Enter coordinates instead."
            : "Name lookup failed. Enter coordinates instead.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="ex-field ex-name" onSubmit={submit} role="search">
      <label htmlFor={id} className="ex-label">
        Find by name
      </label>
      <div className="ex-inline">
        <input
          id={id}
          className="ex-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Barnard’s Star"
          autoComplete="off"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-msg` : undefined}
        />
        <button type="submit" className="btn btn-secondary" disabled={busy}>
          {busy ? "Finding…" : "Find"}
        </button>
      </div>
      {message && (
        <p id={`${id}-msg`} className="ex-field-msg" role="status">
          {message}
        </p>
      )}
    </form>
  );
}

function CoordForm({ view, name, onPick }: { view: View | null; name: string | null; onPick: PickTarget }) {
  const id = useId();
  const [ra, setRa] = useState(view ? fmtDeg(view.ra) : "");
  const [dec, setDec] = useState(view ? fmtDeg(view.dec) : "");
  const [errors, setErrors] = useState<{ ra?: string; dec?: string }>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    let raText = ra;
    let decText = dec;
    // Allow pasting "08:55:10.8 -07:14:42" into the RA box.
    if (!decText.trim()) {
      const match = raText.trim().match(/^(.+?)[\s,]+([+\-−].+|\d+(?:\.\d+)?)$/);
      if (match && parseRA(match[1]) !== null && parseDec(match[2]) !== null) {
        raText = match[1];
        decText = match[2];
      }
    }
    const raDeg = parseRA(raText);
    const decDeg = parseDec(decText);
    const next = {
      ra: raDeg === null ? "RA must be 0–360° or 0–24h, e.g. 133.795 or 08h55m10.8s." : undefined,
      dec: decDeg === null ? "Dec must be −90 to +90°, e.g. −7.245 or −07d14m42.5s." : undefined,
    };
    setErrors(next);
    if (raDeg === null || decDeg === null) return;
    const same = view && Math.abs(view.ra - raDeg) < 1e-6 && Math.abs(view.dec - decDeg) < 1e-6;
    onPick({ ra: raDeg, dec: decDeg, name: same ? name : null });
  }

  return (
    <form className="ex-coords" onSubmit={submit} noValidate>
      <div className="ex-field">
        <label htmlFor={`${id}-ra`} className="ex-label">
          RA
        </label>
        <input
          id={`${id}-ra`}
          className="ex-input ex-num"
          value={ra}
          onChange={(e) => setRa(e.target.value)}
          placeholder="08h55m10.8s"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={errors.ra ? true : undefined}
          aria-describedby={`${id}-ra-msg`}
        />
        <p id={`${id}-ra-msg`} className={errors.ra ? "ex-field-msg" : "ex-hint"}>
          {errors.ra ?? "Degrees or h m s"}
        </p>
      </div>
      <div className="ex-field">
        <label htmlFor={`${id}-dec`} className="ex-label">
          Dec
        </label>
        <input
          id={`${id}-dec`}
          className="ex-input ex-num"
          value={dec}
          onChange={(e) => setDec(e.target.value)}
          placeholder="−07d14m42.5s"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={errors.dec ? true : undefined}
          aria-describedby={`${id}-dec-msg`}
        />
        <p id={`${id}-dec-msg`} className={errors.dec ? "ex-field-msg" : "ex-hint"}>
          {errors.dec ?? "Degrees or d m s"}
        </p>
      </div>
      <button type="submit" className="btn btn-primary ex-go">
        Go
      </button>
    </form>
  );
}
