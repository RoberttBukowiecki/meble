import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Manrope, Source_Sans_3 } from "next/font/google";

import { APP_NAME } from "@meble/constants";
import { Locale, defaultLocale, locales } from "@meble/i18n";

import { ThemeProvider } from "@/components/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/lib/constants";

import "./globals.css";

const manrope = Manrope({ subsets: ["latin"] });
const sourceSans = Source_Sans_3({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Modeluj meble na wymiar w przeglądarce i eksportuj CSV gotowe do produkcji.",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value as Locale | undefined;
  const locale: Locale = localeCookie && locales.includes(localeCookie) ? localeCookie : defaultLocale;

  const themeScript = `
    (function() {
      try {
        var storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
        var stored = localStorage.getItem(storageKey);
        var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        var theme = (stored === 'light' || stored === 'dark') ? stored : system;
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      } catch (e) {}
    })();
  `;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${manrope.className} ${sourceSans.className} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
