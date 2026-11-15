"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import useSWR from "swr";
import AnswerButtons from "@/components/AnswerButtons";
import ArchiveState from "@/components/ArchiveState";
import BlinkControls, { useBlink } from "@/components/BlinkControls";
import HelpDialog from "@/components/HelpDialog";
import RevealCard from "@/components/RevealCard";
import RevealMarkers from "@/components/RevealMarkers";
import SiteNav, { PlayMeta } from "@/components/SiteNav";
import SkyImage from "@/components/SkyImage";
import TypeTag from "@/components/TypeTag";
import XpCounter from "@/components/XpCounter";
import { buildEntry, type Answer, type RoundEntry } from "@/lib/demo";
import { SAVED_ROUND, describeOutcome, formatDate, loadRound, type RoundPatch } from "@/lib/round";
import { saveRound } from "@/lib/xp";
import "@/app/inner-game.css";

const HELP_KEY = "star-detective-help-seen";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

type Phase = "ask" | "recorded" | "reveal";

/** Loads the Training round from the API, falling back to the bundled saved level. */
export default function QuickSpotter() {
  const [useSaved, setUseSaved] = useState(false);
  const { data, error, mutate } = useSWR(useSaved ? null : "round:stage-4", loadRound, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  if (useSaved) return <Round patches={SAVED_ROUND} saved />;
  if (data) return <Round patches={data} />;
  return (
    <ArchiveState
      hidePlayLink
      active="play"
      failed={Boolean(error)}
      onRetry={() => mutate()}
      onSaved={() => setUseSaved(true)}
    />
  );
}

function Round({ patches, saved = false }: { patches: RoundPatch[]; saved?: boolean }) {
  const router = useRouter();
  const blink = useBlink();
  const online = useOnline();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("ask");
  const [chosen, setChosen] = useState<Answer | null>(null);
  const [entries, setEntries] = useState<RoundEntry[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const root = useRef<HTMLDivElement>(null);

  const patch = patches[index];
  const entry = phase === "reveal" ? entries[index] : undefined;
  const outcome = entry ? describeOutcome(patch, entry.answer) : undefined;
  const totalXp = entries.reduce((sum, item) => sum + item.delta, 0);
  const isLast = index === patches.length - 1;
  const xpTone = !entry ? "default" : entry.delta > 0 ? "gain" : entry.delta < 0 ? "loss" : "default";

  // First visit: open the help once.
  useEffect(() => {
    const open = window.setTimeout(() => {
      try {
        if (!localStorage.getItem(HELP_KEY)) {
          localStorage.setItem(HELP_KEY, "1");
          setHelpOpen(true);
        }
      } catch {
        /* storage unavailable: skip the first-visit help */
      }
    }, 0);
    return () => window.clearTimeout(open);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function answer(choice: Answer) {
    if (phase !== "ask") return;
    blink.reset();
    setChosen(choice);
    setPhase("recorded");
    timer.current = window.setTimeout(() => {
      setEntries((current) => [...current.slice(0, index), buildEntry(patch, choice)]);
      setPhase("reveal");
    }, 500);
  }

  function next() {
    if (isLast) {
      saveRound(entries);
      router.push("/summary");
      return;
    }
    blink.reset();
    setIndex(index + 1);
    setPhase("ask");
    setChosen(null);
  }

  const revealing = phase === "reveal" && outcome;
  const preview = patch.images.mode === "saved";
  // Always show the label the data carries (the API says Real or Simulated); saved levels are simulated previews.
  const tag = preview ? "Simulated preview" : (patch.images.tag ?? "Unlabelled");
  const pad = (n: number) => String(n).padStart(2, "0");

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scope = root.current;
        if (!scope) return;
        const words = scope.querySelectorAll("[data-ig-word]");
        const rows = scope.querySelectorAll("[data-ig-rise]");
        if (words.length) gsap.from(words, { yPercent: 110, duration: 0.8, stagger: 0.08, ease: "power4.out" });
        if (rows.length) gsap.from(rows, { y: 20, opacity: 0, duration: 0.55, stagger: 0.06, ease: "power3.out" });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [index, phase === "reveal"] },
  );

  return (
    <div className="sd-page ig-page" ref={root}>
      <SiteNav hidePlayLink active="play">
        <PlayMeta
          patch={index + 1}
          total={patches.length}
          xpNode={<XpCounter value={totalXp} tone={xpTone} />}
        />
      </SiteNav>

      <main className="ig-wrap">
        {(saved || !online) && (
          <div className="ig-banner" role="status">
            <strong>Showing saved levels while the archive is unreachable.</strong> Saved patches keep their
            original data labels.
          </div>
        )}

        <header className="ig-play-head">
          <div>
            <p className="ig-eyebrow">
              Stage 04 · <b>{tag} SPHEREx patches</b>
            </p>
            <h1 className="ig-title">
              <span className="ig-title-word">
                <span data-ig-word>Training</span>
              </span>
            </h1>
          </div>
          <dl className="ig-spec">
            <div>
              <dt>Patch</dt>
              <dd>
                {pad(index + 1)} / {pad(patches.length)}
              </dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd className="ig-accent">{tag}</dd>
            </div>
            <div>
              <dt>Dates</dt>
              <dd>
                {formatDate(patch.images.dateA)} → {formatDate(patch.images.dateB)}
              </dd>
            </div>
          </dl>
        </header>

        <div className="ig-play-grid">
          <section className="ig-sky-col" aria-label={`Patch ${index + 1} images`}>
            <div className="ig-sky">
              <SkyImage
                key={patch.id}
                images={patch.images}
                side={blink.side}
                patchKind={patch.kind}
                showTarget={!revealing}
              >
                {revealing && <RevealMarkers patch={patch} outcome={outcome} />}
              </SkyImage>
            </div>
            {!revealing && <BlinkControls blink={blink} />}
            <p className="ig-sky-note">
              {preview
                ? "Design preview · A and B use one SPHEREx reference image. Target motion is simulated, not two observations."
                : `${tag} data · two observation dates of the same patch. The date and data label are on every image.`}{" "}
              Blink starts only when you press it.
            </p>
          </section>

          {!revealing ? (
            <aside className="ig-side" aria-label="Your answer">
              <p className="ig-eyebrow" data-ig-rise>
                One patch · <b>one question</b>
              </p>
              <h2 className="ig-ask-q" data-ig-rise>
                Did anything move?
              </h2>
              <p className="ig-side-copy" data-ig-rise>
                Flip between the two images. You don’t need to find the exact spot. Just decide.
              </p>
              <div data-ig-rise>
                <AnswerButtons onAnswer={answer} disabled={phase !== "ask"} chosen={chosen} />
                {phase === "recorded" && (
                  <p className="ig-recorded" role="status">
                    ✓ Your answer is in
                  </p>
                )}
              </div>
              <ol className="ig-numbered">
                <li data-ig-rise>
                  <span className="ig-n">01</span>
                  <span className="ig-n-name">Compare</span>
                  <span className="ig-n-desc">Press Blink, or step between A and B.</span>
                </li>
                <li data-ig-rise>
                  <span className="ig-n">02</span>
                  <span className="ig-n-name">Choose</span>
                  <span className="ig-n-desc">Nothing moving, or I see movement.</span>
                </li>
                <li data-ig-rise>
                  <span className="ig-n">03</span>
                  <span className="ig-n-name">Learn</span>
                  <span className="ig-n-desc">See the answer, then try the next patch.</span>
                </li>
              </ol>
              <div className="ig-side-actions" data-ig-rise>
                <button type="button" className="ig-pill ig-pill-ghost" onClick={() => setHelpOpen(true)}>
                  What am I looking at?
                </button>
              </div>
              <div className="ig-note" data-ig-rise>
                <p className="ig-eyebrow">
                  <b>You control the comparison</b>
                </p>
                <p>
                  Blink never starts on its own. Manual stepping is always available.{" "}
                  {preview
                    ? "Demo images use the same NASA reference with a test target added."
                    : `These images are labelled ${tag}.`}
                </p>
              </div>
            </aside>
          ) : (
            <aside className="ig-side" aria-live="polite" aria-label="The answer">
              <p className="ig-eyebrow" data-ig-rise>
                The evidence · <b>Patch {pad(index + 1)}</b>
              </p>
              <h2 className="ig-reveal-title" data-ig-rise>
                {outcome.title}
              </h2>
              <p className={`ig-reveal-xp ig-tone-${outcome.tone}`} data-ig-rise>
                {outcome.tone === "correct" ? "✓ " : outcome.tone === "wrong" ? "✕ " : ""}
                {outcome.xpLabel}
              </p>
              <p className="ig-reveal-choice" data-ig-rise>
                {outcome.chose}
              </p>
              <div data-ig-rise>
                <TypeTag label={outcome.badge} tone={outcome.badgeTone} />
                <RevealCard
                  name={outcome.cardName}
                  description={outcome.cardDescription}
                  dates={outcome.cardDates}
                  note={outcome.cardNote}
                  link={outcome.cardLink}
                />
              </div>
              <div className="ig-how" data-ig-rise>
                <p className="ig-eyebrow">
                  <b>How you can tell</b>
                </p>
                <p>{outcome.how}</p>
              </div>
              <div className="ig-side-actions" data-ig-rise>
                <button type="button" className="ig-pill ig-pill-lg ig-pill-primary" onClick={next}>
                  {isLast ? "See results" : "Next patch"} <span className="ig-arrow" aria-hidden>→</span>
                </button>
                <Link className="ig-pill ig-pill-lg" href="/viewer">
                  Open in viewer
                </Link>
              </div>
              <p className="ig-foot">
                {preview
                  ? "Example outcome. Replace with a verified patch and catalogue match before live play."
                  : `${patch.reveal?.instrument} \u00b7 ${patch.reveal?.band} \u00b7 ${tag} data. Anything you notice in the Viewer is a candidate, not a discovery.`}
              </p>
            </aside>
          )}
        </div>
      </main>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
