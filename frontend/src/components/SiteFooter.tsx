import Image from "next/image";
import Link from "next/link";

const LINKS = [
  { title: "Quick links", items: [["Academy", "/academy"], ["Training", "/play"], ["Explore", "/viewer"], ["Leaderboard", "/leaderboard"]] },
  { title: "Project", items: [["About the data", "/about"], ["Log in", "/login"], ["Sign up", "/signup"]] },
] as const;

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <p className="eyebrow">Enrol</p>
            <h2 className="footer-title">Join the next generation of star detectives</h2>
            <p className="footer-sub">Learn the method. Then look at the real sky.</p>
          </div>
          <div className="footer-actions">
            <Link href="/academy" className="footer-btn footer-btn-solid">Start the academy ↗</Link>
            <Link href="/play" className="footer-btn">Skip to training ↗</Link>
          </div>
        </div>
        <div className="footer-cols">
          <p className="footer-copy">
            © 2026 Star Detective. Built for the NASA Space Apps Challenge. Not affiliated with or endorsed by NASA.
          </p>
          {LINKS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3>{col.title}</h3>
              <ul>
                {col.items.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="footer-scene">
        <Image src="/space/horizon.jpg" alt="Sunrise over Earth's horizon, photographed from the International Space Station" fill sizes="100vw" />
        <span className="footer-credit">NASA/JSC · Real photo</span>
      </div>
    </footer>
  );
}
