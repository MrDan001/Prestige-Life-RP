// PATH: app/admin/layout.tsx
"use client";
import "./admin.css";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Me = {
  name: string; kind: string; level: number; gameId: string | null;
  canManageStaff: boolean; canManageCategories: boolean; canManageTemplates: boolean; canManageSite: boolean; canManageRules: boolean; hasPasskey: boolean;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/me");
    if (!r.ok) { window.location.href = "/auth"; return; }
    const current: Me = await r.json();
    setMe(current);
    if (!current.hasPasskey && path !== "/admin/profile") { window.location.href = "/admin/profile?setupPasskey=1"; }
  }, [path]);
  useEffect(() => {
    load();
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible") fetch("/api/admin/me", { cache: "no-store" }).catch(() => {});
    }, 60_000);
    return () => window.clearInterval(heartbeat);
  }, [load]);

  // Request a desktop-width layout only while inside the admin workspace.
  // Restore the site's normal responsive viewport when the visitor leaves admin.
  useEffect(() => {
    const existingViewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const viewport = existingViewport ?? document.createElement("meta");
    const previous = existingViewport?.content ?? null;
    if (!existingViewport) {
      viewport.name = "viewport";
      document.head.appendChild(viewport);
    }
    viewport.content = "width=1200, initial-scale=1, viewport-fit=cover";
    return () => {
      if (existingViewport) viewport.content = previous ?? "width=device-width, initial-scale=1";
      else viewport.remove();
    };
  }, []);

  const items = [
    { href: "/admin", label: "Complaints", show: true },
    { href: "/admin/staff", label: "Staff", show: !!me?.canManageStaff },
    { href: "/admin/roles", label: "Roles", show: me?.kind === "OWNER" },
    { href: "/admin/categories", label: "Categories", show: !!me?.canManageCategories },
    { href: "/admin/templates", label: "Judgments", show: !!me?.canManageTemplates },
    { href: "/admin/settings", label: "Home page", show: !!me?.canManageSite || !!me?.canManageRules },
    { href: "/admin/audit", label: "Audit log", show: !!me?.canManageStaff },
    { href: "/admin/profile", label: "Profile", show: true },
  ];
  const rank = me ? (me.kind === "ADMIN" ? `Level ${me.level} admin` : me.kind.charAt(0) + me.kind.slice(1).toLowerCase() + " · full rights") : "";

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">PRESTIGE <b>LIFE</b><small>Complaints desk</small></div>
        <nav className="nav" aria-label="Admin">
          {items.filter(i => i.show).map(i => (
            <a key={i.href} href={i.href} className={path === i.href ? "on" : ""} aria-current={path === i.href ? "page" : undefined}>{i.label}</a>
          ))}
        </nav>
        {me && (
          <div className="me">
            <div className="me-top">
              <div className="avatar">{me.name.charAt(0).toUpperCase()}</div>
              <div className="me-id"><strong>{me.name}</strong><small>{rank}</small></div>
            </div>
          </div>
        )}
      </aside>
      <div className="content">{children}</div>
    </div>
  );
}