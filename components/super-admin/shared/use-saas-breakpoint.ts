"use client";

import { useEffect, useState } from "react";

const LG_BREAKPOINT = 1024;

/** `true` cuando viewport >= lg (1024px). Patrón drawer-vs-panel en tickets, onboarding, salud-pagos. */
export function useSaasBreakpoint(breakpoint = LG_BREAKPOINT) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return { isDesktop, isMobile: !isDesktop };
}
