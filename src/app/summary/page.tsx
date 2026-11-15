import Link from "next/link";

export default function SummaryPage() {
  return (
    <main className="final-summary-page">
      <header className="final-summary-navigation">
        <Link className="summary-brand" href="/">Star Detective</Link>
        <nav className="final-summary-nav" aria-label="Page actions">
          <Link className="current" href="/play">Quick Spotter</Link>
          <Link href="/viewer">Viewer</Link>
          <Link href="/about">About the data</Link>
        </nav>
      </header>

      <div className="final-summary-layout">
        <section className="final-summary-intro">
          <p className="final-summary-eyebrow">ROUND COMPLETE / SAMPLE RESULTS</p>
          <h1>Case closed:<br />3 of 4</h1>
          <p className="final-summary-correct">correct</p>
          <p className="final-summary-score">325 XP</p>
          <p className="final-summary-copy">You spotted the difference in three patches. Take another look at the one that fooled you.</p>
          <div className="final-summary-actions">
            <Link className="play-again" href="/play">Play again</Link>
            <Link className="explore-patches" href="/viewer">Explore the patches yourself</Link>
          </div>
          <p className="final-summary-disclaimer">A sample four-patch round. This is not a live result.</p>
        </section>

        <section className="patch-results" aria-labelledby="patch-results-title">
          <p id="patch-results-title" className="final-summary-eyebrow">YOUR PATCHES</p>
          <div className="patch-result-list">
            <article className="patch-result-card"><span className="result-status correct">✓</span><div><h2>Patch 01 · Mover</h2><p>You saw movement</p></div><strong>+150 XP</strong></article>
            <article className="patch-result-card"><span className="result-status correct">✓</span><div><h2>Patch 02 · Glitch</h2><p>Nothing moving — good eye</p></div><strong>+100 XP</strong></article>
            <article className="patch-result-card"><span className="result-status wrong">×</span><div><h2>Patch 03 · Glitch</h2><p>You saw movement</p></div><strong className="wrong">-25 XP</strong></article>
            <article className="patch-result-card"><span className="result-status correct">✓</span><div><h2>Patch 04 · No change</h2><p>Nothing moving — good eye</p></div><strong>+100 XP</strong></article>
          </div>
          <div className="summary-tip"><p>A dot that appears once is not always a mover.</p><small>Compare again in the viewer — nothing is scored there.</small></div>
        </section>
      </div>
    </main>
  );
}
