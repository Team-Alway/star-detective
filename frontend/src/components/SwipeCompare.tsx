"use client";

import { useRef, useState } from "react";
import { SkyPhoto } from "@/components/SkyImage";
import type { ImageSet } from "@/lib/round";

/** Drag (or use the arrow keys) to reveal image B over image A. */
export default function SwipeCompare({ images }: { images: ImageSet }) {
  const [position, setPosition] = useState(50);
  const frame = useRef<HTMLDivElement>(null);

  function moveTo(clientX: number) {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100)));
  }

  return (
    <div
      ref={frame}
      className="swipe"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) moveTo(event.clientX);
      }}
    >
      <div className="swipe-b" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
        <SkyPhoto src={images.srcB} mode={images.mode} />
      </div>
      <span className="swipe-label swipe-label-a">Image A</span>
      <span className="swipe-label swipe-label-b">{images.mode === "saved" ? "Demo B" : "Image B"}</span>
      <div className="swipe-divider" style={{ left: `${position}%` }} />
      <div
        className="swipe-grip"
        style={{ left: `${position}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Comparison position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setPosition((value) => Math.max(0, value - 5));
          if (event.key === "ArrowRight") setPosition((value) => Math.min(100, value + 5));
        }}
      >
        ↔
      </div>
    </div>
  );
}
