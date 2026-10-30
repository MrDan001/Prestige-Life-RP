import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import PasskeySignIn from "./PasskeySignIn";
import "../admin/admin.css";

export default async function LoginPage() {
  const session = await requireAdmin();
  if (!session.error) redirect("/admin");
  return <PasskeySignIn />;
}
