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
    <div className="reveal-card">
      <h2 className="reveal-card-name">{name}</h2>
      <p className="reveal-card-detail">{description}</p>
      <p className="reveal-card-dates">{dates}</p>
      <p className="reveal-card-detail">{note}</p>
      {link && (
        <a className="reveal-card-link" href={link.href} target="_blank" rel="noreferrer">
          {link.label}
        </a>
      )}
    </div>
  );
}
