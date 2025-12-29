import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { APP_NAME, APP_URLS, SOCIAL_HANDLES } from "@meble/constants";
import { TooltipProvider } from "@meble/ui";
import { AnalyticsProvider } from "@meble/analytics";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { GlobalKeyboardListener } from "@/components/GlobalKeyboardListener";
import "../styles/globals.css";

const SITE_URL = APP_URLS.app;
const OG_DESCRIPTION_PL =
  "Darmowy konfigurator mebli 3D online. Projektuj szafy, regały i meble kuchenne na wymiar. Eksportuj listy cięć do CSV.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} - Konfigurator Mebli 3D`,
    template: `%s | ${APP_NAME}`,
  },
  description: OG_DESCRIPTION_PL,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "pl_PL",
    alternateLocale: "en_US",
    url: SITE_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} - Konfigurator Mebli 3D`,
    description: OG_DESCRIPTION_PL,
  },
  twitter: {
    card: "summary_large_image",
    site: SOCIAL_HANDLES.twitter,
    creator: SOCIAL_HANDLES.twitter,
    title: `${APP_NAME} - Konfigurator Mebli 3D`,
    description: OG_DESCRIPTION_PL,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AnalyticsProvider>
            <NextIntlClientProvider messages={messages}>
              <AuthProvider>
                <TooltipProvider>
                  <GlobalKeyboardListener />
                  {children}
                </TooltipProvider>
              </AuthProvider>
            </NextIntlClientProvider>
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
