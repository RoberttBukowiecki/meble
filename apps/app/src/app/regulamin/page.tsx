import { COMPANY_INFO, APP_NAME } from '@meble/constants';
import Link from 'next/link';

export const metadata = {
  title: `Regulamin - ${APP_NAME}`,
  description: `Regulamin sklepu internetowego ${APP_NAME}`,
};

export default function RegulaminPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-primary hover:underline mb-8 inline-block"
        >
          &larr; Powrot do strony glownej
        </Link>

        <h1 className="text-3xl font-bold mb-8">Regulamin</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          {/* Section 1: Company Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Informacje o firmie
            </h2>
            <p>
              Sklep internetowy {APP_NAME} prowadzony jest przez:
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
            </div>
          </section>

          {/* Section 2: Definitions */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Definicje</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Sprzedawca</strong> - {COMPANY_INFO.legalName} z siedziba
                w {COMPANY_INFO.address.city}.
              </li>
              <li>
                <strong>Klient</strong> - osoba fizyczna, osoba prawna lub
                jednostka organizacyjna nieposiadajaca osobowosci prawnej,
                korzystajaca z uslug Sklepu.
              </li>
              <li>
                <strong>Sklep</strong> - serwis internetowy dostepny pod adresem{' '}
                {APP_NAME}, za posrednictwem ktorego Klient moze korzystac z
                uslug.
              </li>
              <li>
                <strong>Usluga</strong> - usluga cyfrowa polegajaca na
                udostepnieniu aplikacji do projektowania mebli oraz generowania
                plikow produkcyjnych.
              </li>
              <li>
                <strong>Kredyty</strong> - wirtualna waluta w ramach Sklepu,
                umozliwiajaca korzystanie z platnych funkcji Uslugi.
              </li>
            </ul>
          </section>

          {/* Section 3: General Provisions */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. Postanowienia ogolne
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Regulamin okresla zasady korzystania ze Sklepu internetowego{' '}
                {APP_NAME}.
              </li>
              <li>
                Warunkiem korzystania ze Sklepu jest zapoznanie sie z
                Regulaminem i jego akceptacja.
              </li>
              <li>
                Ceny podane w Sklepie sa cenami brutto i zawieraja podatek VAT.
              </li>
              <li>Waluta rozliczeniowa to zloty polski (PLN).</li>
            </ul>
          </section>

          {/* Section 4: Services and Products */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              4. Zakres uslug
            </h2>
            <p>{APP_NAME} oferuje nastepujace uslugi:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                <strong>Projektowanie mebli</strong> - interaktywna aplikacja do
                tworzenia projektow mebli skrzyniowych.
              </li>
              <li>
                <strong>Eksport plikow</strong> - generowanie plikow
                produkcyjnych (CSV, PDF) dla zaprojektowanych mebli.
              </li>
              <li>
                <strong>Pakiety kredytow</strong> - zakup kredytow umozliwiajacych
                korzystanie z platnych funkcji aplikacji.
              </li>
            </ul>
            <p className="mt-4">
              Kazda usluga posiada szczegolowy opis oraz cene widoczna przed
              dokonaniem zakupu.
            </p>
          </section>

          {/* Section 5: Order Process */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              5. Skladanie zamowien
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Zamowienia mozna skladac poprzez strone internetowa Sklepu 24
                godziny na dobe, 7 dni w tygodniu.
              </li>
              <li>
                W celu zlozenia zamowienia nalezy zarejestrowac konto w Sklepie
                lub zalogowac sie na istniejace konto.
              </li>
              <li>
                Po wybraniu uslugi/pakietu i kliknieciu przycisku{' '}
                <strong>&quot;Zamawiam i place&quot;</strong> Klient zostanie
                przekierowany do systemu platnosci PayU.
              </li>
              <li>
                Zamowienie jest realizowane po otrzymaniu potwierdzenia platnosci.
              </li>
            </ul>
          </section>

          {/* Section 6: Order Fulfillment Time */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. Czas realizacji zamowienia
            </h2>
            <div className="bg-muted p-4 rounded-lg">
              <p>
                <strong>Uslugi cyfrowe (kredyty, dostep do funkcji):</strong>
              </p>
              <p className="mt-2">
                Realizacja zamowienia nastepuje <strong>natychmiastowo</strong>{' '}
                po zaksiegowaniu platnosci, nie dluzej niz w ciagu{' '}
                <strong>1 dnia roboczego</strong>.
              </p>
              <p className="mt-4">
                Kredyty sa automatycznie dodawane do konta Klienta po
                potwierdzeniu platnosci przez system PayU.
              </p>
            </div>
          </section>

          {/* Section 7: Payment Methods */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Metody platnosci</h2>
            <p>
              Platnosci realizowane sa za posrednictwem systemu PayU. Dostepne
              metody platnosci:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Przelewy bankowe (pay-by-link)</li>
              <li>Karty platnicze (Visa, Mastercard)</li>
              <li>BLIK</li>
              <li>Przelewy24</li>
            </ul>
          </section>

          {/* Section 8: Return Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              8. Prawo do odstapienia od umowy (zwroty)
            </h2>
            <div className="bg-muted p-4 rounded-lg">
              <p>
                Zgodnie z ustawa z dnia 30 maja 2014 r. o prawach konsumenta,
                Klient bedacy konsumentem ma prawo odstapic od umowy w terminie{' '}
                <strong>14 dni</strong> od dnia zawarcia umowy bez podawania
                przyczyny.
              </p>
              <p className="mt-4">
                <strong>WAZNE:</strong> Prawo do odstapienia od umowy nie
                przysluguje w przypadku uslug cyfrowych (kredytow), jesli Klient
                wyrazil zgode na rozpoczecie swiadczenia uslugi przed uplywem
                terminu do odstapienia od umowy i zostal poinformowany o utracie
                prawa do odstapienia.
              </p>
            </div>
            <h3 className="text-xl font-semibold mt-6 mb-2">
              Procedura zwrotu:
            </h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                Aby odstapic od umowy, nalezy zlozyc oswiadczenie o odstapieniu.
              </li>
              <li>
                Oswiadczenie mozna przeslac na adres e-mail:{' '}
                <a
                  href={`mailto:${COMPANY_INFO.email}`}
                  className="text-primary hover:underline"
                >
                  {COMPANY_INFO.email}
                </a>
              </li>
              <li>
                Lub listownie na adres:
                <div className="mt-2 pl-4">
                  <p>{COMPANY_INFO.legalName}</p>
                  <p>{COMPANY_INFO.address.street}</p>
                  <p>
                    {COMPANY_INFO.address.zipCode} {COMPANY_INFO.address.city}
                  </p>
                </div>
              </li>
              <li>
                Zwrot platnosci nastapi w ciagu 14 dni od otrzymania
                oswiadczenia.
              </li>
            </ol>
          </section>

          {/* Section 9: Complaints */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Reklamacje</h2>
            <p>
              Klient ma prawo do zlozenia reklamacji w przypadku niewykonania lub
              nienalezytego wykonania uslugi.
            </p>
            <h3 className="text-xl font-semibold mt-6 mb-2">
              Dane kontaktowe do reklamacji:
            </h3>
            <div className="bg-muted p-4 rounded-lg">
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
              <p>{COMPANY_INFO.address.street}</p>
              <p>
                {COMPANY_INFO.address.zipCode} {COMPANY_INFO.address.city}
              </p>
            </div>
            <h3 className="text-xl font-semibold mt-6 mb-2">
              Procedura reklamacyjna:
            </h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Reklamacja powinna zawierac opis problemu oraz dane Klienta.</li>
              <li>
                Sprzedawca rozpatrzy reklamacje w terminie{' '}
                <strong>14 dni roboczych</strong> od daty jej otrzymania.
              </li>
              <li>
                O wyniku rozpatrzenia reklamacji Klient zostanie poinformowany
                droga elektroniczna lub listowna.
              </li>
            </ol>
          </section>

          {/* Section 10: Privacy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              10. Ochrona danych osobowych
            </h2>
            <p>
              Administratorem danych osobowych jest {COMPANY_INFO.legalName}.
              Szczegolowe informacje dotyczace przetwarzania danych osobowych
              znajduja sie w{' '}
              <Link
                href="/polityka-prywatnosci"
                className="text-primary hover:underline"
              >
                Polityce Prywatnosci
              </Link>
              .
            </p>
          </section>

          {/* Section 11: Final Provisions */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              11. Postanowienia koncowe
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Sprzedawca zastrzega sobie prawo do zmiany Regulaminu z waznych
                przyczyn.
              </li>
              <li>
                O zmianach Regulaminu Klienci zostana poinformowani droga
                elektroniczna.
              </li>
              <li>
                W sprawach nieuregulowanych niniejszym Regulaminem maja
                zastosowanie przepisy prawa polskiego.
              </li>
              <li>
                Wszelkie spory beda rozstrzygane przez wlasciwy sad powszechny.
              </li>
            </ul>
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
