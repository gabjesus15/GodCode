"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/utils/cn";

export type LandingProductSlide = {
  title: string;
  sub: string;
  content?: ReactNode;
  /** @deprecated use content instead */
  from?: string;
  /** @deprecated use content instead */
  to?: string;
};

export function LandingProductCarousel({ slides }: { slides: LandingProductSlide[] }) {
  const safeSlides = slides ?? [];
  const multi = safeSlides.length > 1;

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: multi, align: "start", duration: 20 }, []);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (safeSlides.length === 0) return null;

  return (
    <div className="mt-8 sm:mt-14" role="region" aria-roledescription="carousel" aria-label="Capturas del producto" suppressHydrationWarning>
      <div className="relative" aria-live="polite">
        {multi ? (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="Anterior"
              className="absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200/70 bg-white/80 p-2 text-slate-700 shadow-sm backdrop-blur ring-1 ring-slate-200/60 sm:inline-flex dark:border-zinc-800/70 dark:bg-zinc-950/60 dark:text-zinc-100 dark:ring-zinc-800/60"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label="Siguiente"
              className="absolute right-0 top-1/2 z-10 hidden translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200/70 bg-white/80 p-2 text-slate-700 shadow-sm backdrop-blur ring-1 ring-slate-200/60 sm:inline-flex dark:border-zinc-800/70 dark:bg-zinc-950/60 dark:text-zinc-100 dark:ring-zinc-800/60"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur sm:rounded-3xl dark:border-zinc-800/70 dark:bg-zinc-950/20" ref={emblaRef}>
          <div className="flex gap-3 p-3 sm:gap-5 sm:p-5 lg:gap-6 lg:p-6">
            {safeSlides.map((s, i) => (
              <div
                key={`${s.title}-${i}`}
                className="min-w-0 flex-[0_0_80%] sm:flex-[0_0_360px] lg:flex-[0_0_420px]"
                aria-label={`Slide ${i + 1}`}
              >
                <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition hover:shadow-[0_18px_60px_-30px_rgba(79,70,229,0.25)] sm:rounded-3xl dark:border-zinc-800/70 dark:bg-zinc-900/60">
                  {s.content ? (
                    <div className="flex h-36 items-center justify-center bg-slate-50 p-4 sm:h-48 sm:p-6 dark:bg-zinc-900/40">
                      {s.content}
                    </div>
                  ) : (
                    <div className={cn("h-36 bg-gradient-to-br sm:h-48", s.from, s.to)} />
                  )}
                  <div className="p-4 sm:p-6">
                    <p className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">{s.title}</p>
                    <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-zinc-400">{s.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {multi ? (
        <div className="mt-6 flex items-center justify-center gap-2">
          {safeSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Ir al slide ${i + 1}`}
              aria-current={i === selectedIndex ? "true" : undefined}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition",
                i === selectedIndex
                  ? "bg-indigo-600"
                  : "bg-slate-300 hover:bg-slate-400 dark:bg-zinc-800 dark:hover:bg-zinc-700",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
