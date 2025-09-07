import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { AudioPlayerProvider } from '@/context/audio-player-context';
import { AudioPlayer } from '@/components/audio-player';
import type { Language } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Prayas News Terminal',
  description: 'Aggregating top current-affairs relevant to UPSC & general audiences.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language: Language = 'en'; // or 'hi', this could come from user settings
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AudioPlayerProvider>
            {children}
            <AudioPlayer language={language} />
            <Toaster />
          </AudioPlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
