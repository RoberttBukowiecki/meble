import PricingColumn from "./PricingColumn";

import { IPricing } from "@/types";

interface Props {
  pricing: IPricing[];
}

const Pricing: React.FC<Props> = ({ pricing }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {pricing.map((tier, index) => (
        <PricingColumn key={tier.name} tier={tier} highlight={index === 1} />
      ))}
    </div>
  );
};

export default Pricing;
