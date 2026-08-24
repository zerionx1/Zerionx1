import { CinematicBackground } from "@/components/marketing/cinematic-background";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";
import { ZerionProMaxHome } from "@/components/marketing/zerion-pro-max-home";

export default function HomePage() {
  return (
    <div className="marketing-page zx-home-page">
      <CinematicBackground />
      <MarketingHeader />
      <main>
        <ZerionProMaxHome />
      </main>
      <MarketingFooter />
    </div>
  );
}
