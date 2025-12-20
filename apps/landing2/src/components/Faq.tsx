"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Container } from "./Container";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/24/solid";
import { track, AnalyticsEvent } from "@meble/analytics";

// Track FAQ item expansion (only first time)
function FaqItemTracker({
  open,
  itemId,
  question,
  trackedItems,
  pagePath,
}: {
  open: boolean;
  itemId: string;
  question: string;
  trackedItems: React.MutableRefObject<Set<string>>;
  pagePath: string;
}) {
  useEffect(() => {
    if (open && !trackedItems.current.has(itemId)) {
      trackedItems.current.add(itemId);
      track(AnalyticsEvent.LANDING_FAQ_EXPANDED, {
        faq_item: itemId,
        faq_question: question,
        page_path: pagePath,
      });
    }
  }, [open, itemId, question, trackedItems, pagePath]);

  return null;
}

export function Faq() {
  const t = useTranslations("faq.items");
  const pathname = usePathname();
  const trackedItems = useRef<Set<string>>(new Set());

  const faqItems = ["1", "2", "3", "4"];

  return (
    <Container className="!p-0">
      <div className="w-full max-w-2xl p-2 mx-auto rounded-2xl">
        {faqItems.map((item) => {
          const question = t(`${item}.question`);
          return (
            <div key={item} className="mb-5">
              <Disclosure>
                {({ open }) => (
                  <>
                    <FaqItemTracker
                      open={open}
                      itemId={item}
                      question={question}
                      trackedItems={trackedItems}
                      pagePath={pathname || "/"}
                    />
                    <DisclosureButton className="flex items-center justify-between w-full px-4 py-4 text-lg text-left text-gray-800 rounded-lg bg-gray-50 hover:bg-gray-100 focus:outline-none focus-visible:ring focus-visible:ring-indigo-100 focus-visible:ring-opacity-75 dark:bg-trueGray-800 dark:text-gray-200">
                      <span>{question}</span>
                      <ChevronUpIcon
                        className={`${
                          open ? "transform rotate-180" : ""
                        } w-5 h-5 text-indigo-500`}
                      />
                    </DisclosureButton>
                    <DisclosurePanel className="px-4 pt-4 pb-2 text-gray-500 dark:text-gray-300">
                      {t(`${item}.answer`)}
                    </DisclosurePanel>
                  </>
                )}
              </Disclosure>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
