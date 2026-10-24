// PATH: app/page.tsx
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowToJoin from "@/components/HowToJoin";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <HowToJoin />
      </main>
      <Footer />
    </>
  );
}
