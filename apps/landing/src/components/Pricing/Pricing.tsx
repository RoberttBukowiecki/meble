import PricingColumn from "./PricingColumn";

import { Locale } from "@meble/i18n";

import { IPricing } from "@/types";

interface Props {
  pricing: IPricing[];
  locale: Locale;
}

const Pricing: React.FC<Props> = ({ pricing, locale }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {pricing.map((tier, index) => (
        <PricingColumn key={tier.name} tier={tier} locale={locale} highlight={index === 1} />
      ))}
    </div>
  );
};

export default Pricing;
