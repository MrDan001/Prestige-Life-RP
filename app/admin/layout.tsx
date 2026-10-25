// PATH: app/admin/layout.tsx
"use client";
import "./admin.css";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Me = {
  name: string; kind: string; level: number; gameId: string | null;
  canManageStaff: boolean; canManageCategories: boolean; canManageTemplates: boolean; canManageSite: boolean;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/me");
    if (!r.ok) { window.location.href = "/auth"; return; }
    setMe(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/auth";
  }

  const items = [
    { href: "/admin", label: "Complaints", show: true },
    { href: "/admin/staff", label: "Staff", show: !!me?.canManageStaff },
    { href: "/admin/roles", label: "Roles", show: me?.kind === "OWNER" },
    { href: "/admin/categories", label: "Categories", show: !!me?.canManageCategories },
    { href: "/admin/templates", label: "Judgments", show: !!me?.canManageTemplates },
    { href: "/admin/settings", label: "Home page", show: !!me?.canManageSite },
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
            <button type="button" className="me-signout" onClick={logout}>Sign out</button>
          </div>
        )}
      </aside>
      <div className="content">{children}</div>
    </div>
  );
}