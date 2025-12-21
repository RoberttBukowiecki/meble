import { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { APP_NAME, COMPANY_INFO } from "@meble/constants";
import { LegalLayout } from "@/components/LegalLayout";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Polityka Prywatności - ${APP_NAME}`,
    description: `Polityka prywatności serwisu ${APP_NAME}. Informacje o przetwarzaniu danych osobowych zgodnie z RODO.`,
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LegalLayout title="Polityka Prywatności" lastUpdated="Grudzień 2024">
      {/* Section 1 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          1. Administrator Danych Osobowych
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Administratorem Twoich danych osobowych jest:
        </p>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <p className="font-semibold text-gray-900 dark:text-white">{COMPANY_INFO.legalName}</p>
          <p className="text-gray-600 dark:text-gray-300">{COMPANY_INFO.address.street}</p>
          <p className="text-gray-600 dark:text-gray-300">
            {COMPANY_INFO.address.zipCode} {COMPANY_INFO.address.city}
          </p>
          <div className="mt-3 space-y-1 text-gray-600 dark:text-gray-300">
            <p><span className="font-medium">NIP:</span> {COMPANY_INFO.nip}</p>
            <p><span className="font-medium">REGON:</span> {COMPANY_INFO.regon}</p>
            <p>
              <span className="font-medium">E-mail:</span>{" "}
              <a href={`mailto:${COMPANY_INFO.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                {COMPANY_INFO.email}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          2. Podstawa prawna przetwarzania danych
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Twoje dane osobowe są przetwarzane zgodnie z:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li><strong>Rozporządzeniem (UE) 2016/679</strong> (RODO) z dnia 27 kwietnia 2016 r.</li>
          <li><strong>Ustawą z dnia 10 maja 2018 r.</strong> o ochronie danych osobowych</li>
          <li><strong>Ustawą z dnia 18 lipca 2002 r.</strong> o świadczeniu usług drogą elektroniczną</li>
        </ul>
      </section>

      {/* Section 3 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          3. Cel zbierania danych
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Twoje dane osobowe zbieramy i przetwarzamy w następujących celach:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li><strong>Świadczenie usług</strong> - rejestracja konta, realizacja zamówień</li>
          <li><strong>Realizacja płatności</strong> - przetwarzanie transakcji za pośrednictwem PayU</li>
          <li><strong>Komunikacja</strong> - odpowiadanie na zapytania, obsługa reklamacji</li>
          <li><strong>Analizy i statystyki</strong> - doskonalenie usług</li>
          <li><strong>Obowiązki prawne</strong> - wypełnianie obowiązków podatkowych</li>
        </ul>
      </section>

      {/* Section 4 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          4. Zakres zbieranych danych
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li><strong>Dane identyfikacyjne:</strong> imię, nazwisko, nazwa użytkownika</li>
          <li><strong>Dane kontaktowe:</strong> adres e-mail</li>
          <li><strong>Dane techniczne:</strong> adres IP, informacje o przeglądarce</li>
          <li><strong>Dane o aktywności:</strong> historia korzystania z aplikacji</li>
          <li><strong>Dane transakcyjne:</strong> historia zakupów</li>
        </ul>
      </section>

      {/* Section 5 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          5. Ochrona danych
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Stosujemy odpowiednie środki techniczne i organizacyjne:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li><strong>Szyfrowanie SSL/TLS</strong> - wszystkie dane przesyłane są przez szyfrowane połączenie</li>
          <li><strong>Bezpieczne przechowywanie</strong> - dane na zabezpieczonych serwerach</li>
          <li><strong>Hashowanie haseł</strong> - hasła przechowywane w formie zaszyfrowanej</li>
          <li><strong>Ograniczony dostęp</strong> - dostęp tylko dla upoważnionych osób</li>
        </ul>
      </section>

      {/* Section 6 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          6. Twoje prawa
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Zgodnie z RODO przysługują Ci następujące prawa:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li><strong>Prawo dostępu</strong> - możesz uzyskać informacje o przetwarzanych danych</li>
          <li><strong>Prawo do sprostowania</strong> - możesz żądać poprawienia nieprawidłowych danych</li>
          <li><strong>Prawo do usunięcia</strong> - możesz żądać usunięcia swoich danych</li>
          <li><strong>Prawo do ograniczenia przetwarzania</strong></li>
          <li><strong>Prawo do przenoszenia danych</strong></li>
          <li><strong>Prawo do sprzeciwu</strong></li>
          <li><strong>Prawo do cofnięcia zgody</strong></li>
        </ul>
        <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-gray-600 dark:text-gray-300">
          <p>
            Aby skorzystać z powyższych praw, skontaktuj się z nami:{" "}
            <a href={`mailto:${COMPANY_INFO.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {COMPANY_INFO.email}
            </a>
          </p>
        </div>
      </section>

      {/* Section 7 - Third Parties */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          7. Udostępnianie danych podmiotom trzecim
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Twoje dane mogą być udostępniane:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li><strong>PayU S.A.</strong> - realizacja płatności</li>
          <li><strong>Vercel Inc., Supabase Inc.</strong> - hosting i przechowywanie danych</li>
          <li><strong>Google Analytics</strong> - analiza ruchu (dane zanonimizowane)</li>
        </ul>
      </section>

      {/* Section 8 - PayU RODO Clause */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          8. Informacja o przetwarzaniu danych przez PayU
        </h2>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-gray-600 dark:text-gray-300 text-sm">
          <p className="mb-3">
            W przypadku płatności za pośrednictwem systemu PayU, administratorem Twoich danych osobowych
            w zakresie niezbędnym do realizacji płatności jest:
          </p>
          <p className="font-medium text-gray-900 dark:text-white">
            PayU S.A. z siedzibą w Poznaniu
          </p>
          <p>ul. Grunwaldzka 186, 60-166 Poznań</p>
          <p className="mt-3">
            <strong>Cele przetwarzania:</strong> realizacja transakcji płatniczej, powiadamianie o statusie
            płatności, obsługa reklamacji oraz wypełnianie obowiązków prawnych.
          </p>
          <p className="mt-3">
            <strong>Twoje prawa:</strong> dostęp do danych, sprostowanie, ograniczenie przetwarzania,
            sprzeciw, przenoszenie danych, usunięcie danych.
          </p>
          <p className="mt-3">
            Podanie danych jest dobrowolne, lecz niezbędne do realizacji płatności.
          </p>
          <p className="mt-3">
            Więcej informacji:{" "}
            <a
              href="https://poland.payu.com/privacy-portal/privacy-principles/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Polityka prywatności PayU
            </a>
          </p>
        </div>
      </section>

      {/* Section 9 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          9. Pliki cookies
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Nasza strona wykorzystuje pliki cookies. Szczegółowe informacje znajdziesz w{" "}
          <Link href="/cookies" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Polityce Cookies
          </Link>.
        </p>
      </section>

      {/* Section 10 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          10. Okres przechowywania danych
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li><strong>Dane konta:</strong> do momentu usunięcia konta</li>
          <li><strong>Dane transakcyjne:</strong> 5 lat (wymóg prawny)</li>
          <li><strong>Dane marketingowe:</strong> do momentu cofnięcia zgody</li>
          <li><strong>Dane analityczne:</strong> 26 miesięcy</li>
        </ul>
      </section>

      {/* Section 11 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          11. Prawo do wniesienia skargi
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Jeżeli uważasz, że Twoje dane są przetwarzane niezgodnie z prawem, masz prawo wnieść skargę do:
        </p>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-gray-600 dark:text-gray-300">
          <p className="font-semibold text-gray-900 dark:text-white">Prezes Urzędu Ochrony Danych Osobowych</p>
          <p>ul. Stawki 2, 00-193 Warszawa</p>
          <p className="mt-2">
            <a
              href="https://uodo.gov.pl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              https://uodo.gov.pl
            </a>
          </p>
        </div>
      </section>

      {/* Section 12 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          12. Kontakt
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          W sprawach dotyczących ochrony danych osobowych możesz się z nami skontaktować:
        </p>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-gray-600 dark:text-gray-300">
          <p>
            <span className="font-medium">E-mail:</span>{" "}
            <a href={`mailto:${COMPANY_INFO.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {COMPANY_INFO.email}
            </a>
          </p>
          <p className="mt-2">
            <span className="font-medium">Adres:</span> {COMPANY_INFO.fullAddress}
          </p>
        </div>
      </section>
    </LegalLayout>
  );
}
