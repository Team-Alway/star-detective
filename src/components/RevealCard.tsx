import { SOURCE_URL } from "@/lib/demo";

export default function RevealCard({
  name,
  description,
  dates = "27 Mar 2025 · demo A / B",
  children,
}: {
  name: string;
  description: string;
  dates?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="reveal-card">
      <h2 className="reveal-card-name">{name}</h2>
      <p className="reveal-card-detail">{description}</p>
      <p className="reveal-card-dates">{dates}</p>
      <p className="reveal-card-detail">Movement not measured in demo</p>
      <a className="reveal-card-link" href={SOURCE_URL} target="_blank" rel="noreferrer">
        NASA / JPL image source ↗
      </a>
      {children}
    </div>
  );
}
