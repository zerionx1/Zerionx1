import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";
import { CinematicBackground } from "@/components/marketing/cinematic-background";

const items = [
  ["Is Zerion X1 a broker?", "No. Zerion X1 is a technology and intelligence platform. Live orders require a separately verified broker or exchange account."],
  ["Is Zerion X1 investment advice?", "No. Zerion X1 provides decision-support, research, simulation and risk tools. It does not guarantee outcomes."],
  ["Can AI trade without my permission?", "Not by default. AI-assisted opportunities require explicit confirmation unless a valid bounded authorization rule has been created by the user."],
  ["Is displayed market data currently live?", "No. The development workspace currently uses demo or delayed sample data."],
  ["Does Zerion X1 support paper trading?", "Yes. Paper trading is a core workflow and does not use real money."],
  ["Which markets are supported?", "The architecture prioritizes Indian markets, crypto and Forex. Actual availability depends on providers, licensing, plan entitlements and regulations."],
  ["Do I need KYC?", "Viewing public educational information may not require KYC. Live trading requires the KYC and account requirements of the connected broker or exchange."],
  ["Can Zerion guarantee a high-probability trade?", "No. A probability estimate is not certainty and cannot eliminate financial risk."],
];

export default function FAQPage() {
  return (
    <div className="marketing-page">
      <CinematicBackground />
      <MarketingHeader />

      <main className="content-page">
        <div className="marketing-container content-page__inner">
          <p className="eyebrow">Frequently asked questions</p>
          <h1>Clear answers before financial decisions.</h1>

          <div className="faq-grid faq-grid--page">
            {items.map(([question, answer]) => (
              <article className="faq-card" key={question}>
                <h2>{question}</h2>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
