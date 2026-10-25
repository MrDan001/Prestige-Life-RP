// PATH: lib/site.ts
import { db } from "@/lib/db";

export type Site = {
  launchStatus: "COMING_SOON" | "LIVE" | "MAINTENANCE";
  playStoreUrl: string | null;
  appStoreUrl: string | null;
  apkUrl: string | null;
  apkVersion: string | null;
  discordUrl: string | null;
  statSlots: number | null;
  statUptime: number | null;
  statCitizens: number | null;
};

export const DEFAULT_SITE: Site = {
  launchStatus: "COMING_SOON",
  playStoreUrl: null, appStoreUrl: null, apkUrl: null, apkVersion: null, discordUrl: null,
  statSlots: null, statUptime: null, statCitizens: null,
};

const safe = (u: string | null) => (u && u.startsWith("https://") ? u : null);

/** Home page settings. If the database is unreachable the page still loads, with defaults. */
export async function getSite(): Promise<Site> {
  try {
    const r = await db.siteSetting.findUnique({ where: { id: "main" } });
    if (!r) return DEFAULT_SITE;
    const status = r.launchStatus === "LIVE" || r.launchStatus === "MAINTENANCE" ? r.launchStatus : "COMING_SOON";
    return {
      launchStatus: status,
      playStoreUrl: safe(r.playStoreUrl), appStoreUrl: safe(r.appStoreUrl), apkUrl: safe(r.apkUrl),
      apkVersion: r.apkVersion, discordUrl: safe(r.discordUrl),
      statSlots: r.statSlots, statUptime: r.statUptime, statCitizens: r.statCitizens,
    };
  } catch {
    return DEFAULT_SITE;
  }
}