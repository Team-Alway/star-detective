import "@/app/inner-game.css";

/** The object behind a patch, laid out as spec-sheet rows. */
export default function RevealCard({
  name,
  description,
  dates,
  note,
  link,
}: {
  name: string;
  description: string;
  dates: string;
  note: string;
  link?: { label: string; href: string };
}) {
  return (
    <div className="ig-rc">
      <h2 className="ig-rc-name">{name}</h2>
      <dl className="ig-spec">
        <div>
          <dt>Object</dt>
          <dd>{description}</dd>
        </div>
        <div>
          <dt>Dates</dt>
          <dd>{dates}</dd>
        </div>
      </dl>
      <p className="ig-rc-note">{note}</p>
      {link && (
        <a className="ig-rc-link" href={link.href} target="_blank" rel="noreferrer">
          {link.label}
        </a>
      )}
    </div>
  );
}
