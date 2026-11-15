"use client";

import { useState } from "react";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / insecure origins: fall back to a hidden textarea.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/** Copy a link to this exact view, or an iframe snippet for other sites. */
export default function ShareButtons() {
  const [message, setMessage] = useState("");

  function link(embed: boolean) {
    const url = new URL(window.location.href);
    url.pathname = "/viewer";
    if (embed) url.searchParams.set("embed", "1");
    else url.searchParams.delete("embed");
    return url.toString();
  }

  async function share(kind: "link" | "embed") {
    const text =
      kind === "link"
        ? link(false)
        : `<iframe src="${link(true)}" width="560" height="760" style="border:0;max-width:100%" title="SPHEREx sky explorer · Star Detective" loading="lazy" allow="clipboard-write"></iframe>`;
    const ok = await copy(text);
    setMessage(ok ? (kind === "link" ? "Link copied." : "Embed code copied.") : "Copy failed. Copy it from the address bar instead.");
    window.setTimeout(() => setMessage(""), 2500);
  }

  return (
    <div className="ex-share">
      <button type="button" className="btn btn-secondary" onClick={() => share("link")}>
        Copy link
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => share("embed")}>
        Copy embed code
      </button>
      <span className="ex-muted" role="status" aria-live="polite">
        {message}
      </span>
    </div>
  );
}
