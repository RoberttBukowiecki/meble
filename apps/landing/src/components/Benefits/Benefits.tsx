import BenefitSection from "./BenefitSection";

import { IBenefit } from "@/types";

interface Props {
  benefits: IBenefit[];
}

const Benefits: React.FC<Props> = ({ benefits }) => {
  return (
    <div id="features">
      <h2 className="sr-only">Features</h2>
      {benefits.map((item, index) => {
        return <BenefitSection key={index} benefit={item} imageAtRight={index % 2 !== 0} />;
      })}
    </div>
  );
};

export default Benefits;
