"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { SAVED_ROUND, describeOutcome, loadRound, type RoundPatch } from "@/lib/round";
import { saveRound } from "@/lib/xp";

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

  return (
    <div className="sd-page">
      <SiteNav hidePlayLink active="viewer">
        <PlayMeta
          patch={index + 1}
          total={patches.length}
          xpNode={<XpCounter value={totalXp} tone={xpTone} />}
        />
      </SiteNav>

      {(saved || !online) && (
        <div className="offline-bar" role="status">
          <strong>Showing saved levels while the archive is unreachable.</strong>{" "}
          Saved patches keep their original data labels.
        </div>
      )}

      <main className={`stage ${revealing ? "stage-reveal" : "stage-ask"}`}>
        <div className="stage-left">
          <div className="sky-wrap">
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

          <div className="controls-block">
            <BlinkControls blink={blink} />
            <p className="hint hint-desktop">Prefer no flashing? Step through A and B.</p>
          </div>

          {!revealing && (
            <div className="answers-block">
              <p className="hint hint-mobile">
                {preview
                  ? "Design preview · A / B use one reference image. Blink starts only when you press it."
                  : "Real observation dates on every image. Blink starts only when you press it."}
              </p>
              <AnswerButtons
                onAnswer={answer}
                disabled={phase !== "ask"}
                chosen={chosen}
              />
              {phase === "recorded" && (
                <p className="state-note" role="status">
                  Your answer is in.
                </p>
              )}
            </div>
          )}

          <p className="footnote footnote-desktop">
            {preview
              ? "DESIGN PREVIEW · One SPHEREx reference image. A / B and target motion are simulated, not separate observations."
              : `${patch.images.tag?.toUpperCase()} DATA · Two observation dates of the same patch, rendered from NASA FITS files. Dates and data labels are shown on every image.`}
          </p>
        </div>

        {!revealing ? (
          <div className="stage-right">
            <p className="eyebrow-data">ONE PATCH. ONE QUESTION.</p>
            <h1 className="stage-title">Watch the two images flip. Did anything move?</h1>
            <p className="stage-copy">
              You don’t need to find the exact spot. Compare the images, then choose an answer below.
            </p>
            <ol className="steps">
              <li>
                <span className="step-num">01</span>
                <span className="step-name">Compare</span>
                <span className="step-desc">Press Start blink, or step between A and B.</span>
              </li>
              <li>
                <span className="step-num">02</span>
                <span className="step-name">Choose</span>
                <span className="step-desc">Nothing moving, or I see movement.</span>
              </li>
              <li>
                <span className="step-num">03</span>
                <span className="step-name">Learn</span>
                <span className="step-desc">See the answer, then try the next patch.</span>
              </li>
            </ol>
            <button type="button" className="btn btn-ghost btn-help" onClick={() => setHelpOpen(true)}>
              What am I looking at?
            </button>
            <div className="notice">
              <p className="notice-label">YOU CONTROL THE COMPARISON</p>
              <p className="notice-body">
                Blink never starts on its own. Manual stepping is always available.{" "}
                {preview
                  ? "Demo images use the same NASA reference with a test target added."
                  : "These are real observations from two dates, not simulated images."}
              </p>
            </div>
          </div>
        ) : (
          <div className="stage-right reveal-side" aria-live="polite">
            <p className="eyebrow-data eyebrow-muted">THE EVIDENCE / PATCH {index + 1}</p>
            <div className="reveal-head">
              <h1 className="reveal-title">{outcome.title}</h1>
              <p className={`reveal-xp reveal-xp-${outcome.tone}`}>{outcome.xpLabel}</p>
            </div>
            <p className="reveal-choice">{outcome.chose}</p>
            <TypeTag label={outcome.badge} tone={outcome.badgeTone} />
            <RevealCard
              name={outcome.cardName}
              description={outcome.cardDescription}
              dates={outcome.cardDates}
              note={outcome.cardNote}
              link={outcome.cardLink}
            />
            <p className="how-label">HOW YOU CAN TELL</p>
            <p className="how-text">{outcome.how}</p>
            <div className="reveal-actions">
              <button type="button" className="btn btn-primary" onClick={next}>
                {isLast ? "See results" : "Next patch"}
              </button>
              <Link className="btn btn-secondary" href="/viewer">
                Open in viewer
              </Link>
            </div>
            <p className="footnote reveal-note">
              {preview
                ? "Example outcome. Replace with a verified patch and catalogue match before live play."
                : `${patch.reveal?.instrument} \u00b7 ${patch.reveal?.band}. Anything you notice in the Viewer is a candidate, not a discovery.`}
            </p>
          </div>
        )}
      </main>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
