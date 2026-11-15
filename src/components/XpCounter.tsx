export default function XpCounter({
  value,
  tone = "default",
}: {
  value: number;
  tone?: "default" | "gain" | "loss";
}) {
  return (
    <div className={`xp xp-${tone}`} aria-live="polite">
      <span className="xp-label">XP</span>
      <span className="xp-value">{value}</span>
    </div>
  );
}
