// PATH: app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prestige Life RP — Live the Life",
  description:
    "Prestige Life RP is a serious, immersive roleplay game built for mobile. Jobs, gangs, businesses and a living city in your pocket.",
  openGraph: {
    title: "Prestige Life RP",
    description: "Join Prestige Life RP, the most immersive roleplay city. Your story starts tonight.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
