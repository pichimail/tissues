import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { TwitterLogoIcon } from '@radix-ui/react-icons';
import PlausibleProvider from 'next-plausible';
import { ThemeProvider } from 'next-themes';
import { ThemeToggle } from '@/components/ui/theme-toggle';

let title = 'Tissues.Dev – Screenshot to code';
let description = 'Generate your next app with a screenshot and AI';
let url = 'https://www.tissues.dev/';
let ogimage = 'https://www.tissues.dev/og-image.png';
let sitename = 'tissues.dev';

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    images: [ogimage],
    title,
    description,
    url: url,
    siteName: sitename,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: [ogimage],
    title,
    description,
  },
};

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className='h-full' suppressHydrationWarning>
      <head>
        <PlausibleProvider domain='tissues.dev' />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full flex flex-col font-sans`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className='sm:mx-10 mx-4 mt-5'>
            <div className='flex items-center justify-between'>
              <Link href='/' className='flex items-center gap-2 font-semibold text-xl tracking-tight'>
                Tissues.Dev
              </Link>
              <ThemeToggle />
            </div>
          </header>

          <main className='grow flex flex-col'>{children}</main>

          <footer className='flex flex-col sm:flex-row items-center justify-between sm:px-10 px-4 pt-20 pb-6 gap-4 sm:gap-0 sm:py-3 text-muted-foreground text-sm'>
            <p>
              Powered by <span className='font-bold text-foreground'>MOS LLM</span>
            </p>
            <div className='flex gap-4'>
              <Button asChild variant='ghost' className='gap-2'>
                <Link href='https://x.com/dambu07' target='_blank'>
                  <TwitterLogoIcon className='size-4' />
                  X
                </Link>
              </Button>
            </div>
          </footer>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
