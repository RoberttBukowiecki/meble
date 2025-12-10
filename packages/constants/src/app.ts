/**
 * Application-wide constants
 */

/**
 * The name of the application
 * Use this constant everywhere instead of hardcoding "Meble"
 */
export const APP_NAME = 'Meble 3D';

/**
 * Application metadata
 */
export const APP_META = {
  name: APP_NAME,
  repository: 'https://github.com/RoberttBukowiecki/meble.git',
} as const;

// Mozesz dodac button pod "dodaj czesc", po nacisnieciu ktorego bedzie mozna dodac gotowe szafki do latwej edycji ich parametrow? (zmiana wymiarow calej szafki ma zmienic wymiar kilku plyt) cos takiego jak
// parametryzowany obiekt. Stworz plan do pliku .md w /docs. Zadaj odpowiednie pytania zeby otrzymac production-grade.

// Dodaj wykrywanie kolizji dwoch czesci, czesci ktore koliduja ze soba (nachodza na siebie) powinny byc oznaczone na czerwono w 3D. Powinien pojawic sie wykrzyknik z ostrzezeniem, po nacisnieciu ktorego
// dostaniesz liste nieprawidlowosci na scenie.