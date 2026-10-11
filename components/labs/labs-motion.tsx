"use client";

import { useEffect } from "react";

/**
 * Movimiento al hacer scroll en la home de Labs.
 *
 * - Cada `.labs-reveal` entra una sola vez, cuando llega a la pantalla, con un escalonado por
 *   fila (`labs-stagger-N`); los iconos de la frase grande (`.labs-pop`) saltan después. Antes
 *   iba con `animation-timeline: view()`, que solo existe en Chrome y Edge: en Safari y Firefox
 *   no se movía nada, y donde sí, la entrada quedaba pegada al scroll en vez de terminar sola.
 * - Lo que ya está a la vista al cargar se marca antes de ocultar nada: nada parpadea.
 * - Sin JavaScript o con «reducir movimiento», todo se ve fijo y completo (los estilos de
 *   labs.css solo ocultan bajo `.labs-motion`).
 * - La barra de avance de la tira de servicios sigue el desplazamiento horizontal; donde no hay
 *   `scroll-timeline` en CSS, la mueve este mismo efecto.
 */
export function LabsMotion() {
	useEffect(() => {
		const root = document.querySelector<HTMLElement>(".labs-root");
		if (!root) return;
		const cleanups: Array<() => void> = [];

		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (!reduced && "IntersectionObserver" in window) {
			const targets = Array.from(root.querySelectorAll<HTMLElement>(".labs-reveal, .labs-pop"));
			const fold = window.innerHeight * 0.92;
			for (const target of targets) {
				if (target.getBoundingClientRect().top < fold) target.classList.add("is-in");
			}
			const observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (!entry.isIntersecting) continue;
						entry.target.classList.add("is-in");
						observer.unobserve(entry.target);
					}
				},
				{ rootMargin: "0px 0px -8% 0px" },
			);
			for (const target of targets) {
				if (!target.classList.contains("is-in")) observer.observe(target);
			}
			root.classList.add("labs-motion");
			cleanups.push(() => observer.disconnect());
		}

		const supportsScrollTimeline = typeof CSS !== "undefined" && CSS.supports("scroll-timeline-name: --labs-track");
		if (!reduced && !supportsScrollTimeline) {
			for (const track of Array.from(root.querySelectorAll<HTMLElement>(".labs-track"))) {
				const bar = track.closest(".labs-track-scope")?.querySelector<HTMLElement>(".labs-progress");
				if (!bar) continue;
				const update = () => {
					const max = track.scrollWidth - track.clientWidth;
					const progress = max > 0 ? track.scrollLeft / max : 1;
					bar.style.transform = `scaleX(${0.16 + 0.84 * progress})`;
				};
				update();
				track.addEventListener("scroll", update, { passive: true });
				window.addEventListener("resize", update);
				cleanups.push(() => {
					track.removeEventListener("scroll", update);
					window.removeEventListener("resize", update);
				});
			}
		}

		return () => {
			for (const cleanup of cleanups) cleanup();
		};
	}, []);

	return null;
}
