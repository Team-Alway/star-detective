import { SkyPhoto } from "@/components/SkyImage";

export default function PatchCard({
  title,
  lines,
  selected,
  onSelect,
  src,
  mode,
}: {
  title: string;
  lines: string[];
  selected: boolean;
  onSelect: () => void;
  src?: string;
  mode?: "api" | "saved";
}) {
  return (
    <button
      type="button"
      className={`patch-card ${selected ? "patch-card-selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="patch-thumb">
        <SkyPhoto src={src} mode={mode} />
      </span>
      <span className="patch-card-text">
        <span className="patch-card-title">{title}</span>
        {lines.map((line) => (
          <span key={line} className="patch-card-line">
            {line}
          </span>
        ))}
      </span>
    </button>
  );
}
