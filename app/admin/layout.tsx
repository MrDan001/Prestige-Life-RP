import type { Viewport } from "next";
import AdminShell from "./admin-shell";

export const viewport: Viewport = {
  // Set desktop layout width in the initial HTML response. Omitting initialScale
  // lets mobile browsers scale the full 1200px workspace to fit the phone.
  width: 1200,
  viewportFit: "cover",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
