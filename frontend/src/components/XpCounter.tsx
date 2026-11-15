import "@/app/inner-game.css";

export default function XpCounter({
  value,
  tone = "default",
}: {
  value: number;
  tone?: "default" | "gain" | "loss";
}) {
  return (
    <div className={`ig-xp ig-xp-${tone}`} aria-live="polite">
      <span className="ig-xp-label">XP</span>
      <span className="ig-xp-value">{value}</span>
    </div>
  );
}
