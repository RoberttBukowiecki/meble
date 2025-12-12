"use client";

import PricingColumn from "./PricingColumn";
import { IPricing } from "@/types";
import { motion } from 'framer-motion';

interface Props {
  pricing: IPricing[];
}

const Pricing: React.FC<Props> = ({ pricing }) => {
  return (
    <motion.div 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.2
          }
        }
      }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-24 sm:mt-32 max-w-7xl mx-auto px-6 lg:px-8"
    >
      {pricing.map((tier, index) => (
        <motion.div
          key={tier.name}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
          }}
        >
           <PricingColumn tier={tier} highlight={index === 1} />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default Pricing;
