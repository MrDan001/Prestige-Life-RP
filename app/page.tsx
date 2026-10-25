// PATH: app/page.tsx
import "./home.css";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Download from "@/components/Download";
import HowToJoin from "@/components/HowToJoin";
import Footer from "@/components/Footer";
import { getSite } from "@/lib/site";

export const revalidate = 60; // saving settings in the admin site refreshes this page straight away

export default async function Home() {
  const site = await getSite();
  return (
    <>
      <Header />
      <main>
        <Hero site={site} />
        <Features />
        <Download site={site} />
        <HowToJoin site={site} />
      </main>
      <Footer />
    </>
  );
}