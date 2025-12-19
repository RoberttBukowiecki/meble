import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { APP_NAME, COMPANY_INFO } from "@meble/constants";
import { LegalLayout } from "@/components/LegalLayout";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Regulamin - ${APP_NAME}`,
    description: `Regulamin serwisu ${APP_NAME}. Zasady korzystania z aplikacji do projektowania mebli.`,
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LegalLayout title="Regulamin" lastUpdated="Grudzień 2024">
      {/* Section 1 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          1. Informacje o firmie
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Serwis {APP_NAME} prowadzony jest przez:
        </p>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <p className="font-semibold text-gray-900 dark:text-white">{COMPANY_INFO.legalName}</p>
          <p className="text-gray-600 dark:text-gray-300">{COMPANY_INFO.address.street}</p>
          <p className="text-gray-600 dark:text-gray-300">
            {COMPANY_INFO.address.zipCode} {COMPANY_INFO.address.city}
          </p>
          <p className="text-gray-600 dark:text-gray-300">{COMPANY_INFO.address.country}</p>
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
          2. Definicje
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li><strong>Sprzedawca</strong> - {COMPANY_INFO.legalName} z siedzibą w {COMPANY_INFO.address.city}.</li>
          <li><strong>Klient</strong> - osoba fizyczna, osoba prawna lub jednostka organizacyjna korzystająca z usług Serwisu.</li>
          <li><strong>Serwis</strong> - aplikacja internetowa {APP_NAME} do projektowania mebli.</li>
          <li><strong>Usługa</strong> - usługa cyfrowa polegająca na udostępnieniu aplikacji do projektowania mebli oraz generowania plików produkcyjnych.</li>
          <li><strong>Kredyty</strong> - wirtualna waluta umożliwiająca korzystanie z płatnych funkcji Usługi.</li>
        </ul>
      </section>

      {/* Section 3 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          3. Postanowienia ogólne
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li>Regulamin określa zasady korzystania z serwisu {APP_NAME}.</li>
          <li>Warunkiem korzystania z Serwisu jest zapoznanie się z Regulaminem i jego akceptacja.</li>
          <li>Ceny podane w Serwisie są cenami brutto i zawierają podatek VAT.</li>
          <li>Walutą rozliczeniową jest złoty polski (PLN).</li>
        </ul>
      </section>

      {/* Section 4 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          4. Zakres usług
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{APP_NAME} oferuje następujące usługi:</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li><strong>Projektowanie mebli</strong> - interaktywna aplikacja do tworzenia projektów mebli skrzyniowych.</li>
          <li><strong>Eksport plików</strong> - generowanie plików produkcyjnych (CSV, PDF) dla zaprojektowanych mebli.</li>
          <li><strong>Pakiety kredytów</strong> - zakup kredytów umożliwiających korzystanie z płatnych funkcji aplikacji.</li>
        </ul>
      </section>

      {/* Section 5 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          5. Składanie zamówień
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li>Zamówienia można składać poprzez stronę internetową Serwisu 24 godziny na dobę, 7 dni w tygodniu.</li>
          <li>W celu złożenia zamówienia należy zarejestrować konto w Serwisie lub zalogować się na istniejące konto.</li>
          <li>Po wybraniu usługi/pakietu Klient zostanie przekierowany do systemu płatności PayU.</li>
          <li>Zamówienie jest realizowane po otrzymaniu potwierdzenia płatności.</li>
        </ul>
      </section>

      {/* Section 6 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          6. Czas realizacji zamówienia
        </h2>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-gray-600 dark:text-gray-300">
          <p className="font-medium text-gray-900 dark:text-white">Usługi cyfrowe (kredyty, dostęp do funkcji):</p>
          <p className="mt-2">
            Realizacja zamówienia następuje <strong>natychmiastowo</strong> po zaksięgowaniu płatności,
            nie dłużej niż w ciągu <strong>1 dnia roboczego</strong>.
          </p>
        </div>
      </section>

      {/* Section 7 - Payment Methods */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          7. Metody płatności
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Płatności realizowane są za pośrednictwem systemu PayU S.A. Dostępne metody płatności:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li>Przelewy bankowe (pay-by-link)</li>
          <li>Karty płatnicze (Visa, Mastercard)</li>
          <li>BLIK</li>
        </ul>
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-300">
          <p>
            Operatorem płatności jest PayU S.A. z siedzibą w Poznaniu, 60-166 Poznań, ul. Grunwaldzka 186.
          </p>
        </div>
      </section>

      {/* Section 8 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          8. Prawo do odstąpienia od umowy
        </h2>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-gray-600 dark:text-gray-300 mb-4">
          <p>
            Zgodnie z ustawą z dnia 30 maja 2014 r. o prawach konsumenta, Klient będący konsumentem
            ma prawo odstąpić od umowy w terminie <strong>14 dni</strong> od dnia zawarcia umowy
            bez podawania przyczyny.
          </p>
          <p className="mt-3">
            <strong>Uwaga:</strong> Prawo do odstąpienia od umowy nie przysługuje w przypadku usług cyfrowych
            (kredytów), jeśli Klient wyraził zgodę na rozpoczęcie świadczenia usługi przed upływem terminu
            do odstąpienia od umowy.
          </p>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Procedura zwrotu:</h3>
        <ol className="list-decimal pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li>Aby odstąpić od umowy, należy złożyć oświadczenie o odstąpieniu.</li>
          <li>
            Oświadczenie można przesłać na adres e-mail:{" "}
            <a href={`mailto:${COMPANY_INFO.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {COMPANY_INFO.email}
            </a>
          </li>
          <li>Zwrot płatności nastąpi w ciągu 14 dni od otrzymania oświadczenia.</li>
        </ol>
      </section>

      {/* Section 9 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          9. Reklamacje
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Klient ma prawo do złożenia reklamacji w przypadku niewykonania lub nienależytego wykonania usługi.
        </p>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-gray-600 dark:text-gray-300">
          <p className="font-medium text-gray-900 dark:text-white mb-2">Dane kontaktowe do reklamacji:</p>
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
        <p className="mt-4 text-gray-600 dark:text-gray-300">
          Sprzedawca rozpatrzy reklamację w terminie <strong>14 dni roboczych</strong> od daty jej otrzymania.
        </p>
      </section>

      {/* Section 10 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          10. Ochrona danych osobowych
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Administratorem danych osobowych jest {COMPANY_INFO.legalName}. Szczegółowe informacje
          dotyczące przetwarzania danych osobowych znajdują się w{" "}
          <a href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Polityce Prywatności
          </a>.
        </p>
      </section>

      {/* Section 11 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          11. Postanowienia końcowe
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
          <li>Sprzedawca zastrzega sobie prawo do zmiany Regulaminu z ważnych przyczyn.</li>
          <li>O zmianach Regulaminu Klienci zostaną poinformowani drogą elektroniczną.</li>
          <li>W sprawach nieuregulowanych niniejszym Regulaminem mają zastosowanie przepisy prawa polskiego.</li>
          <li>Wszelkie spory będą rozstrzygane przez właściwy sąd powszechny.</li>
        </ul>
      </section>
    </LegalLayout>
  );
}
