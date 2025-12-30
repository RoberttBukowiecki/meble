/**
 * TemplateStep - Second step: template selection
 *
 * Displays:
 * - Kitchen templates (KITCHEN, CORNER_INTERNAL, WALL)
 * - Furniture templates (WARDROBE, BOOKSHELF, DRAWER)
 */

import { CabinetType } from "@/types";
import { TemplateCard } from "./TemplateCard";
import { Category } from "./CategoryStep";

interface TemplateStepProps {
  category: Category;
  onSelect: (type: CabinetType) => void;
}

export function TemplateStep({ category, onSelect }: TemplateStepProps) {
  if (category === "kitchen") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <TemplateCard
            type="KITCHEN"
            title="Szafka kuchenna dolna"
            description="Uniwersalna szafka stojąca z możliwością konfiguracji drzwi, szuflad i półek."
            highlightFeature="Popularna"
            features={["Blat", "Nóżki", "Fronty"]}
            colorScheme="warm"
            onClick={() => onSelect("KITCHEN")}
          />
          <TemplateCard
            type="CORNER_INTERNAL"
            title="Szafka narożna"
            description="Szafka L-kształtna do wewnętrznych narożników. Maksymalne wykorzystanie przestrzeni."
            features={["Kształt L", "2 fronty"]}
            colorScheme="warm"
            onClick={() => onSelect("CORNER_INTERNAL")}
          />
          <TemplateCard
            type="WALL"
            title="Szafka wisząca"
            description="Szafka ścienna z wycięciami na zawieszki. Opcja frontu łamanego."
            features={["Zawieszki", "Front łamany"]}
            colorScheme="warm"
            onClick={() => onSelect("WALL")}
          />
        </div>

        {/* Hint */}
        <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3 border border-dashed border-amber-200/50">
          <p className="text-xs text-amber-800/70 dark:text-amber-200/60">
            <span className="font-medium text-amber-900/80 dark:text-amber-100/80">Wskazówka:</span>{" "}
            Zacznij od szafek dolnych, następnie dodaj szafki wiszące.
          </p>
        </div>
      </div>
    );
  }

  if (category === "furniture") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <TemplateCard
            type="WARDROBE"
            title="Szafa ubraniowa"
            description="Wysoka szafa z drzwiami skrzydłowymi. Konfigurowalne półki i drążek na ubrania."
            features={["Drzwi", "Drążek", "Półki"]}
            colorScheme="cool"
            onClick={() => onSelect("WARDROBE")}
          />
          <TemplateCard
            type="BOOKSHELF"
            title="Regał"
            description="Otwarty regał z dowolną liczbą półek. Idealny do salonu, biura lub pokoju dziecięcego."
            highlightFeature="Otwarty"
            features={["Bez frontów", "Półki"]}
            colorScheme="cool"
            onClick={() => onSelect("BOOKSHELF")}
          />
          <TemplateCard
            type="DRAWER"
            title="Kontener szufladowy"
            description="Szafka dedykowana pod szuflady. Do biurka, garderoby lub jako komoda."
            features={["Szuflady", "Prowadnice"]}
            colorScheme="cool"
            onClick={() => onSelect("DRAWER")}
          />
        </div>

        {/* Hint */}
        <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-lg p-3 border border-dashed border-slate-200/50">
          <p className="text-xs text-slate-600/70 dark:text-slate-300/60">
            <span className="font-medium text-slate-700/80 dark:text-slate-200/80">Wskazówka:</span>{" "}
            Każdy mebel można dostosować pod indywidualne wymiary i wyposażenie.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
