'use client';

import { useTranslations } from 'next-intl';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@meble/ui';
import { IFAQ } from '@/types';
import { motion } from 'framer-motion';

interface Props {
  faqs: IFAQ[];
}

const FAQ: React.FC<Props> = ({ faqs }) => {
  const t = useTranslations('landing.sections.faqs');

  return (
    <section id="faq" className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-4xl" // Removed divide-y divide-border here
      >
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          {t('description')}
        </p>
        <div className="mt-10"> {/* Removed space-y-6 divide-y divide-border here */}
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="mb-4 last:mb-0 border-b border-border" // Added bottom border for separation
              >
                <AccordionItem value={`item-${index}`} className="border-none"> {/* Removed default border */}
                  <AccordionTrigger className="text-left py-4 text-lg font-medium hover:no-underline [&[data-state=open]>svg]:rotate-180 transition-transform"> {/* Adjusted padding and font size */}
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground pb-4"> {/* Adjusted padding */}
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </motion.div>
    </section>
  );
};

export default FAQ;
