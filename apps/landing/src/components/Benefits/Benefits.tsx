import BenefitSection from "./BenefitSection";

import { IBenefit } from "@/types";

interface Props {
  benefits: IBenefit[];
}

const Benefits: React.FC<Props> = ({ benefits }) => {
  return (
    <div id="features" className="mt-16 md:mt-24">
      <h2 className="sr-only">Features</h2>
      {benefits.map((item, index) => {
        return <BenefitSection key={index} benefit={item} imageAtRight={index % 2 !== 0} />;
      })}
    </div>
  );
};

export default Benefits;
