/**
 * Question Templates for Furniture Design Wizard
 *
 * Adaptive questions that adjust based on user expertise level.
 * Each question has variants for beginner, intermediate, and professional users.
 */

import type { QuestionTemplate, WizardPhase, UserExpertiseLevel } from './types';

// ============================================================================
// Greeting Phase
// ============================================================================

export const GREETING_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'initial_greeting',
    phase: 'greeting',
    variants: {
      beginner: `Cześć! Jestem asystentem do projektowania mebli.
Co chciałbyś dziś zaprojektować? Mogę pomóc z kuchnią, szafą, regałem lub pojedynczą szafką.`,

      intermediate: `Witaj! Pomogę Ci zaprojektować meble na wymiar.
Co projektujesz - zabudowę kuchenną, szafę wnękową, czy może pojedynczy mebel?`,

      professional: `Dzień dobry. Jaki projekt realizujemy - kuchnia, zabudowa, korpusy jednostkowe?`,
    },
    quickReplies: {
      beginner: ['Kuchnia', 'Szafa', 'Regał na książki', 'Pojedyncza szafka', 'Coś innego'],
      intermediate: ['Zabudowa kuchenna', 'Szafa wnękowa', 'System półek', 'Szafka', 'Inny projekt'],
      professional: ['Kuchnia komplet', 'Kuchnia częściowa', 'Zabudowa', 'Korpusy', 'Inny'],
    },
    collectsFields: ['type'],
  },
];

// ============================================================================
// Project Type Phase
// ============================================================================

export const PROJECT_TYPE_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'kitchen_scope',
    phase: 'project_type',
    variants: {
      beginner: `Super, kuchnia! Czy projektujesz całą kuchnię od nowa, czy tylko część (np. same szafki dolne)?`,

      intermediate: `Rozumiem - kuchnia. Pełna zabudowa czy częściowa wymiana/uzupełnienie?`,

      professional: `Kuchnia - pełny komplet czy częściowy zakres?`,
    },
    quickReplies: {
      beginner: ['Cała kuchnia', 'Tylko dolne szafki', 'Tylko górne szafki', 'Nie wiem jeszcze'],
      intermediate: ['Pełna zabudowa', 'Tylko dolne', 'Tylko górne', 'Wysoka zabudowa'],
      professional: ['Komplet', 'Dolne', 'Górne', 'Wysokie', 'Mix'],
    },
    collectsFields: ['type'],
  },
  {
    id: 'wardrobe_type',
    phase: 'project_type',
    variants: {
      beginner: `Szafa - świetnie! Czy to będzie szafa wolnostojąca (taka którą można przesunąć),
czy wbudowana we wnękę?`,

      intermediate: `Szafa wolnostojąca czy zabudowa wnęki? Jeśli wnęka - czy masz wymiary?`,

      professional: `Szafa wolnostojąca czy wnękowa? Wymiary wnęki jeśli dotyczy?`,
    },
    quickReplies: {
      beginner: ['Wolnostojąca', 'Wbudowana we wnękę', 'Nie wiem'],
      intermediate: ['Wolnostojąca', 'Wnękowa', 'Garderobian/walk-in'],
      professional: ['Wolnostojąca', 'Wnęka', 'Walk-in', 'System'],
    },
    collectsFields: ['type'],
  },
];

// ============================================================================
// Room Dimensions Phase
// ============================================================================

export const ROOM_DIMENSION_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'kitchen_dimensions',
    phase: 'room_dimensions',
    variants: {
      beginner: `Jakie są wymiary Twojej kuchni? Możesz podać w przybliżeniu, np. "3 metry na 4 metry".

Jeśli nie znasz dokładnych wymiarów, zmierz ścianę przy której mają stać szafki.`,

      intermediate: `Podaj wymiary pomieszczenia lub długości ścian pod zabudowę (w cm lub mm).

Przykład: "ściana 320cm, druga 240cm" dla kuchni w L.`,

      professional: `Wymiary ścian pod zabudowę (mm)? Format: długość x głębokość dostępna.`,
    },
    quickReplies: {
      beginner: ['Mała kuchnia (~6m²)', 'Średnia (~10m²)', 'Duża (~15m²)', 'Podam wymiary'],
      intermediate: ['Około 3m', 'Około 4m', 'Kształt L', 'Podam dokładnie'],
      professional: [],
    },
    collectsFields: ['roomWidth', 'roomDepth', 'wallLengths'],
    validation: {
      type: 'dimensions',
      min: 1000, // 1m minimum
      max: 10000, // 10m max single wall
    },
  },
  {
    id: 'wardrobe_dimensions',
    phase: 'room_dimensions',
    variants: {
      beginner: `Jaka ma być szerokość szafy?

Standardowe szafy mają 150-250 cm szerokości.
Jeśli to wnęka, zmierz szerokość otworu.`,

      intermediate: `Szerokość szafy/wnęki? Podaj też wysokość jeśli nie standardowa (zwykle do sufitu ~250cm).`,

      professional: `Wymiary: szerokość x wysokość x głębokość (mm)?`,
    },
    quickReplies: {
      beginner: ['150 cm', '200 cm', '250 cm', 'Inna szerokość'],
      intermediate: ['180cm', '200cm', '240cm', 'Podam dokładnie'],
      professional: [],
    },
    collectsFields: ['roomWidth', 'roomHeight', 'roomDepth'],
    validation: {
      type: 'dimensions',
      min: 500,
      max: 5000,
    },
  },
];

// ============================================================================
// Layout Style Phase
// ============================================================================

export const LAYOUT_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'kitchen_layout',
    phase: 'layout_style',
    variants: {
      beginner: `Jak ma być rozplanowana kuchnia?

• Liniowa - szafki wzdłuż jednej ściany
• W kształcie L - szafki na dwóch ścianach tworzących róg
• W kształcie U - szafki na trzech ścianach
• Z wyspą - dodatkowy blok na środku`,

      intermediate: `Układ kuchni: liniowa, L, U, czy z wyspą?

Jeśli L lub U, która ściana jest główna (najdłuższa)?`,

      professional: `Layout: liniowy / L / U / wyspa?
Która ściana główna?`,
    },
    quickReplies: {
      beginner: ['Liniowa', 'W kształcie L', 'W kształcie U', 'Z wyspą'],
      intermediate: ['Liniowa', 'L-lewa', 'L-prawa', 'U', 'Wyspa'],
      professional: ['Lin', 'L-L', 'L-R', 'U', 'Wyspa', 'Półwysep'],
    },
    collectsFields: ['kitchenLayout'],
  },
];

// ============================================================================
// Cabinet Details Phase
// ============================================================================

export const CABINET_DETAIL_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'base_cabinet_count',
    phase: 'cabinet_details',
    variants: {
      beginner: `Ile mniej więcej szafek dolnych chcesz?

Przy ścianie 3m mieści się zazwyczaj 4-5 szafek standardowej szerokości (60cm).
Szafki pod zlew i płytę zwykle są osobne.`,

      intermediate: `Ile szafek dolnych? Standardowa szerokość to 40/60/80cm.
Przy ${'{wallLength}'}cm zmieści się ${'{suggestedCount}'} szafek 60cm.`,

      professional: `Ilość i szerokości korpusów dolnych?
Dostępna długość: ${'{wallLength}'}mm.`,
    },
    quickReplies: {
      beginner: ['3-4 szafki', '5-6 szafek', 'Podam dokładnie', 'Nie wiem, zaproponuj'],
      intermediate: ['4x60cm', '3x80cm', '60+80+60+40', 'Własny układ'],
      professional: [],
    },
    collectsFields: ['cabinets'],
  },
  {
    id: 'cabinet_interior',
    phase: 'cabinet_details',
    variants: {
      beginner: `Co ma być w środku szafek?

• Półki - na garnki, miski, zapasy
• Szuflady - wygodniejszy dostęp, droższe
• Mix - np. szuflada na górze, półki niżej`,

      intermediate: `Wnętrze szafek: półki, szuflady, czy mix?
Dla szafek z szufladami - ile szuflad (2-4)?`,

      professional: `Wnętrze: półki/szuflady/cargo?
Konfiguracja prowadnic?`,
    },
    quickReplies: {
      beginner: ['Głównie półki', 'Dużo szuflad', 'Mix - trochę i trochę'],
      intermediate: ['Półki', 'Szuflady 3', 'Szuflady 4', 'Cargo', 'Mix'],
      professional: ['Półki', 'Szufl. integrowane', 'Szufl. Tandembox', 'Cargo'],
    },
    collectsFields: ['cabinets'],
  },
  {
    id: 'wall_cabinet_height',
    phase: 'cabinet_details',
    variants: {
      beginner: `Jak wysokie mają być górne szafki?

• Niskie (60cm) - łatwy dostęp, więcej miejsca nad głową
• Średnie (72cm) - standard, dobry kompromis
• Wysokie (90cm) - maksimum miejsca, sięganie wyżej`,

      intermediate: `Wysokość górnych: 60/72/90cm?
Na jakiej wysokości dolna krawędź (standard: 140-150cm od podłogi)?`,

      professional: `Wysokość górnych (mm)? Poziom dolnej krawędzi od posadzki?`,
    },
    quickReplies: {
      beginner: ['Niskie (60cm)', 'Średnie (72cm)', 'Wysokie (90cm)'],
      intermediate: ['600mm', '720mm', '900mm', 'Mix'],
      professional: [],
    },
    collectsFields: ['cabinets'],
  },
];

// ============================================================================
// Appliances Phase
// ============================================================================

export const APPLIANCE_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'appliances_list',
    phase: 'appliances',
    variants: {
      beginner: `Jakie sprzęty AGD będą w kuchni?

Zaznacz wszystkie które planujesz:
• Zlew
• Płyta grzewcza (indukcja/gaz)
• Piekarnik
• Okap
• Zmywarka
• Lodówka do zabudowy`,

      intermediate: `Sprzęty do zabudowy:
- Zlew (szerokość?)
- Płyta (60/80cm?)
- Piekarnik (pod blatem/w słupku?)
- Okap, zmywarka, lodówka?`,

      professional: `AGD do uwzględnienia:
- Zlew: wymiary otworu?
- Płyta: 60/80, front/flush?
- Piekarnik: położenie?
- Inne?`,
    },
    quickReplies: {
      beginner: ['Zlew + płyta + piekarnik', 'Tylko zlew i płyta', 'Pełne wyposażenie'],
      intermediate: ['Standard 60', 'Płyta 80cm', 'Z wyspą'],
      professional: [],
    },
    collectsFields: ['appliances'],
  },
  {
    id: 'sink_details',
    phase: 'appliances',
    variants: {
      beginner: `Jaki zlew planujesz?

• Standardowy prostokątny (1 lub 1.5 komory)
• Mały/kompaktowy
• Okrągły
• Już mam zlew (podaj wymiary)`,

      intermediate: `Zlew: 1 komora, 1.5, 2 komory?
Wpuszczany czy podblatowy?
Wymiary jeśli masz konkretny model?`,

      professional: `Typ zlewu i wymiary otworu montażowego (mm)?`,
    },
    quickReplies: {
      beginner: ['Standardowy', 'Mały', 'Okrągły', 'Mam swój'],
      intermediate: ['1 komora 50x40', '1.5 komory', '2 komory', 'Własne wymiary'],
      professional: [],
    },
    collectsFields: ['appliances'],
  },
];

// ============================================================================
// Countertop Phase
// ============================================================================

export const COUNTERTOP_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'countertop_type',
    phase: 'countertop',
    variants: {
      beginner: `Jaki blat roboczy?

• Laminowany - ekonomiczny, duży wybór wzorów
• Drewniany - ciepły, wymaga pielęgnacji
• Kamienny/kwarcowy - trwały, droższy

Grubość standardowa to 38mm.`,

      intermediate: `Blat: laminat, drewno, konglomerat, compact?
Grubość: 28/38/40mm?
Nawis od frontu (standard 30mm)?`,

      professional: `Blat: typ, grubość, nawisy (F/B/L/R)?
Łączenia: uciosowe 45° / euroconnect?`,
    },
    quickReplies: {
      beginner: ['Laminowany', 'Drewniany', 'Kamienny', 'Nie wiem jeszcze'],
      intermediate: ['Laminat 38mm', 'Laminat 28mm', 'Compact', 'Konglomerat'],
      professional: [],
    },
    collectsFields: ['countertopThickness', 'countertopMaterialId', 'countertopOverhang'],
  },
];

// ============================================================================
// Materials Phase
// ============================================================================

export const MATERIAL_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'body_material',
    phase: 'materials',
    variants: {
      beginner: `Z czego mają być zrobione szafki w środku (korpus)?

• Biały - klasyczny, uniwersalny
• Drewnopodobny - pasuje do frontów drewnianych
• Taki sam jak fronty - elegancko, drożej`,

      intermediate: `Materiał korpusu: biały, dąb, antracyt, dopasowany do frontów?
Grubość płyty: 18mm standard.`,

      professional: `Korpus: kolor/dekor, grubość (16/18/19mm)?`,
    },
    quickReplies: {
      beginner: ['Biały', 'Drewnopodobny', 'Taki jak fronty'],
      intermediate: ['Biały 18mm', 'Dąb naturalny', 'Antracyt', 'Jak front'],
      professional: [],
    },
    collectsFields: ['defaultBodyMaterial'],
  },
  {
    id: 'front_material',
    phase: 'materials',
    variants: {
      beginner: `Jaki kolor/wzór frontów (drzwiczek i szuflad)?

• Białe - ponadczasowe, powiększają przestrzeń
• Szare - nowoczesne, praktyczne
• Drewniane - ciepłe, przytulne
• Kolorowe - indywidualne, odważne`,

      intermediate: `Fronty: kolor/dekor?
Mat czy połysk?
Typ: płaskie (nowoczesne) czy ramkowe (klasyczne)?`,

      professional: `Fronty: dekor, wykończenie (mat/połysk/struktura)?
MDF lakier / laminat / fornir / akryl?`,
    },
    quickReplies: {
      beginner: ['Białe', 'Szare', 'Drewniane', 'Inne kolory'],
      intermediate: ['Biały mat', 'Biały połysk', 'Dąb', 'Antracyt mat'],
      professional: [],
    },
    collectsFields: ['defaultFrontMaterial'],
  },
];

// ============================================================================
// Accessories Phase
// ============================================================================

export const ACCESSORY_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'handles',
    phase: 'accessories',
    variants: {
      beginner: `Jakie uchwyty do szafek?

• Klasyczne - listwy lub gałki, zawsze modne
• Zintegrowane - wpuszczone w front, nowoczesny look
• Bez uchwytów - otwieranie przez naciśnięcie (tip-on)`,

      intermediate: `Uchwyty: listwy, gałki, uchwyt frezowany, tip-on?
Rozstaw (jeśli listwy): 128/160/192mm?
Wykończenie: chrom, czarny mat, szczotkowana stal?`,

      professional: `Uchwyty: typ, rozstaw, wykończenie?
System otwierania bezuchwytowego?`,
    },
    quickReplies: {
      beginner: ['Klasyczne listwy', 'Nowoczesne wpuszczane', 'Bez uchwytów'],
      intermediate: ['Listwa 160mm chrom', 'Listwa czarna', 'Gałka', 'Tip-on'],
      professional: [],
    },
    collectsFields: ['handleStyle'],
  },
  {
    id: 'legs',
    phase: 'accessories',
    variants: {
      beginner: `Szafki dolne stoją na nóżkach zakrytych cokołem (listwą przy podłodze).

Kolor cokołu:
• Taki sam jak korpus (zwykle biały)
• Taki sam jak fronty
• Aluminiowy`,

      intermediate: `Nóżki: wysokość 100/150mm?
Cokół: dopasowany do korpusu, frontów, czy aluminiowy?`,

      professional: `Nóżki: wysokość, cokół - materiał?`,
    },
    quickReplies: {
      beginner: ['Biały cokół', 'Cokół jak fronty', 'Aluminiowy'],
      intermediate: ['100mm, biały', '150mm, alu', 'Dopasowany'],
      professional: [],
    },
    collectsFields: ['legStyle'],
  },
];

// ============================================================================
// Review Phase
// ============================================================================

export const REVIEW_QUESTIONS: QuestionTemplate[] = [
  {
    id: 'confirm_design',
    phase: 'review',
    variants: {
      beginner: `Podsumowanie Twojego projektu:

${'{summary}'}

Czy wszystko się zgadza? Mogę coś zmienić przed wygenerowaniem.`,

      intermediate: `Podsumowanie:

${'{summary}'}

Zatwierdź lub wskaż co zmienić.`,

      professional: `Specyfikacja:

${'{summary}'}

Akceptacja / korekty?`,
    },
    quickReplies: {
      beginner: ['Wszystko OK!', 'Chcę coś zmienić', 'Zacznijmy od nowa'],
      intermediate: ['Zatwierdź', 'Edytuj wymiary', 'Edytuj materiały', 'Reset'],
      professional: ['OK', 'Korekta', 'Reset'],
    },
    collectsFields: [],
  },
];

// ============================================================================
// Question Selection Logic
// ============================================================================

/**
 * Get all question templates organized by phase
 */
export const QUESTION_TEMPLATES: Record<WizardPhase, QuestionTemplate[]> = {
  greeting: GREETING_QUESTIONS,
  project_type: PROJECT_TYPE_QUESTIONS,
  room_dimensions: ROOM_DIMENSION_QUESTIONS,
  layout_style: LAYOUT_QUESTIONS,
  cabinet_details: CABINET_DETAIL_QUESTIONS,
  countertop: COUNTERTOP_QUESTIONS,
  appliances: APPLIANCE_QUESTIONS,
  materials: MATERIAL_QUESTIONS,
  accessories: ACCESSORY_QUESTIONS,
  review: REVIEW_QUESTIONS,
  complete: [],
};

/**
 * Get question text for user's expertise level
 */
export function getQuestionText(
  template: QuestionTemplate,
  level: UserExpertiseLevel,
  variables?: Record<string, string>
): string {
  let text = template.variants[level];

  // Replace variables
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      text = text.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }
  }

  return text;
}

/**
 * Get quick replies for user's expertise level
 */
export function getQuickReplies(
  template: QuestionTemplate,
  level: UserExpertiseLevel
): string[] {
  return template.quickReplies?.[level] || [];
}
