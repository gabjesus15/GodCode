"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";

/** AutoAnimate para listas dinámicas (filtros, CRUD, threads). No usar en tablas estáticas ni charts. */
export function useSaasListAnimate<T extends HTMLElement = HTMLDivElement>() {
  return useAutoAnimate<T>({
    duration: 220,
    easing: "ease-out",
  });
}
