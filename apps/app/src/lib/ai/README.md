# AI Furniture Design Wizard

Konwersacyjny asystent do projektowania mebli, który prowadzi użytkownika przez proces tworzenia zabudowy krok po kroku.

## Funkcjonalności

### 1. Adaptacyjne pytania

Wizard automatycznie wykrywa poziom zaawansowania użytkownika na podstawie:
- Użycia terminologii technicznej (korpus, prowadnice, zawiasy)
- Podawania precyzyjnych wymiarów w mm
- Znajomości marek i standardów branżowych

**Poziomy użytkownika:**
- **Początkujący** - proste pytania, pełne wyjaśnienia, sugerowane wartości
- **Średniozaawansowany** - techniczny język, krótsze wyjaśnienia
- **Profesjonalista** - zwięzłe pytania, bez wyjaśnień, precyzyjne dane

### 2. Fazy projektowania

```
Powitanie → Typ projektu → Wymiary → Układ → Szafki → AGD → Blat → Materiały → Akcesoria → Podsumowanie
```

Każda faza zbiera konkretne informacje i automatycznie przechodzi do następnej.

### 3. Quick Replies

Szybkie odpowiedzi dostosowane do poziomu użytkownika, np.:

**Początkujący:** "Kuchnia", "Szafa", "Regał na książki"
**Profesjonalista:** "Kuchnia komplet", "Korpusy", "Zabudowa"

### 4. Oszczędność kosztów

- **Przetwarzanie lokalne** - większość logiki działa bez AI (rule-based parsing)
- **AI tylko gdy potrzebne** - dla skomplikowanych opisów lub generacji końcowej
- **Limity kosztów** - max $0.10 na sesję, $0.02 na pojedyncze wywołanie
- **Cache odpowiedzi** - ponowne użycie dla identycznych zapytań

## Architektura

```
src/lib/ai/
├── wizard/
│   ├── types.ts              # Typy i interfejsy
│   ├── userProfiler.ts       # Wykrywanie poziomu użytkownika
│   ├── questionTemplates.ts  # Szablony pytań dla każdej fazy
│   ├── conversationEngine.ts # Główna logika konwersacji
│   ├── aiEnhancer.ts         # Opcjonalne wywołania AI
│   └── index.ts              # Eksport publiczny
├── config.ts                 # Konfiguracja kosztów i limitów
└── index.ts

src/components/ai/
├── FurnitureWizard.tsx       # Główny komponent UI
├── WizardTriggerButton.tsx   # Przycisk uruchamiający wizard
└── index.ts

src/app/api/ai/wizard/
└── route.ts                  # API endpoint (opcjonalny)

src/lib/store/slices/
└── wizardSlice.ts            # Stan Zustand
```

## Użycie

### Podstawowe

```tsx
import { WizardTriggerButton } from "@/components/ai";

function Sidebar() {
  return (
    <WizardTriggerButton
      variant="sidebar"
      onComplete={(output) => {
        // output.cabinets - wygenerowane szafki
        // output.summary - podsumowanie
      }}
    />
  );
}
```

### Programowe

```tsx
import { initializeWizard, processUserMessage } from "@/lib/ai/wizard";

// Inicjalizacja
const state = initializeWizard("session_123");

// Przetwarzanie wiadomości
const newState = processUserMessage("Chcę zaprojektować kuchnię", state);

// Sprawdzenie fazy
console.log(newState.phase); // "project_type"
console.log(newState.suggestedOptions); // ["Cała kuchnia", "Tylko dolne szafki", ...]
```

## Wykrywanie poziomu użytkownika

System analizuje wiadomości użytkownika i przyznaje punkty za:

| Sygnał | Przykład | Punkty |
|--------|----------|--------|
| Terminy konstrukcyjne | "korpus", "wieniec" | +2 |
| Terminy sprzętowe | "Blum", "Tandembox" | +1 |
| Precyzyjne wymiary | "600mm" | +1 |
| Niepewność | "mniej więcej", "nie wiem" | -1 |

## Rozszerzenia (TODO)

- [ ] **Głosowe wprowadzanie** - integracja z Whisper API
- [ ] **AI-enhanced generation** - optymalizacja układu przez Claude
- [ ] **Historia rozmów** - wznawianie sesji
- [ ] **Eksport do PDF** - instrukcja montażu

## Konfiguracja

```typescript
// src/lib/ai/config.ts

WIZARD_CONFIG = {
  AI_UNDERSTANDING_ENABLED: false,  // Włącz AI dla trudnych wiadomości
  AI_GENERATION_ENABLED: false,     // Włącz AI dla generacji
  VOICE_INPUT_ENABLED: false,       // Włącz wprowadzanie głosowe
}
```

## Przykład konwersacji

```
🤖 Cześć! Co chciałbyś dziś zaprojektować?
   [Kuchnia] [Szafa] [Regał] [Pojedyncza szafka]

👤 Kuchnia

🤖 Projektujesz całą kuchnię czy tylko część?
   [Cała kuchnia] [Tylko dolne] [Tylko górne]

👤 Cała kuchnia, ale niewielka - około 3 metry

🤖 Rozumiem, 3 metry. Jaki układ - wzdłuż jednej ściany czy w kształcie L?
   [Liniowa] [W kształcie L] [W kształcie U]

👤 Liniowa

🤖 Ile szafek dolnych? Przy 3m zmieści się 5 szafek 60cm.
   [4 szafki] [5 szafek] [Podam dokładnie]

...
```

## Licencja

Część projektu e-meble. Wszystkie prawa zastrzeżone.
