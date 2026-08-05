import Link from "next/link";

const footerGroups = [
  {
    title: "Platform",
    links: [
      ["Workspace", "/dashboard"],
      ["Markets", "/dashboard/markets"],
      ["Paper trading", "/dashboard/paper"],
      ["Strategies", "/dashboard/strategies"],
      ["Risk OS", "/dashboard/risk"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About Zerion X1", "/about"],
      ["Pricing", "/pricing"],
      ["Security", "/security"],
      ["FAQ", "/faq"],
      ["Contact", "/#contact"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy policy", "/legal/privacy"],
      ["Terms and conditions", "/legal/terms"],
      ["Risk disclosure", "/legal/risk-disclosure"],
    ],
  },
  {
    title: "Account",
    links: [
      ["Login", "/login"],
      ["Create account", "/signup"],
      ["Forgot password", "/forgot-password"],
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="marketing-footer" id="contact">
      <div className="marketing-container">
        <div className="marketing-footer__top">
          <div className="marketing-footer__brand">
            <Link href="/" className="brand-mark">
              <span className="brand-mark__name">ZERION X1</span>
              <span className="brand-mark__tagline">
                Intelligence Operating System
              </span>
            </Link>

            <p>
              A multi-market strategy, simulation, intelligence and risk
              workspace built around transparent data and user authorization.
            </p>

            <a href="mailto:support@zerionx1.com">
              support@zerionx1.com
            </a>
          </div>

          <div className="marketing-footer__links">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3>{group.title}</h3>
                {group.links.map(([label, href]) => (
                  <Link href={href} key={href}>
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="marketing-footer__bottom">
          <p>
            © {new Date().getFullYear()} Zerion X1. All rights reserved.
          </p>
          <p>
            Market intelligence is not investment advice or a profit guarantee.
          </p>
        </div>
      </div>
    </footer>
  );
}
