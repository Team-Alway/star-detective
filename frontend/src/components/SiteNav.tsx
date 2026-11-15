import Link from "next/link";
import type { ReactNode } from "react";

type NavKey = "play" | "viewer" | "about";

const LINKS: { key: NavKey; href: string; label: string; short?: string; width: string }[] = [
  { key: "play", href: "/play", label: "Quick Spotter", width: "btn-w184" },
  { key: "viewer", href: "/viewer", label: "Viewer", width: "btn-w136" },
  { key: "about", href: "/about", label: "About the data", short: "About", width: "btn-w200" },
];

export default function SiteNav({
  active,
  hidePlayLink = false,
  children,
}: {
  active?: NavKey;
  /** Quick Spotter screens show a "QUICK SPOTTER" label instead of the link. */
  hidePlayLink?: boolean;
  children?: ReactNode;
}) {
  return (
    <nav className="site-nav" aria-label="Primary navigation">
      <Link className="brand" href="/">
        Star Detective
      </Link>
      {hidePlayLink && <span className="nav-label">QUICK SPOTTER</span>}
      {children}
      <div className="nav-links">
        {LINKS.filter((link) => !(hidePlayLink && link.key === "play")).map((link) => (
          <Link
            key={link.key}
            href={link.href}
            aria-current={active === link.key ? "page" : undefined}
            className={`btn ${active === link.key ? "btn-secondary" : "btn-ghost"} ${link.width} ${
              link.key === "about" ? "nav-keep" : "nav-extra"
            }`}
          >
            <span className="nav-long">{link.label}</span>
            <span className="nav-short">{link.short ?? link.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function PlayMeta({
  patch,
  total,
  xpNode,
}: {
  patch: number;
  total: number;
  xpNode: ReactNode;
}) {
  return (
    <div className="play-meta">
      <div className="patch-progress">
        <span className="data-text">
          Patch {patch} of {total}
        </span>
        <div className="segs" aria-hidden>
          {Array.from({ length: total }, (_, index) => (
            <span key={index} className={`seg ${index < patch ? "on" : ""}`} />
          ))}
        </div>
      </div>
      {xpNode}
    </div>
  );
}
