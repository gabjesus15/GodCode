"use client";

import { useEffect, useRef } from "react";

/**
 * Publica la altura real del header del menu en `--menu-header-measured`.
 *
 * El header es `position: fixed`, asi que no ocupa sitio en el flujo: debajo va
 * un `.menu-spacer` que tiene que medir exactamente lo mismo. Esa altura estaba
 * escrita a mano, y no una vez sino once: cuatro valores de
 * `--menu-header-height` por breakpoint, dos alturas de spacer por tipo de
 * navbar y seis `scroll-margin-top` de seccion.
 *
 * Ninguno podia acertar, porque la altura del header depende de los DATOS del
 * tenant: la tira de categorias lleva el nombre bajo el circulo con un clamp de
 * tres lineas, asi que un tenant con nombres cortos hace un header de una linea
 * y otro con nombres largos lo hace de tres. Medido en un tenant real el header
 * salia a 203px contra los 168px que declaraba el spacer: 35px de contenido
 * —el titulo de la primera categoria— quedaban tapados por debajo de la barra
 * nada mas cargar, y lo mismo le pasaba a cada ancla de categoria al saltar.
 *
 * Aqui se mide y se publica. Los valores de CSS se quedan como respaldo para el
 * primer pintado, antes de que hidrate.
 */
export function useMenuHeaderHeight<T extends HTMLElement>() {
	const ref = useRef<T | null>(null);

	useEffect(() => {
		const header = ref.current;
		if (!header || typeof ResizeObserver === "undefined") return;

		const root = header.ownerDocument.documentElement;
		let ultima = -1;

		const publicar = () => {
			// `contentRect` deja fuera padding y borde, que aqui si cuentan: lo que
			// tapa al contenido es la caja entera.
			const alto = Math.round(header.getBoundingClientRect().height);
			if (alto === ultima || alto === 0) return;
			ultima = alto;
			root.style.setProperty("--menu-header-measured", `${alto}px`);
		};

		publicar();
		const observer = new ResizeObserver(publicar);
		observer.observe(header);

		return () => {
			observer.disconnect();
			root.style.removeProperty("--menu-header-measured");
		};
	}, []);

	return ref;
}
