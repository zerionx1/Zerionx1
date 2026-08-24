import './referral-final.css';
import { ReferralCapture } from "@/components/referrals/referral-capture";
import type { Metadata } from 'next';
import './globals.css';
import './zerion-final-four.css';
import './zerion-strict-four.css';
import './zerion-four-color-lock.css';
import './phase4-chart-flow.css';
import { AppProviders } from '@/components/providers/app-providers';
import { GlobalProviders } from '@/components/system/GlobalProviders';
import { AuthSessionBridge } from '@/components/auth/auth-session-bridge';

export const metadata: Metadata = {
  title: { default: 'Zerion X1', template: '%s · Zerion X1' },
  description: 'Multi-market trading intelligence, strategy research and risk operating system.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <AuthSessionBridge />
          <ReferralCapture />
          <GlobalProviders>{children}</GlobalProviders>
        </AppProviders>
      </body>
    </html>
  );
}
