import Link from "next/link";

const states = [
  {
    label: "01 / LOADING",
    title: "Fetching image from the NASA archive",
    content: <><div className="state-skeleton" /><div className="state-progress" /><p>A progress line shows that the request is still active.</p></>,
  },
  {
    label: "02 / IMAGE FAILED",
    title: "We could not load this image.",
    content: <><p>Try the request again or continue with saved data.</p><div className="state-actions"><button className="state-primary" type="button">Try again</button><Link className="state-secondary" href="/play">Play a saved level</Link></div></>,
  },
  {
    label: "03 / NO SECOND DATE",
    title: "SPHEREx has only one image of this spot so far.",
    content: <><p>Choose a nearby prepared patch with two dates.</p><Link className="state-secondary full" href="/viewer">Try nearby patch</Link></>,
  },
  {
    label: "04 / OFFLINE OR SLOW",
    title: "Showing saved levels while the archive is unreachable",
    content: <><p>Saved patches keep their original data labels.</p><Link className="state-secondary full" href="/play">Play a saved level</Link></>,
  },
  {
    label: "05 / FIRST VISIT & HELP",
    title: "What am I looking at?",
    content: <><ol><li>Compare the same patch at two times.</li><li>Watch for a dot that changes position.</li><li>Choose one of the two answers.</li></ol><Link className="state-dark full" href="/play">Got it</Link></>,
  },
  {
    label: "06 / ANSWER RECORDED",
    title: "Your answer is in.",
    content: <><p>Disable both choices while the reveal appears. Keep the image in place, then show why.</p><div className="answer-state"><button type="button" disabled>Nothing moving</button><button className="selected" type="button">I see movement</button></div></>,
  },
];

export default function StatesPage() {
  return (
    <main className="states-page">
      <div className="states-content">
        <p className="states-eyebrow">STAR DETECTIVE / ALWAYS A NEXT STEP</p>
        <h1>Clear even when the archive isn’t.</h1>
        <p className="states-lede">Keep the question simple. Explain what happened. Make recovery obvious.</p>
        <section className="state-grid" aria-label="Application states">
          {states.map((state) => (
            <article className="state-card" key={state.label}>
              <p className="state-label">{state.label}</p>
              <h2>{state.title}</h2>
              <div className="state-card-content">{state.content}</div>
            </article>
          ))}
        </section>
        <footer className="states-footer">
          <p>ACCESSIBLE BY DEFAULT</p>
          <small>Manual start · Slow 1 swap/sec · Fast 2 swaps/sec · Never above 3 · Reduce motion defaults to Swipe or manual stepping<br />Space: blink · ← / →: step images · Tab: controls · Enter: answer · 44 px minimum targets · Feedback uses words and symbols</small>
        </footer>
      </div>
    </main>
  );
}
