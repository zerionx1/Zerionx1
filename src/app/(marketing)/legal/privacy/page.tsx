import {
  LegalDocument,
  LegalSection,
} from "@/components/legal/legal-document";

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Data and privacy"
      title="Privacy Policy"
      introduction="This policy explains how Zerion X1 may collect, use, protect and retain information when users access the website, create an account or connect supported services."
    >
      <LegalSection title="1. Information collected" highlight>
        <ul>
          <li>Account and profile information.</li>
          <li>Authentication, session and security records.</li>
          <li>Subscription and payment references.</li>
          <li>Strategies, watchlists and preferences.</li>
          <li>Device, browser and diagnostic information.</li>
          <li>Authorized broker or provider metadata.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Sensitive credentials">
        <p>
          Broker tokens and API credentials should be encrypted and used only
          for the authorized integration. Zerion X1 will not request passwords
          or OTPs through ordinary support email.
        </p>
      </LegalSection>

      <LegalSection title="3. How information is used">
        <ul>
          <li>To authenticate users and secure accounts.</li>
          <li>To operate strategies, simulations and risk controls.</li>
          <li>To provide customer support.</li>
          <li>To detect abuse, fraud and security incidents.</li>
          <li>To improve reliability and performance.</li>
          <li>To comply with lawful obligations.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Data sharing">
        <p>
          Information may be shared with authorized infrastructure,
          authentication, payment, broker, market-data or security providers
          only where required to provide the requested service.
        </p>
        <p>Zerion X1 does not sell personal information as a product.</p>
      </LegalSection>

      <LegalSection title="5. Trading information">
        <p>
          Strategies, orders, portfolio events and audit records may be
          processed to provide functionality, enforce risk limits and investigate
          incidents.
        </p>
      </LegalSection>

      <LegalSection title="6. Retention">
        <p>
          Information may be retained as required to operate accounts, preserve
          audit integrity, resolve disputes and satisfy legal obligations.
        </p>
      </LegalSection>

      <LegalSection title="7. Security">
        <p>
          Zerion X1 is designed to use access controls, encryption, credential
          separation, monitoring and audit records. No online system can
          guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="8. User choices">
        <p>
          Subject to applicable law, users may request access, correction or
          deletion of eligible personal data and may revoke optional
          integrations.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies and browser storage">
        <p>
          Essential cookies and browser storage may be used for authentication,
          security, preferences and application continuity.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <div className="contact-information-card">
          <strong>Zerion X1 Privacy and Support</strong>
          <a href="mailto:zerionx1@gmail.com">zerionx1@gmail.com</a>
        </div>
      </LegalSection>
    </LegalDocument>
  );
}
