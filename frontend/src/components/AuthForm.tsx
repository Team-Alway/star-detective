"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { login, signup } from "@/lib/auth";

const VISUAL = {
  signup: { src: "/space/carina.jpg", alt: "The Cosmic Cliffs of the Carina Nebula, seen by the Webb telescope" },
  login: { src: "/space/horizon.jpg", alt: "Sunrise above Earth's horizon, seen from the International Space Station" },
};

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isSignup = mode === "signup";
  const visual = VISUAL[mode];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(root.current, { y: 36, opacity: 0, duration: 0.7, ease: "power3.out" });
        gsap.from("[data-visual-img]", { scale: 1.08, duration: 1.4, ease: "power2.out" });
        gsap.from("[data-field]", { y: 14, opacity: 0, stagger: 0.07, delay: 0.25, duration: 0.45, ease: "power2.out" });
      });
    },
    { scope: root },
  );

  function shake() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(root.current, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1,0.3)" });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const name = String(f.get("display_name") ?? "").trim();
    let problem = "";
    if (!/^\S+@\S+\.\S+$/.test(email)) problem = "Enter a valid email address.";
    else if (password.length < 8) problem = "Password must be at least 8 characters.";
    else if (isSignup && name.length < 2) problem = "Display name must be at least 2 characters.";
    if (problem) {
      setError(problem);
      shake();
      return;
    }
    setError("");
    setBusy(true);
    try {
      if (isSignup) await signup(email, password, name);
      else await login(email, password);
      router.push("/academy");
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(
        status === undefined
          ? "Could not reach the server. You can keep playing without an account."
          : (err as Error).message || "Something went wrong. Please try again.",
      );
      shake();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={root} className="au-card">
      <div className="au-visual">
        <Image
          data-visual-img
          className="au-visual-img"
          src={visual.src}
          alt={visual.alt}
          fill
          sizes="(max-width: 759px) 100vw, 520px"
          loading="eager"
          fetchPriority="high"
        />
        <p className="au-brand">
          <span className="au-brand-mark" aria-hidden>
            ✦
          </span>
          Star Detective
        </p>
        <p className="au-quote">Every great discovery started with someone looking twice.</p>
      </div>

      <form className="au-form" onSubmit={submit} noValidate>
        <Link className="au-back" href="/" aria-label="Back to home">
          <span aria-hidden>←</span>
        </Link>
        <h1 className="au-title">{isSignup ? "Create an account" : "Welcome back, detective"}</h1>
        <p className="au-switch">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link className="au-link" href={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>

        <div className="au-fields">
          {isSignup && (
            <div data-field className="au-field">
              <label className="au-label" htmlFor="au-display-name">
                Display name
              </label>
              <input id="au-display-name" name="display_name" autoComplete="nickname" className="au-input" />
            </div>
          )}
          <div data-field className="au-field">
            <label className="au-label" htmlFor="au-email">
              Email
            </label>
            <input id="au-email" name="email" type="email" autoComplete="email" className="au-input" />
          </div>
          <div data-field className="au-field">
            <label className="au-label" htmlFor="au-password">
              Password
            </label>
            <div className="au-input-wrap">
              <input
                id="au-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="au-input au-input-pw"
              />
              <button
                type="button"
                className="au-toggle"
                aria-pressed={showPassword}
                aria-controls="au-password"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
                <span className="sr-only"> password</span>
              </button>
            </div>
          </div>
        </div>

        <p role="alert" className="au-error">
          {error}
        </p>
        <button data-field type="submit" disabled={busy} className="au-submit">
          {busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}
        </button>
        <p className="au-skip">
          <Link href="/play">Or keep playing without an account →</Link>
        </p>
      </form>
    </div>
  );
}
