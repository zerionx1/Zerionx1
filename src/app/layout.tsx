import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/app-providers';
import { GlobalProviders } from '@/components/system/GlobalProviders';

export const metadata: Metadata = {
  title: { default: 'Zerion X1', template: '%s · Zerion X1' },
  description: 'Multi-market trading intelligence, strategy research and risk operating system.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <GlobalProviders>{children}</GlobalProviders>
        </AppProviders>
      </body>
    </html>
  );
}
