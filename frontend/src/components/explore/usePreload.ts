"use client";

import { useEffect, useState } from "react";

type Status = "ok" | "err";

/**
 * Preload a set of image URLs so the flip-book swaps frames instantly.
 * State is keyed by the URL list, so a new list starts from zero without a
 * synchronous reset inside the effect.
 */
export function usePreload(urls: string[]) {
  const key = urls.join("\n");
  const [state, setState] = useState<{ key: string; done: Record<string, Status> }>({ key: "", done: {} });

  useEffect(() => {
    const list = key ? key.split("\n") : [];
    let cancelled = false;
    const images = list.map((url) => {
      const image = new Image();
      image.decoding = "async";
      const finish = (status: Status) => {
        if (cancelled) return;
        setState((prev) => ({ key, done: { ...(prev.key === key ? prev.done : {}), [url]: status } }));
      };
      image.onload = () => {
        // decode() avoids a flash the first time the frame is shown.
        image.decode?.().catch(() => {}).finally(() => finish("ok"));
      };
      image.onerror = () => finish("err");
      image.src = url;
      return image;
    });
    return () => {
      cancelled = true;
      for (const image of images) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [key]);

  const done = state.key === key ? state.done : {};
  const loaded = urls.filter((url) => done[url] === "ok").length;
  const failed = urls.filter((url) => done[url] === "err").length;
  return {
    total: urls.length,
    loaded,
    failed,
    ready: urls.length > 0 && loaded + failed === urls.length,
    status: (url: string): Status | "loading" => done[url] ?? "loading",
  };
}
