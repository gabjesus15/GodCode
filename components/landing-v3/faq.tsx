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
    <section id="faq" className="v3-section-dark py-24 md:py-32">
      <div className="v3-container grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <h2
          data-reveal
          className="font-display text-5xl leading-[0.95] text-[#f4f4f5] md:text-6xl lg:sticky lg:top-28 lg:self-start"
        >
          Preguntas frecuentes
        </h2>

        <div data-reveal>
          <Accordion type="single" collapsible className="w-full">
            {LANDING_FAQ.map((faq, i) => (
              <AccordionItem
                key={faq.question}
                value={`item-${i}`}
                className="border-t-0 border-b border-white/[0.08]"
              >
                <AccordionTrigger className="px-0 py-6 text-left text-lg font-medium text-[#e4e4e7] hover:bg-transparent hover:text-white dark:hover:bg-transparent">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-6 max-w-2xl text-base leading-relaxed text-[#a1a1aa] text-pretty">
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
