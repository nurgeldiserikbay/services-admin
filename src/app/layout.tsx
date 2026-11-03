import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Services — Admin',
  description: 'Restricted internal platform administration',
  robots: {index: false, follow: false, noarchive: true},
};

export default function RootLayout({children}:{children:ReactNode}) {
  return <html lang="kk"><body>{children}</body></html>;
}
