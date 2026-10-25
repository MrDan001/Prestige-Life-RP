// PATH: components/Download.tsx
import type { Site } from "@/lib/site";

function Store({ href, label, sub }: { href: string | null; label: string; sub: string }) {
  return href ? (
    <a href={href} className="store-btn" target="_blank" rel="noopener noreferrer">
      <small>{sub}</small>
      <strong>{label}</strong>
    </a>
  ) : (
    <span className="store-btn disabled" aria-disabled="true">
      <small>Coming soon</small>
      <strong>{label}</strong>
    </span>
  );
}

export default function Download({ site }: { site: Site }) {
  return (
    <section id="download" className="section">
      <h2>Download the app</h2>
      <div className="download-grid">
        <Store href={site.playStoreUrl} label="Google Play" sub="Get it on" />
        <Store href={site.appStoreUrl} label="App Store" sub="Download on the" />
        <Store
          href={site.apkUrl}
          label="Download APK"
          sub={`Android direct download${site.apkVersion ? ` · v${site.apkVersion}` : ""}`}
        />
      </div>
      <p className="note">
        Installing the APK? When Android asks, allow installs from your browser, then open the downloaded file.
        Only download the game from this page.
      </p>
    </section>
  );
}