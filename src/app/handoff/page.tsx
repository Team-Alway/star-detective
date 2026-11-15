const roadmap = [
  {
    number: "01",
    label: "DESIGNED NOW",
    items: [
      "Quick Spotter: two equal answer buttons",
      "Four-patch progress and XP",
      "Found, missed and glitch reveals",
      "End-of-round summary and replay",
      "Prepared-patch viewer with Swipe",
      "Desktop and mobile MVP destinations",
    ],
  },
  {
    number: "02",
    label: "BEFORE LIVE PLAY",
    items: [
      "Connect four verified SPHEREx pairs",
      "Use the prepared patches’ real names",
      "Verify coordinates, dates and bands",
      "Replace simulated outcome examples",
      "Match XP rules to the backend",
      "Implement keyboard and reduce motion",
    ],
  },
  {
    number: "03",
    label: "LATER, NOT IN THE WAY",
    items: [
      "Sky Hunter: click the exact spot",
      "Three attempts, hints and Motion X-Ray",
      "Wavelength picker and campaign zones",
      "Ranks and rank-up reward",
      "Candidate flagging and catalogue checks",
      "Leaderboard, profile and collection",
    ],
  },
];

export default function HandoffPage() {
  return (
    <main className="handoff-page">
      <div className="handoff-content">
        <p className="handoff-eyebrow">STAR DETECTIVE / MVP HANDOFF</p>
        <h1>Small loop. Strong evidence.</h1>
        <p className="handoff-lede">One question at a time. Four patches. A clear path into the viewer.</p>
        <section className="roadmap-grid" aria-label="MVP roadmap">
          {roadmap.map((column) => (
            <article className="roadmap-card" key={column.number}>
              <p className="roadmap-number">{column.number}</p>
              <p className="roadmap-label">{column.label}</p>
              <ul>{column.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </section>
        <section className="xp-rules" aria-label="Quick Spotter XP rules">
          <p>QUICK SPOTTER XP</p>
          <pre>{"Mover spotted  +150     /     Glitch or no change rejected  +100\nFooled by a glitch  -25     /     Missed mover  0"}</pre>
        </section>
      </div>
    </main>
  );
}
