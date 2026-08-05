import { CinematicBackground } from "@/components/marketing/cinematic-background";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { MarketingSections } from "@/components/marketing/marketing-sections";

export default function HomePage() {
  return (
    <div className="marketing-page">
      <CinematicBackground />
      <MarketingHeader />
      <main>
        <Hero />
        <MarketingSections />
      </main>
      <MarketingFooter />
    </div>
  );
}
