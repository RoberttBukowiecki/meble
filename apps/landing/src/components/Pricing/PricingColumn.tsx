import clsx from "clsx";
import { BsFillCheckCircleFill } from "react-icons/bs";

import { Locale } from "@meble/i18n";

import { IPricing } from "@/types";

interface Props {
  tier: IPricing;
  highlight?: boolean;
  locale: Locale;
}

const PricingColumn: React.FC<Props> = ({ tier, highlight, locale }: Props) => {
  const { name, price, features } = tier;
  const ctaLabel = locale === "pl" ? "Wybierz plan" : "Choose plan";
  const featureLabel = locale === "pl" ? "Funkcje" : "Features";
  const featureSubheading =
    locale === "pl"
      ? "Pełny zestaw dla tego planu."
      : "Everything included in this plan.";
  const priceSuffix = typeof price === "number" ? (locale === "pl" ? "/mies." : "/mo") : "";

  return (
    <div
      className={clsx(
        "w-full max-w-sm mx-auto bg-card rounded-xl border border-border lg:max-w-full",
        { "shadow-lg shadow-primary/20 border-primary/40": highlight }
      )}
    >
      <div className="p-6 border-b border-border/60 rounded-t-xl">
        <h3 className="text-2xl font-semibold mb-4">{name}</h3>
        <p className="text-3xl md:text-5xl font-bold mb-6">
          <span className={clsx({ "text-secondary": highlight })}>
            {typeof price === "number" ? `$${price}` : price}
          </span>
          {typeof price === "number" && (
            <span className="text-lg font-normal text-muted-foreground">{priceSuffix}</span>
          )}
        </p>
        <button
          className={clsx(
            "w-full py-3 px-4 rounded-full transition-colors font-semibold",
            {
              "bg-primary text-black hover:bg-primary-accent": highlight,
              "bg-muted text-foreground hover:bg-hero-background": !highlight,
            }
          )}
        >
          {ctaLabel}
        </button>
      </div>
      <div className="p-6 mt-1">
        <p className="font-bold mb-0 uppercase text-xs tracking-wide text-foreground">{featureLabel}</p>
        <p className="text-foreground-accent mb-5 text-sm">{featureSubheading}</p>
        <ul className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <BsFillCheckCircleFill className="h-5 w-5 text-secondary mr-2" />
              <span className="text-foreground-accent">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PricingColumn;
