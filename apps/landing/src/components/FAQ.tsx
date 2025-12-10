'use client';

import { useTranslations } from 'next-intl';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@meble/ui';
import { IFAQ } from '@/types';

interface Props {
  faqs: IFAQ[];
}

const FAQ: React.FC<Props> = ({ faqs }) => {
  const t = useTranslations('landing.faqs');

  return (
    <section id="faq" className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-4xl divide-y divide-border">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          {t('description')}
        </p>
        <dl className="mt-10 space-y-6 divide-y divide-border">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </dl>
      </div>
    </section>
  );
};

export default FAQ;
