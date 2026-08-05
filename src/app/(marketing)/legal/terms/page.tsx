import {
  LegalDocument,
  LegalSection,
} from "@/components/legal/legal-document";

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Platform agreement"
      title="Terms and Conditions"
      introduction="These terms govern the use of Zerion X1, including its public website, strategies, simulations, intelligence tools, subscriptions and integrations."
    >
      <LegalSection title="1. Acceptance of terms" highlight>
        <p>
          By creating an account, buying a plan or using Zerion X1, the user
          accepts these Terms, the Privacy Policy and Risk Disclosure.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility">
        <p>
          Users must have legal capacity to enter a binding agreement and must
          satisfy applicable age, residency and provider requirements.
        </p>
      </LegalSection>

      <LegalSection title="3. Nature of the service">
        <p>
          Zerion X1 provides technology for research, monitoring, strategy
          construction, backtesting, paper trading, risk controls, reporting and
          user-authorized integrations. It does not guarantee profit.
        </p>
      </LegalSection>

      <LegalSection title="4. Account security">
        <ul>
          <li>Users must provide accurate registration information.</li>
          <li>Passwords, OTPs and API credentials must remain confidential.</li>
          <li>Unauthorized access must be reported promptly.</li>
          <li>Users remain responsible for activity performed through their account.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Strategies and execution">
        <p>
          Strategies may operate only within configured account, provider,
          authorization and risk boundaries. Zerion X1 may block execution when
          data is stale, consent is absent or safety limits are exceeded.
        </p>
      </LegalSection>

      <LegalSection title="6. Prohibited use">
        <ul>
          <li>Market manipulation or unlawful trading.</li>
          <li>Unauthorized access or credential theft.</li>
          <li>Bypassing subscription or risk controls.</li>
          <li>Presenting platform output as guaranteed investment advice.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Fees and subscriptions">
        <p>
          Subscription fees pay for software access and do not represent an
          investment, deposit, brokerage balance or guaranteed financial return.
        </p>
      </LegalSection>

      <LegalSection title="8. Availability and market data">
        <p>
          Data may be real-time, delayed, cached, simulated or temporarily
          unavailable depending on providers, licensing and user entitlements.
        </p>
      </LegalSection>

      <LegalSection title="9. Intellectual property">
        <p>
          Zerion X1 branding, interface, code, documentation and original
          content remain protected intellectual property.
        </p>
      </LegalSection>

      <LegalSection title="10. Suspension and termination">
        <p>
          Access may be restricted for security threats, unlawful conduct,
          payment failure, abuse, regulatory requirements or material breach.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Zerion X1 is not liable for
          trading losses, missed opportunities, inaccurate third-party data,
          rejected orders, provider outages or losses arising from user
          strategies and decisions.
        </p>
      </LegalSection>

      <LegalSection title="12. Governing law">
        <p>
          These terms are intended to operate under applicable Indian law,
          subject to mandatory statutory and jurisdictional requirements.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <div className="contact-information-card">
          <strong>Zerion X1 Support</strong>
          <a href="mailto:zerionx1@gmail.com">zerionx1@gmail.com</a>
        </div>
      </LegalSection>
    </LegalDocument>
  );
}
