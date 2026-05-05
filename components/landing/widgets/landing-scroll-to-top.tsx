"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp } from "lucide-react";

const PAGINATOR_SECTION_IDS = [
  "inicio",
  "funciones",
  "como-funciona",
  "producto",
  "demo",
  "comparar",
  "testimonios",
  "precios",
  "faq",
  "contacto",
] as const;

const NAV_OFFSET_PX = 72;

function getSectionScrollTargetY(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const sectionTop = rect.top + window.scrollY;
  const sectionHeight = rect.height;
  const viewportHeight = window.innerHeight;
  const isFullscreenLike = sectionHeight >= viewportHeight * 0.88;

  // Tall/full-screen sections look better when their center aligns to the viewport center.
  const rawTarget = isFullscreenLike
    ? sectionTop + sectionHeight / 2 - viewportHeight / 2
    : sectionTop - NAV_OFFSET_PX;

  const maxScrollY = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
  return Math.min(maxScrollY, Math.max(0, rawTarget));
}

export function LandingScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [sectionEls, setSectionEls] = useState<HTMLElement[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const collectSections = () => {
      const els = PAGINATOR_SECTION_IDS
        .map((id) => document.getElementById(id))
        .filter(Boolean) as HTMLElement[];
      setSectionEls(els);
    };

    collectSections();
    window.addEventListener("resize", collectSections);
    return () => window.removeEventListener("resize", collectSections);
  }, []);

  useEffect(() => {
    if (sectionEls.length === 0) return;

    const onScroll = () => {
      setVisible(window.scrollY > 120);

      const viewportCenter = window.innerHeight / 2;
      let closestIndex = 0;
      let minDistance = Number.POSITIVE_INFINITY;

      for (let i = 0; i < sectionEls.length; i += 1) {
        const rect = sectionEls[i].getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const dist = Math.abs(sectionCenter - viewportCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = i;
        }
      }

      setActiveIndex(closestIndex);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sectionEls]);

  const goToSection = (nextIndex: number) => {
    if (sectionEls.length === 0) return;
    const clamped = Math.min(sectionEls.length - 1, Math.max(0, nextIndex));
    const targetEl = sectionEls[clamped];
    if (!targetEl) return;
    const targetY = getSectionScrollTargetY(targetEl);
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  const progressRatio = sectionEls.length > 1 ? activeIndex / (sectionEls.length - 1) : 0;
  const canGoNext = activeIndex < sectionEls.length - 1;
  const actionLabel = canGoNext ? "Ir a la siguiente sección" : "Volver al inicio";
  const onAction = () => {
    if (canGoNext) {
      goToSection(activeIndex + 1);
      return;
    }
    goToSection(0);
  };

  return (
    <AnimatePresence>
      {visible && sectionEls.length > 0 && (
        <motion.div
          className="fixed bottom-6 left-6 z-40 sm:bottom-8 sm:left-8"
          initial={{ opacity: 0, scale: 0.88, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 12 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label={actionLabel}
            onClick={onAction}
            className="group relative grid h-12 w-12 place-items-center rounded-full text-white shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
          >
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden>
              <circle cx="24" cy="24" r="21" className="fill-none stroke-slate-400/40" strokeWidth="2.5" />
              <motion.circle
                cx="24"
                cy="24"
                r="21"
                className="fill-none stroke-indigo-500"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={false}
                animate={{ pathLength: progressRatio }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                pathLength={1}
              />
            </svg>
            <span className="absolute inset-[3px] rounded-full bg-slate-900/85 backdrop-blur transition-colors group-hover:bg-indigo-600" aria-hidden />
            {canGoNext ? <ArrowDown className="relative h-4 w-4" aria-hidden /> : <ArrowUp className="relative h-4 w-4" aria-hidden />}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
