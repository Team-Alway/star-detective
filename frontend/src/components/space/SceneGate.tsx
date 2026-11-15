"use client";

import { usePathname } from "next/navigation";
import SpaceScene from "@/components/space/SpaceScene";

/** The Three.js scene lives on the home page only; every other page gets a solid colour. */
export default function SceneGate() {
  return usePathname() === "/" ? <SpaceScene /> : null;
}
