import { Metadata } from 'next';
import { APP_NAME, SOCIAL_HANDLES } from '@meble/constants';
import Footer from '@/components/ui/Footer';
import Navbar from '@/components/ui/Navbar';
import { Toaster } from '@/components/ui/Toasts/toaster';
import { PropsWithChildren, Suspense } from 'react';
import { getURL } from '@/utils/helpers';
import 'styles/main.css';

const title = `${APP_NAME} - Płatności i Subskrypcje`;
const description = `Zarządzaj swoim kontem ${APP_NAME}, subskrypcjami i kredytami eksportowymi. Bezpieczne płatności online.`;
const SITE_URL = getURL();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: `%s | ${APP_NAME}`,
  },
  description: description,
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    url: SITE_URL,
    siteName: APP_NAME,
    title: title,
    description: description,
  },
  twitter: {
    card: 'summary_large_image',
    site: SOCIAL_HANDLES.twitter,
    creator: SOCIAL_HANDLES.twitter,
    title: title,
    description: description,
  },
  icons: {
    icon: '/favico.svg',
    apple: '/favico.svg',
  },
};

export default async function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body className="bg-black">
        <Navbar />
        <main
          id="skip"
          className="min-h-[calc(100dvh-4rem)] md:min-h[calc(100dvh-5rem)]"
        >
          {children}
        </main>
        <Footer />
        <Suspense>
          <Toaster />
        </Suspense>
      </body>
    </html>
  );
}
