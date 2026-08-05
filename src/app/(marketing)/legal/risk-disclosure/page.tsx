import {
  LegalDocument,
  LegalSection,
} from "@/components/legal/legal-document";

export default function RiskDisclosurePage() {
  return (
    <LegalDocument
      eyebrow="Risk and regulatory disclosure"
      title="Risk Disclosure"
      introduction="Please read this disclosure before accessing market intelligence, strategies, simulations, probabilities, broker integrations or execution-related functionality on Zerion X1."
    >
      <LegalSection title="1. Zerion X1 is a technology platform" highlight>
        <p>
          Zerion X1 provides software infrastructure for market-data
          visualization, strategy creation, historical testing, paper trading,
          risk controls, monitoring, journaling and user-authorized execution
          workflows.
        </p>
        <p>
          Zerion X1 is not presented as a stock broker, portfolio manager,
          investment adviser, research analyst, exchange, depository,
          custodian, bank or guaranteed-return service.
        </p>
      </LegalSection>

      <LegalSection title="2. SEBI registration status">
        <p>
          Zerion X1 is not currently registered with the Securities and
          Exchange Board of India as an Investment Adviser or Research Analyst.
          Zerion X1 therefore does not claim to provide personalized investment
          advice, assured returns or guaranteed trading recommendations.
        </p>
      </LegalSection>

      <LegalSection title="3. No guaranteed returns">
        <p>
          Zerion X1 never promises profits, capital protection, minimum returns,
          fixed accuracy, successful trades or recovery of previous losses.
          Probability, confidence and opportunity scores are uncertain
          analytical estimates only.
        </p>
      </LegalSection>

      <LegalSection title="4. Trading and investing involve substantial risk">
        <ul>
          <li>Users may lose part or all of the capital committed.</li>
          <li>Market prices may move suddenly and without warning.</li>
          <li>Leverage and derivatives may magnify losses.</li>
          <li>Slippage, gaps, latency and rejected orders can alter outcomes.</li>
          <li>Past performance and backtests do not predict future results.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. User strategies and decisions">
        <p>
          Every strategy is selected, created, changed, activated or approved
          by the user. Results depend on the user&apos;s own rules, risk limits,
          market selection, timing, provider, broker execution and prevailing
          market conditions.
        </p>
      </LegalSection>

      <LegalSection title="6. AI and probability-based functionality">
        <p>
          AI-assisted analysis may be incomplete, delayed or inaccurate. An
          AI-generated opportunity requires explicit user approval unless the
          user has configured a valid, bounded and revocable authorization
          policy.
        </p>
      </LegalSection>

      <LegalSection title="7. Market data">
        <p>
          Development environments may contain simulated, delayed, cached or
          sample values. Real-time data must only be labelled as real-time after
          a verified provider is connected and monitored.
        </p>
      </LegalSection>

      <LegalSection title="8. Paper trading and backtesting">
        <p>
          Paper trading is a simulation and may not reproduce real liquidity,
          spreads, partial fills, taxes, fees, outages or market impact.
          Backtests may contain overfitting, look-ahead bias, survivorship bias
          and unrealistic assumptions.
        </p>
      </LegalSection>

      <LegalSection title="9. Third-party services">
        <p>
          Brokers, exchanges, market-data providers, payment services and other
          integrations operate under their own terms. Zerion X1 cannot guarantee
          their availability, accuracy, security or performance.
        </p>
      </LegalSection>

      <LegalSection title="10. Responsibility for loss">
        <p>
          To the maximum extent permitted by applicable law, each user remains
          responsible for their strategies, permissions, financial decisions,
          orders, tax obligations and losses.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <div className="contact-information-card">
          <strong>Zerion X1 Support</strong>
          <a href="mailto:zerionx1@gmail.com">zerionx1@gmail.com</a>
        </div>
      </LegalSection>
    </LegalDocument>
  );
}
