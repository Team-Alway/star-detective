"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import SiteNav from "@/components/SiteNav";
import {
  fmtDeg,
  formatDec,
  formatRA,
  pixelToSky,
  skyJson,
  skyPaths,
  type SkyMeta,
  type SkySearch,
  type SkyTarget,
} from "@/lib/sky";
import AladinPanel from "./AladinPanel";
import ApiErrorPanel from "./ApiErrorPanel";
import InfoPanel from "./InfoPanel";
import Player from "./Player";
import ShareButtons from "./ShareButtons";
import Spectrum from "./Spectrum";
import TargetBar, { type PickTarget } from "./TargetBar";
import { useExploreUrl, useReducedMotion } from "./useExploreUrl";

const SWR_OPTS = { revalidateOnFocus: false, shouldRetryOnError: false } as const;

/** Stage 5 · Explore: any RA/Dec -> SPHEREx images of that patch played as a flip-book. */
export default function Explore({ forceEmbed = false }: { forceEmbed?: boolean }) {
  const { state, update } = useExploreUrl(forceEmbed);
  const reducedMotion = useReducedMotion();
  const { view, embed } = state;

  const targets = useSWR(embed ? null : skyPaths.targets(), skyJson<SkyTarget[]>, SWR_OPTS);
  const searchKey = view ? skyPaths.search(view) : null;
  const search = useSWR(searchKey, skyJson<SkySearch>, SWR_OPTS);
  const [attempt, setAttempt] = useState(0);

  // First visit without coordinates: start on the first test target.
  const firstTarget = targets.data?.[0];
  useEffect(() => {
    if (!view && firstTarget) {
      update({
        ra: fmtDeg(firstTarget.ra),
        dec: fmtDeg(firstTarget.dec),
        fov: String(firstTarget.fov_arcmin),
        name: firstTarget.name,
      });
    }
  }, [view, firstTarget, update]);

  // With one detector chosen, keep only the visits that detector actually observed.
  const epochs = search.data
    ? [...search.data.epochs]
        .filter((e) => state.detector === "all" || e.detectors.includes(Number(state.detector)))
        .sort((x, y) => x.mjd - y.mjd)
    : [];
  const pinnedEpoch = epochs.find((e) => e.id === state.epoch) ?? epochs[0] ?? null;

  const meta = useSWR(
    view && pinnedEpoch && !embed ? skyPaths.meta(view, pinnedEpoch.id, state.detector) : null,
    skyJson<SkyMeta>,
    { ...SWR_OPTS, keepPreviousData: true },
  );

  // A tapped spot on the image, remembered only for the view it was tapped in.
  const [pick, setPick] = useState<{ key: string; fx: number; fy: number } | null>(null);
  const activePick = pick && pick.key === searchKey ? pick : null;
  const spot = view && activePick ? pixelToSky(activePick.fx, activePick.fy, view.ra, view.dec, view.fov) : view;

  const pickTarget: PickTarget = ({ ra, dec, fov, name, detector }) => {
    update(
      {
        ra: fmtDeg(ra),
        dec: fmtDeg(dec),
        fov: fov ? String(fov) : String(state.fov),
        name: name ?? null,
        ...(detector ? { detector } : {}),
        epoch: null,
        a: null,
        b: null,
      },
      true,
    );
  };

  const retrySearch = () => {
    setAttempt((value) => value + 1);
    search.mutate();
  };

  const player = !view ? (
    <div className="ex-empty">
      <p className="ex-error-title">Pick a patch of sky to begin.</p>
      <p className="ex-error-body">
        {embed ? "Add ?ra=…&dec=… to the address to choose a spot." : "Choose a test target or type coordinates above."}
      </p>
    </div>
  ) : search.error && !search.data ? (
    <ApiErrorPanel key={`${searchKey}-${attempt}`} error={search.error} onRetry={retrySearch} />
  ) : !search.data ? (
    <div className="ex-skeleton" role="status">
      <span>Asking NASA’s archive for every SPHEREx visit to this spot…</span>
      <span className="ex-progress ex-progress-indeterminate" aria-hidden>
        <i />
      </span>
    </div>
  ) : (
    <Player
      key={searchKey}
      view={view}
      search={search.data}
      mode={state.mode}
      detector={state.detector}
      stretch={state.stretch}
      epochId={state.epoch}
      aId={state.a}
      bId={state.b}
      reducedMotion={reducedMotion}
      pick={embed ? null : activePick}
      onPick={embed ? undefined : (p) => setPick({ key: searchKey!, ...p })}
      onUrl={(patch) => update(patch)}
    />
  );

  if (embed) {
    return (
      <div className="explore explore-embed">
        <header className="ex-embed-head">
          <span className="ex-data">
            {state.name ? `${state.name} · ` : ""}
            {view ? `${formatRA(view.ra)} ${formatDec(view.dec)}` : "SPHEREx sky explorer"}
          </span>
          <a href={openHref(view, state.fov, state.name)} target="_blank" rel="noreferrer">
            Open in Star Detective ↗
          </a>
        </header>
        {player}
        <p className="ex-honest">Anything you notice here is a candidate, not a discovery.</p>
      </div>
    );
  }

  return (
    <div className="sd-page explore">
      <SiteNav active="viewer" />
      <main className="ex-main">
        <header className="ex-head">
          <p className="ex-eyebrow">Stage 5 · Real SPHEREx data</p>
          <h1 className="ex-title">Explore</h1>
          <p className="ex-lede">
            Pick any spot on the sky and watch every SPHEREx image of it play like a flip-book. Stars hold still;
            anything that moves between frames jumps out.
          </p>
          <p className="ex-honest">Anything you notice here is a candidate, not a discovery.</p>
        </header>

        <TargetBar
          targets={targets.data}
          targetsError={Boolean(targets.error)}
          view={view}
          fov={state.fov}
          name={state.name}
          onPick={pickTarget}
          onFov={(fov) => update({ fov: String(fov), epoch: null, a: null, b: null })}
        />

        <div className="ex-grid">
          <section className="ex-col-player" aria-label="SPHEREx image player">
            {player}
            {view && <ShareButtons />}
          </section>
          {view && (
            <aside className="ex-col-side" aria-label="Data details">
              <InfoPanel
                view={view}
                name={state.name}
                search={search.data}
                meta={meta.data}
                metaError={Boolean(meta.error)}
                metaLoading={meta.isLoading}
              />
              {search.data && spot && (
                <Spectrum
                  key={searchKey}
                  ra={spot.ra}
                  dec={spot.dec}
                  epochId={pinnedEpoch?.id ?? null}
                  epochDate={pinnedEpoch?.date_obs ?? null}
                  picked={Boolean(activePick)}
                  onReset={() => setPick(null)}
                />
              )}
            </aside>
          )}
        </div>

        {view && <AladinPanel view={view} />}
      </main>
    </div>
  );
}

function openHref(view: { ra: number; dec: number } | null, fov: number, name: string | null) {
  if (!view) return "/viewer";
  const params = new URLSearchParams({ ra: fmtDeg(view.ra), dec: fmtDeg(view.dec), fov: String(fov) });
  if (name) params.set("name", name);
  return `/viewer?${params}`;
}
