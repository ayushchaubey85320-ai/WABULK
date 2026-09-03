import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'WABulk - Simple. Powerful. Official WhatsApp Messaging.',
  description: 'Production-ready WhatsApp Bulk Messaging platform powered by Meta WhatsApp Cloud API.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background selection:bg-emerald-500 selection:text-white">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
