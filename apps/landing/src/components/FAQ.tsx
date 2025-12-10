"use client";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { BiMinus, BiPlus } from "react-icons/bi";

import { Locale } from "@meble/i18n";

import SectionTitle from "./SectionTitle";
import { IFAQ } from "@/types";

interface Props {
  faqs: IFAQ[];
  locale: Locale;
  contactEmail: string;
}

const FAQ: React.FC<Props> = ({ faqs, locale, contactEmail }) => {
  const heading = locale === "pl" ? "Najczęstsze pytania" : "Frequently Asked Questions";
  const subtitle =
    locale === "pl"
      ? "Zapytaj nas o eksport, materiały albo plan rozwoju."
      : "Ask us about export, materials, or the roadmap.";
  const ctaLabel = locale === "pl" ? "Napisz do nas" : "Email us";

  return (
    <section id="faq" className="py-10 lg:py-20">
      <div className="flex flex-col lg:flex-row gap-10">
        <div className="">
          <p className="hidden lg:block text-foreground-accent uppercase text-xs tracking-wide">FAQ</p>
          <SectionTitle>
            <h2 className="my-3 !leading-snug lg:max-w-sm text-center lg:text-left">{heading}</h2>
          </SectionTitle>
          <p className="lg:mt-10 text-foreground-accent text-center lg:text-left">{subtitle}</p>
          <a
            href={`mailto:${contactEmail}`}
            className="mt-3 block text-xl lg:text-3xl text-secondary font-semibold hover:underline text-center lg:text-left"
          >
            {ctaLabel} · {contactEmail}
          </a>
        </div>

        <div className="w-full lg:max-w-2xl mx-auto border-b border-border">
          {faqs.map((faq, index) => (
            <div key={index} className="mb-7">
              <Disclosure>
                {({ open }) => (
                  <>
                    <DisclosureButton className="flex items-center justify-between w-full px-4 pt-7 text-lg text-left border-t border-border">
                      <span className="text-2xl font-semibold">{faq.question}</span>
                      {open ? <BiMinus className="w-5 h-5 text-secondary" /> : <BiPlus className="w-5 h-5 text-secondary" />}
                    </DisclosureButton>
                    <DisclosurePanel className="px-4 pt-4 pb-2 text-foreground-accent">
                      {faq.answer}
                    </DisclosurePanel>
                  </>
                )}
              </Disclosure>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
