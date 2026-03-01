import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/toast';
import { ConfirmDialogProvider } from '@/components/confirm-dialog';
import { ThemeScript } from '@/components/theme-toggle';
import '@anima-ai/ui/globals.css';

export const metadata: Metadata = {
  title: 'Anima AI',
  description: 'Bring your documents to life with AI-powered conversations',
  icons: {
    icon: '/anima-ai.png',
    shortcut: '/anima-ai.png',
    apple: '/anima-ai.png',
  },
  openGraph: {
    title: 'Anima AI',
    description: 'Bring your documents to life with AI-powered conversations',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <SessionProvider>
          <ToastProvider>
            <ConfirmDialogProvider>
              {children}
            </ConfirmDialogProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
