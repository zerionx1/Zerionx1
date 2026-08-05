import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="marketing-header">
      <div className="marketing-header__inner">
        <Link href="/" className="brand-mark">
          <span className="brand-mark__name">ZERION X1</span>
          <span className="brand-mark__tagline">Intelligence Operating System</span>
        </Link>

        <nav className="marketing-nav" aria-label="Main navigation">
          <Link href="/#platform">Platform</Link>
          <Link href="/#markets">Markets</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/security">Security</Link>
        </nav>

        <div className="marketing-header__actions">
          <Button asChild variant="secondary" size="sm">
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Link>
          </Button>

          <Button asChild size="sm">
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
