"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
};

const nav: NavItem[] = [
  { label: "Platform", href: "/#platform" },
  { label: "Markets", href: "/#markets" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="marketing-header">
      <div className="marketing-header__inner">
        <Link href="/" className="brand-mark">
          <span className="brand-mark__name">ZERION X1</span>
          <span className="brand-mark__tagline">
            Intelligence Operating System
          </span>
        </Link>

        <nav className="marketing-nav" aria-label="Main navigation">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="marketing-header__actions">
          <Link className="zx-secondary-action" href="/login">
            Login
          </Link>

          <Link className="zx-primary-action" href="/signup">
            Create account
          </Link>
        </div>

        <button
          type="button"
          className="zx-mobile-menu-button"
          aria-label="Toggle main menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open ? (
        <div className="zx-mobile-menu">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          <Link href="/login" onClick={() => setOpen(false)}>
            Login
          </Link>

          <Link href="/signup" onClick={() => setOpen(false)}>
            Create account
          </Link>
        </div>
      ) : null}
    </header>
  );
}
