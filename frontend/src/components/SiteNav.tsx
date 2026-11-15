"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useProgress } from "@/lib/progress";
import ShinyText from "@/components/ShinyText";
import StageBar from "@/components/StageBar";

type NavKey = "play" | "viewer" | "about" | "academy" | "leaderboard";

const LINKS: { key: NavKey; href: string; label: string; short?: string }[] = [
  { key: "academy", href: "/academy", label: "Academy", short: "Academy" },
  { key: "play", href: "/play", label: "Stage 4: Training", short: "Training" },
  { key: "viewer", href: "/viewer", label: "Stage 5: Explore", short: "Explore" },
  { key: "leaderboard", href: "/leaderboard", label: "Leaderboard", short: "Leaderboard" },
  { key: "about", href: "/about", label: "About", short: "About" },
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
  const pathname = usePathname();
  const { stage, user } = useProgress();
  const currentKey =
    active ??
    (pathname.startsWith("/play")
      ? "play"
      : pathname.startsWith("/viewer")
        ? "viewer"
        : pathname.startsWith("/academy")
          ? "academy"
          : pathname.startsWith("/leaderboard")
            ? "leaderboard"
            : pathname.startsWith("/about")
              ? "about"
              : undefined);
  const current = pathname.startsWith("/play") ? 4 : pathname.startsWith("/viewer") ? 5 : pathname.startsWith("/academy") ? Math.min(stage, 3) : 0;
  return (
    <header className="site-header">
    <nav className="site-nav" aria-label="Primary navigation">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden>✦</span>
        <ShinyText text="Star Detective" speed={4} className="brand-text" />
      </Link>
      {hidePlayLink && <span className="nav-label">STAGE 4: TRAINING</span>}
      {children}
      <div className="nav-links">
        {LINKS.filter((link) => !(hidePlayLink && link.key === "play")).map((link) => (
          <Link
            key={link.key}
            href={link.href}
            aria-current={currentKey === link.key ? "page" : undefined}
            className={`btn ${currentKey === link.key ? "btn-secondary btn-active text-white" : "btn-ghost text-slate-300 hover:text-white"} ${
              "nav-extra"
            }`}
          >
            <span className="nav-long">{link.label}</span>
            <span className="nav-short">{link.short ?? link.label}</span>
          </Link>
        ))}
        <Link href={user ? "/academy" : "/login"} className="btn btn-secondary nav-keep">
          <span>{user ? user.display_name : "Log in"}</span>
        </Link>
      </div>
    </nav>
    {pathname !== "/" && <StageBar current={current} unlocked={stage} />}
    </header>
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
