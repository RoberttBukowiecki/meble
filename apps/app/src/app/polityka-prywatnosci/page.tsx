import { COMPANY_INFO, APP_NAME } from '@meble/constants';
import Link from 'next/link';

export const metadata = {
  title: `Polityka Prywatnosci - ${APP_NAME}`,
  description: `Polityka prywatnosci i ochrony danych osobowych ${APP_NAME}`,
};

export default function PolitykaPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-primary hover:underline mb-8 inline-block"
        >
          &larr; Powrot do strony glownej
        </Link>

        <h1 className="text-3xl font-bold mb-8">Polityka Prywatnosci</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          {/* Section 1: Data Controller */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Administrator Danych Osobowych
            </h2>
            <p>
              Administratorem Twoich danych osobowych jest:
            </p>
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p className="font-semibold">{COMPANY_INFO.legalName}</p>
              <p>{COMPANY_INFO.address.street}</p>
              <p>
                {COMPANY_INFO.address.zipCode} {COMPANY_INFO.address.city}
              </p>
              <p>{COMPANY_INFO.address.country}</p>
              <p className="mt-2">
                <strong>NIP:</strong> {COMPANY_INFO.nip}
              </p>
              <p>
                <strong>KRS:</strong> {COMPANY_INFO.krs}
              </p>
              <p>
                <strong>REGON:</strong> {COMPANY_INFO.regon}
              </p>
              <p className="mt-2">
                <strong>E-mail kontaktowy:</strong>{' '}
                <a
                  href={`mailto:${COMPANY_INFO.email}`}
                  className="text-primary hover:underline"
                >
                  {COMPANY_INFO.email}
                </a>
              </p>
              <p>
                <strong>Telefon:</strong>{' '}
                <a
                  href={`tel:${COMPANY_INFO.phone}`}
                  className="text-primary hover:underline"
                >
                  {COMPANY_INFO.phone}
                </a>
              </p>
            </div>
          </section>

          {/* Section 2: Legal Basis */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Podstawa prawna przetwarzania danych
            </h2>
            <p>
              Twoje dane osobowe sa przetwarzane zgodnie z:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                <strong>Rozporzadzeniem Parlamentu Europejskiego i Rady (UE) 2016/679</strong>{' '}
                z dnia 27 kwietnia 2016 r. w sprawie ochrony osob fizycznych w
                zwiazku z przetwarzaniem danych osobowych (RODO/GDPR)
              </li>
              <li>
                <strong>Ustawa z dnia 10 maja 2018 r.</strong> o ochronie danych
                osobowych
              </li>
              <li>
                <strong>Ustawa z dnia 18 lipca 2002 r.</strong> o swiadczeniu uslug
                droga elektroniczna
              </li>
            </ul>
            <p className="mt-4">
              Dane przetwarzamy na podstawie:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Art. 6 ust. 1 lit. a) RODO - zgoda osoby, ktorej dane dotycza</li>
              <li>Art. 6 ust. 1 lit. b) RODO - wykonanie umowy</li>
              <li>Art. 6 ust. 1 lit. c) RODO - obowiazek prawny</li>
              <li>Art. 6 ust. 1 lit. f) RODO - prawnie uzasadniony interes</li>
            </ul>
          </section>

          {/* Section 3: Purpose of Data Collection */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. Cel zbierania i przetwarzania danych
            </h2>
            <p>
              Twoje dane osobowe zbieramy i przetwarzamy w nastepujacych celach:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                <strong>Swiadczenie uslug</strong> - rejestracja i prowadzenie
                konta uzytkownika, realizacja zamowien, udostepnianie funkcji
                aplikacji
              </li>
              <li>
                <strong>Realizacja platnosci</strong> - przetwarzanie transakcji
                za posrednictwem systemu PayU
              </li>
              <li>
                <strong>Komunikacja</strong> - odpowiadanie na zapytania,
                obsluga reklamacji, wysylanie informacji o zmianach w usludze
              </li>
              <li>
                <strong>Marketing</strong> - wysylanie informacji handlowych (tylko
                za wyrazna zgoda)
              </li>
              <li>
                <strong>Analizy i statystyki</strong> - doskonalenie uslug,
                analiza sposobu korzystania z aplikacji
              </li>
              <li>
                <strong>Obowiazki prawne</strong> - wypelnianie obowiazkow
                podatkowych i rachunkowych
              </li>
            </ul>
          </section>

          {/* Section 4: Scope of Data */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              4. Zakres zbieranych danych
            </h2>
            <p>
              Zbieramy nastepujace kategorie danych osobowych:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                <strong>Dane identyfikacyjne:</strong> imie, nazwisko, nazwa
                uzytkownika
              </li>
              <li>
                <strong>Dane kontaktowe:</strong> adres e-mail, numer telefonu
              </li>
              <li>
                <strong>Dane techniczne:</strong> adres IP, informacje o
                przegladarce, dane o urzadzeniu
              </li>
              <li>
                <strong>Dane o aktywnosci:</strong> historia korzystania z
                aplikacji, zapisane projekty
              </li>
              <li>
                <strong>Dane transakcyjne:</strong> historia zakupow, informacje o
                platnosciach
              </li>
            </ul>
          </section>

          {/* Section 5: Data Protection */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              5. Sposob ochrony danych osobowych
            </h2>
            <p>
              Stosujemy odpowiednie srodki techniczne i organizacyjne w celu
              ochrony Twoich danych osobowych:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                <strong>Szyfrowanie SSL/TLS</strong> - wszystkie dane
                przesylane sa przez szyfrowane polaczenie
              </li>
              <li>
                <strong>Bezpieczne przechowywanie</strong> - dane przechowywane
                sa na zabezpieczonych serwerach z kontrola dostepu
              </li>
              <li>
                <strong>Hashowanie hasel</strong> - hasla uzytkownikow sa
                przechowywane w formie zaszyfrowanej
              </li>
              <li>
                <strong>Regularne kopie zapasowe</strong> - zapewniamy
                ciaglosc i dostepnosc danych
              </li>
              <li>
                <strong>Ograniczony dostep</strong> - dostep do danych maja
                tylko upowaznieni pracownicy
              </li>
              <li>
                <strong>Monitorowanie bezpieczenstwa</strong> - systemy sa
                regularnie monitorowane pod katem zagro zen
              </li>
            </ul>
          </section>

          {/* Section 6: User Rights */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. Twoje prawa dotyczace danych osobowych
            </h2>
            <p>
              Zgodnie z RODO przysluguja Ci nastepujace prawa:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                <strong>Prawo dostepu</strong> - mozesz uzyskac informacje o
                przetwarzanych danych
              </li>
              <li>
                <strong>Prawo do sprostowania</strong> - mozesz zadac poprawienia
                nieprawidlowych danych
              </li>
              <li>
                <strong>Prawo do usuniecia (&quot;bycia zapomnianym&quot;)</strong> - mozesz
                zadac usuniecia swoich danych
              </li>
              <li>
                <strong>Prawo do ograniczenia przetwarzania</strong> - mozesz
                zadac ograniczenia przetwarzania danych
              </li>
              <li>
                <strong>Prawo do przenoszenia danych</strong> - mozesz otrzymac
                swoje dane w ustrukturyzowanym formacie
              </li>
              <li>
                <strong>Prawo do sprzeciwu</strong> - mozesz sprzeciwic sie
                przetwarzaniu danych w celach marketingowych
              </li>
              <li>
                <strong>Prawo do cofniecia zgody</strong> - mozesz w kazdej
                chwili cofnac udzielona zgode
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-2">
              Jak skorzystac z przysugujacych praw:
            </h3>
            <div className="bg-muted p-4 rounded-lg">
              <p>
                Aby skorzystac z powyzszych praw, skontaktuj sie z nami:
              </p>
              <p className="mt-2">
                <strong>E-mail:</strong>{' '}
                <a
                  href={`mailto:${COMPANY_INFO.email}`}
                  className="text-primary hover:underline"
                >
                  {COMPANY_INFO.email}
                </a>
              </p>
              <p>
                <strong>Adres:</strong> {COMPANY_INFO.fullAddress}
              </p>
              <p className="mt-2">
                Odpowiemy na Twoje zadanie w ciagu <strong>30 dni</strong> od
                jego otrzymania.
              </p>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-2">
              Jak zmienic lub usunac dane w aplikacji:
            </h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Zaloguj sie na swoje konto</li>
              <li>Przejdz do ustawien konta</li>
              <li>
                Edytuj swoje dane lub wybierz opcje usuniecia konta
              </li>
              <li>
                Alternatywnie - skontaktuj sie z nami mailowo, a my pomozemy
              </li>
            </ol>
          </section>

          {/* Section 7: Data Sharing */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Udostepnianie danych podmiotom trzecim
            </h2>
            <p>
              Twoje dane osobowe moga byc udostepniane nastepujacym kategoriom
              odbiorcow:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                <strong>Dostawcy uslug platniczych:</strong> PayU S.A. - w celu
                realizacji platnosci
              </li>
              <li>
                <strong>Dostawcy uslug hostingowych:</strong> Vercel Inc.,
                Supabase Inc. - w celu przechowywania danych i hostingu aplikacji
              </li>
              <li>
                <strong>Dostawcy uslug analitycznych:</strong> Google Analytics -
                w celu analizy ruchu na stronie (dane zanonimizowane)
              </li>
              <li>
                <strong>Organy panstwowe:</strong> na podstawie obowiazujacych
                przepisow prawa (np. Urzad Skarbowy)
              </li>
            </ul>
            <p className="mt-4">
              Wszyscy nasi partnerzy sa zobowiazani do zachowania poufnosci i
              bezpieczenstwa danych zgodnie z obowiazujacymi przepisami.
            </p>
          </section>

          {/* Section 8: PayU RODO */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              8. Informacja o przetwarzaniu danych przez PayU
            </h2>
            <p>
              W przypadku platnosci za posrednictwem systemu PayU, administratorem
              Twoich danych osobowych w zakresie niezbednym do realizacji platnosci jest:
            </p>
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p className="font-semibold">PayU S.A.</p>
              <p>ul. Grunwaldzka 186</p>
              <p>60-166 Poznan</p>
            </div>
            <div className="mt-4 space-y-3">
              <p>
                <strong>Cele przetwarzania:</strong> realizacja transakcji platniczej,
                powiadamianie o statusie platnosci, obsluga reklamacji oraz
                wypelnianie obowiazkow prawnych.
              </p>
              <p>
                <strong>Twoje prawa:</strong> dostep do danych, sprostowanie,
                ograniczenie przetwarzania, sprzeciw, przenoszenie danych, usuniecie danych.
              </p>
              <p>
                Podanie danych jest dobrowolne, lecz niezbedne do realizacji platnosci.
              </p>
              <p>
                Wiecej informacji:{' '}
                <a
                  href="https://poland.payu.com/privacy-portal/privacy-principles/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Polityka prywatnosci PayU
                </a>
              </p>
            </div>
          </section>

          {/* Section 9: Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              9. Pliki cookies
            </h2>
            <p>
              Nasza strona wykorzystuje pliki cookies w nastepujacych celach:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                <strong>Niezbedne:</strong> zapewnienie prawidlowego dzialania
                strony, uwierzytelnianie uzytkownikow
              </li>
              <li>
                <strong>Funkcjonalne:</strong> zapamietywanie preferencji
                uzytkownika
              </li>
              <li>
                <strong>Analityczne:</strong> zbieranie anonimowych statystyk
                dotyczacych korzystania ze strony
              </li>
            </ul>
            <p className="mt-4">
              Mozesz zarzadzac ustawieniami cookies w swojej przegladarce
              internetowej. Wylaczenie niektorych cookies moze wplynac na
              funkcjonalnosc strony.
            </p>
          </section>

          {/* Section 10: Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              10. Okres przechowywania danych
            </h2>
            <p>
              Twoje dane przechowujemy przez okres:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                <strong>Dane konta:</strong> do momentu usuniecia konta lub
                zadania usuniecia danych
              </li>
              <li>
                <strong>Dane transakcyjne:</strong> 5 lat od konca roku
                podatkowego (wymog prawny)
              </li>
              <li>
                <strong>Dane marketingowe:</strong> do momentu cofniecia zgody
              </li>
              <li>
                <strong>Dane analityczne:</strong> 26 miesiecy (Google Analytics)
              </li>
            </ul>
          </section>

          {/* Section 11: Right to Complaint */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              11. Prawo do wniesienia skargi
            </h2>
            <p>
              Jezeli uwazasz, ze Twoje dane osobowe sa przetwarzane niezgodnie z
              prawem, masz prawo wniesc skarge do organu nadzorczego:
            </p>
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p className="font-semibold">
                Prezes Urzedu Ochrony Danych Osobowych (PUODO)
              </p>
              <p>ul. Stawki 2</p>
              <p>00-193 Warszawa</p>
              <p className="mt-2">
                <strong>Strona internetowa:</strong>{' '}
                <a
                  href="https://uodo.gov.pl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://uodo.gov.pl
                </a>
              </p>
            </div>
          </section>

          {/* Section 12: Changes to Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              12. Zmiany w Polityce Prywatnosci
            </h2>
            <p>
              Zastrzegamy sobie prawo do wprowadzania zmian w niniejszej Polityce
              Prywatnosci. O istotnych zmianach poinformujemy uzytkownikow droga
              elektroniczna.
            </p>
            <p className="mt-4">
              Aktualna wersja Polityki Prywatnosci jest zawsze dostepna na tej
              stronie.
            </p>
          </section>

          {/* Section 13: Contact */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Kontakt</h2>
            <p>
              W sprawach dotyczacych ochrony danych osobowych mozesz sie z nami
              skontaktowac:
            </p>
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p>
                <strong>E-mail:</strong>{' '}
                <a
                  href={`mailto:${COMPANY_INFO.email}`}
                  className="text-primary hover:underline"
                >
                  {COMPANY_INFO.email}
                </a>
              </p>
              <p>
                <strong>Telefon:</strong>{' '}
                <a
                  href={`tel:${COMPANY_INFO.phone}`}
                  className="text-primary hover:underline"
                >
                  {COMPANY_INFO.phone}
                </a>
              </p>
              <p className="mt-2">
                <strong>Adres korespondencyjny:</strong>
              </p>
              <p>{COMPANY_INFO.legalName}</p>
              <p>{COMPANY_INFO.fullAddress}</p>
            </div>
          </section>

          {/* Last updated */}
          <div className="border-t pt-6 mt-8 text-muted-foreground text-sm">
            <p>Ostatnia aktualizacja: Grudzien 2024</p>
          </div>
        </div>
      </div>
    </div>
  );
}
