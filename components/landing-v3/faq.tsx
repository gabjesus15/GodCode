"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LANDING_FAQ } from "@/lib/landing/faq";

export function Faq() {
  return (
    <section id="faq" className="v3-section-dark scroll-mt-24 py-16 md:py-24">
      <div className="v3-container">
        <div className="mb-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="v3-label mb-4">{"// "}PREGUNTAS</p>
            <h2 className="font-display text-5xl tracking-wide text-[#f4f4f5] md:text-6xl lg:text-7xl">
              Preguntas <span className="text-[#4f5bff]">frecuentes</span>
            </h2>
          </div>
        </div>

        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {LANDING_FAQ.map((faq, i) => (
              <AccordionItem
                key={faq.question}
                value={`item-${i}`}
                className="border-t-0 border-b border-[rgba(244,244,245,0.12)]"
              >
                <AccordionTrigger className="px-0 py-6 text-lg font-semibold text-[#f4f4f5] hover:bg-transparent hover:text-[#4f5bff] dark:hover:bg-transparent">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6 text-base leading-relaxed text-[#a1a1aa]">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
