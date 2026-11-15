import AnswerButtons from "@/components/AnswerButtons";
import StatePanel, { LoadingBar } from "@/components/StatePanel";

export const metadata = { title: "Recovery and help states · Star Detective" };

/** Reference board for the recovery, help and answer states used across the app. */
export default function StatesPage() {
  return (
    <div className="sd-page states">
      <p className="eyebrow-data">STAR DETECTIVE / ALWAYS A NEXT STEP</p>
      <h1 className="states-title">Clear even when the archive isn’t.</h1>
      <p className="states-sub">
        Keep the question simple. Explain what happened. Make recovery obvious.
      </p>

      <div className="states-grid">
        <StatePanel label="01 / LOADING" title="Fetching image from the NASA archive">
          <div className="loading-skeleton" />
          <LoadingBar />
          <p className="state-note">A progress line shows that the request is still active.</p>
        </StatePanel>
        <StatePanel
          label="02 / IMAGE FAILED"
          title="We could not load this image."
          actions={
            <>
              <button type="button" className="btn btn-primary btn-w160">
                Try again
              </button>
              <button type="button" className="btn btn-secondary btn-w216">
                Play a saved level
              </button>
            </>
          }
        >
          Try the request again or continue with saved data.
        </StatePanel>
        <StatePanel
          label="03 / NO SECOND DATE"
          title="SPHEREx has only one image of this spot so far."
          actions={
            <button type="button" className="btn btn-secondary btn-block">
              Try nearby patch
            </button>
          }
        >
          Choose a nearby prepared patch with two dates.
        </StatePanel>
        <StatePanel
          label="04 / OFFLINE OR SLOW"
          title="Showing saved levels while the archive is unreachable"
          actions={
            <button type="button" className="btn btn-secondary btn-block">
              Play a saved level
            </button>
          }
        >
          Saved patches keep their original data labels.
        </StatePanel>
        <StatePanel
          label="05 / FIRST VISIT & HELP"
          title="What am I looking at?"
          actions={
            <button type="button" className="btn btn-ghost btn-block">
              Got it
            </button>
          }
        >
          <ol className="help-steps">
            <li>Compare the same patch at two times.</li>
            <li>Watch for a dot that changes position.</li>
            <li>Choose one of the two answers.</li>
          </ol>
        </StatePanel>
        <StatePanel
          label="06 / ANSWER RECORDED"
          title="Your answer is in."
          actions={<AnswerButtons disabled />}
        >
          Disable both choices while the reveal appears. Keep the image in place, then show why.
        </StatePanel>
      </div>

      <p className="eyebrow-data states-access">ACCESSIBLE BY DEFAULT</p>
      <p className="footnote">
        Manual start · Slow 1 swap/sec · Fast 2 swaps/sec · Never above 3 · Reduce motion defaults to
        Swipe or manual stepping
      </p>
      <p className="footnote">
        Space: blink · ← / →: step images · Tab: controls · Enter: answer · 44 px minimum targets ·
        Feedback uses words and symbols
      </p>
    </div>
  );
}
