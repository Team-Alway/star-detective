"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import SiteNav from "@/components/SiteNav";
import { fetchLeaderboard, type LeaderboardRow } from "@/lib/api";

const PLACES = ["First place", "Second place", "Third place"];
const fmt = (n: number) => n.toLocaleString("en-US");
const pad = (n: number) => String(n).padStart(2, "0");

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState(false);
  const board = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLeaderboard().then(setRows).catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!rows || !board.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-reveal]", { y: 18, opacity: 0, stagger: 0.05, duration: 0.5, ease: "power3.out" });
    }, board);
    return () => ctx.revert();
  }, [rows]);

  const top = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];

  return (
    <div className="in-page sd-page">
      <SiteNav />
      <main className="in-main">
        <p className="in-eyebrow">Top detectives by XP</p>
        <h1 className="in-title">Leaderboard</h1>

        <div ref={board} aria-live="polite">
          {error && (
            <p className="in-state in-state-error" style={{ marginTop: 72 }}>
              The leaderboard is unavailable right now. Try again later.
            </p>
          )}
          {!error && !rows && (
            <p className="in-state" style={{ marginTop: 72 }}>
              Loading…
            </p>
          )}
          {rows && rows.length === 0 && (
            <p className="in-state" style={{ marginTop: 72 }}>
              No scores yet. Be the first!
            </p>
          )}

          {top.length > 0 && (
            <ol className="lb-podium" aria-label="Top three">
              {top.map((r, i) => (
                <li key={`${r.display_name}-${i}`} className="lb-place" data-reveal>
                  <span className="lb-rank" aria-hidden>
                    {pad(i + 1)}
                  </span>
                  <span className="lb-place-label">{PLACES[i]}</span>
                  <span className="lb-name" title={r.display_name}>
                    {r.display_name}
                  </span>
                  <span className="lb-xp">
                    {fmt(r.xp)}
                    <small>XP</small>
                  </span>
                </li>
              ))}
            </ol>
          )}

          {rest.length > 0 && (
            <table className="lb-table">
              <caption className="sr-only">Ranks 4 and below</caption>
              <thead>
                <tr>
                  <th scope="col" className="lb-col-rank">
                    Rank
                  </th>
                  <th scope="col" className="lb-col-name">
                    Detective
                  </th>
                  <th scope="col" className="lb-col-xp">
                    XP
                  </th>
                </tr>
              </thead>
              <tbody>
                {rest.map((r, i) => (
                  <tr key={`${r.display_name}-${i + 3}`} data-reveal>
                    <td className="lb-col-rank">{pad(i + 4)}</td>
                    <td className="lb-col-name" title={r.display_name}>
                      {r.display_name}
                    </td>
                    <td className="lb-col-xp">{fmt(r.xp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
