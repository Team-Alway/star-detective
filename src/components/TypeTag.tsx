export default function TypeTag({
  label,
  tone = "simulated",
}: {
  label: string;
  tone?: "simulated" | "candidate" | "muted";
}) {
  return <span className={`type-tag type-tag-${tone}`}>{label}</span>;
}
