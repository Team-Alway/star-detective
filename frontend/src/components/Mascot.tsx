"use client";

import Nova, { type NovaMood } from "@/components/Nova";

export type MascotMood = NovaMood;

/**
 * Nova, the 3D interactive telescope avatar.
 * Eyes track cursor, solar wings flutter, reacts to correct/wrong responses.
 */
export default function Mascot({
  mood = "idle",
  say,
  size = 180,
  className = "",
}: {
  mood?: MascotMood;
  say?: string;
  size?: number;
  className?: string;
}) {
  return <Nova mood={mood} say={say} size={size} className={className} />;
}
