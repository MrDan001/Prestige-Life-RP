import "./home.css";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import About from "@/components/About";
import CityLife from "@/components/CityLife";
import Download from "@/components/Download";
import HowToJoin from "@/components/HowToJoin";
import Footer from "@/components/Footer";
import { getSite } from "@/lib/site";

export const revalidate = 60;

export default async function Home() {
  const site = await getSite();
  return <>
    <Header />
    <main>
      <Hero site={site} />
      <Features />
      <About />
      <CityLife />
      <Download site={site} />
      <HowToJoin site={site} />
    </main>
    <Footer />
  </>;
}