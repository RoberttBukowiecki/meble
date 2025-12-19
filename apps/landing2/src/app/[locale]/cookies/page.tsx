import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { APP_NAME, COMPANY_INFO } from "@meble/constants";
import { LegalLayout } from "@/components/LegalLayout";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Polityka Cookies - ${APP_NAME}`,
    description: `Polityka cookies serwisu ${APP_NAME}. Informacje o plikach cookies i sposobach zarządzania nimi.`,
  };
}

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LegalLayout title="Polityka Cookies" lastUpdated="Grudzień 2024">
      {/* Section 1 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          1. Czym są pliki cookies?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Pliki cookies (ciasteczka) to małe pliki tekstowe, które są zapisywane na Twoim urządzeniu
          (komputerze, tablecie, smartfonie) podczas odwiedzania stron internetowych. Służą one do
          zapamiętywania Twoich preferencji i zapewnienia prawidłowego działania serwisu.
        </p>
      </section>

      {/* Section 2 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          2. Jakich cookies używamy?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          W serwisie {APP_NAME} używamy następujących rodzajów plików cookies:
        </p>

        <div className="space-y-4">
          {/* Essential cookies */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Niezbędne (wymagane)
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
              Te cookies są konieczne do prawidłowego działania strony. Nie można ich wyłączyć.
            </p>
            <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">cookie-consent</code> - zapamiętanie Twojej zgody na cookies</li>
              <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">theme</code> - preferencja jasnego/ciemnego motywu</li>
              <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">locale</code> - wybrany język strony</li>
            </ul>
          </div>

          {/* Analytics cookies */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Analityczne (opcjonalne)
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
              Pomagają nam zrozumieć, jak użytkownicy korzystają z serwisu. Dane są anonimowe.
            </p>
            <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">_ga, _ga_*</code> - Google Analytics (statystyki odwiedzin)</li>
            </ul>
          </div>

          {/* Functional cookies */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              Funkcjonalne (opcjonalne)
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
              Umożliwiają zapamiętanie Twoich ustawień i preferencji.
            </p>
            <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">recently-viewed</code> - ostatnio przeglądane elementy</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          3. Cookies podmiotów trzecich
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Niektóre cookies mogą być ustawiane przez zewnętrzne usługi, z których korzystamy:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Dostawca</th>
                <th className="px-4 py-3">Cel</th>
                <th className="px-4 py-3 rounded-tr-lg">Polityka prywatności</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 dark:text-gray-300">
              <tr className="border-b dark:border-gray-700">
                <td className="px-4 py-3 font-medium">Google Analytics</td>
                <td className="px-4 py-3">Analiza ruchu</td>
                <td className="px-4 py-3">
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Link
                  </a>
                </td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="px-4 py-3 font-medium">PayU</td>
                <td className="px-4 py-3">Płatności</td>
                <td className="px-4 py-3">
                  <a
                    href="https://poland.payu.com/privacy-portal/privacy-principles/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Link
                  </a>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Vercel</td>
                <td className="px-4 py-3">Hosting i analityka</td>
                <td className="px-4 py-3">
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Link
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          4. Jak zarządzać cookies?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Masz pełną kontrolę nad plikami cookies. Możesz je zarządzać na kilka sposobów:
        </p>

        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Baner zgody
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Przy pierwszej wizycie wyświetlamy baner, w którym możesz zaakceptować wszystkie cookies
              lub odrzucić opcjonalne. Twój wybór jest zapamiętywany.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Ustawienia przeglądarki
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
              Możesz zarządzać cookies w ustawieniach swojej przeglądarki:
            </p>
            <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <li>
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Google Chrome
                </a>
              </li>
              <li>
                <a href="https://support.mozilla.org/pl/kb/blokowanie-ciasteczek" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a href="https://support.apple.com/pl-pl/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Safari
                </a>
              </li>
              <li>
                <a href="https://support.microsoft.com/pl-pl/microsoft-edge/usuwanie-plik%C3%B3w-cookie-w-przegl%C4%85darce-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Uwaga:</strong> Wyłączenie niektórych cookies może wpłynąć na prawidłowe działanie serwisu.
          </p>
        </div>
      </section>

      {/* Section 5 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          5. Okres przechowywania
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Czas przechowywania cookies zależy od ich typu:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li><strong>Cookies sesyjne</strong> - usuwane po zamknięciu przeglądarki</li>
          <li><strong>Cookies trwałe</strong> - przechowywane przez określony czas (zazwyczaj od 30 dni do 2 lat)</li>
          <li><strong>Zgoda na cookies</strong> - 12 miesięcy</li>
        </ul>
      </section>

      {/* Section 6 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          6. Kontakt
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Jeśli masz pytania dotyczące naszej polityki cookies, skontaktuj się z nami:
        </p>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-gray-600 dark:text-gray-300">
          <p>
            <span className="font-medium">E-mail:</span>{" "}
            <a href={`mailto:${COMPANY_INFO.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {COMPANY_INFO.email}
            </a>
          </p>
        </div>
      </section>

      {/* Section 7 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          7. Powiązane dokumenty
        </h2>
        <ul className="space-y-2 text-gray-600 dark:text-gray-300">
          <li>
            <a href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Polityka Prywatności
            </a>{" "}
            - informacje o przetwarzaniu danych osobowych
          </li>
          <li>
            <a href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Regulamin
            </a>{" "}
            - zasady korzystania z serwisu
          </li>
        </ul>
      </section>
    </LegalLayout>
  );
}
