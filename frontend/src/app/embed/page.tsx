import { Suspense } from "react";
import Explore from "@/components/explore/Explore";
import "../explore.css";

export const metadata = { title: "SPHEREx sky explorer · Star Detective" };

/** Same as /viewer?embed=1: only the player, for iframes on other sites. */
export default function EmbedPage() {
  return (
    <Suspense fallback={<div className="explore ex-fallback">Loading…</div>}>
      <Explore forceEmbed />
    </Suspense>
  );
}
