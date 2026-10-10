"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";

type Piece = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	w: number;
	h: number;
	/** Giro en el plano y volteo (el papel muestra su canto al girar). */
	angle: number;
	spin: number;
	flip: number;
	flipSpeed: number;
	front: string;
	back: string;
	life: number;
	ttl: number;
};

const GRAVITY = 0.32;
const DRAG = 0.985;
const DURATION_MS = 3600;

const subscribeNothing = () => () => {};

/** Mezcla un hex con blanco (t > 0) o con negro (t < 0). */
function shade(hex: string, t: number): string {
	const clean = hex.replace("#", "");
	const full = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean.padEnd(6, "0");
	const target = t > 0 ? 255 : 0;
	const mix = (offset: number) => {
		const value = parseInt(full.slice(offset, offset + 2), 16);
		return Math.round(value + (target - value) * Math.abs(t));
	};
	return `rgb(${mix(0)}, ${mix(2)}, ${mix(4)})`;
}

function seeded(seed: number) {
	let s = seed;
	return () => {
		s = (s * 16807) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

/**
 * Una sola ráfaga de papel al publicar: dos cañones desde las esquinas de abajo, con
 * gravedad, roce del aire y volteo (cada papel tiene cara y revés). Paleta corta: el color
 * de la marca, un tono claro de él, dorado y tinta. Se dibuja en un canvas que se quita
 * solo al terminar; con «reducir movimiento» no se dibuja.
 */
export function ConfettiBurst({ accent: rawAccent, count = 140 }: { accent: string; count?: number }) {
	const accent = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(rawAccent) ? rawAccent : "#4F5BFF";
	const reduce = useReducedMotion();
	// El canvas va en un portal y solo existe en el navegador: en el servidor y al hidratar no hay.
	const inBrowser = useSyncExternalStore(subscribeNothing, () => true, () => false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [done, setDone] = useState(false);

	useEffect(() => {
		// Al hidratar, el canvas aparece recién en el segundo render: por eso `inBrowser` va en las dependencias.
		if (reduce || !inBrowser) return;
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const width = window.innerWidth;
		const height = window.innerHeight;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		ctx.scale(dpr, dpr);

		// Sin grises claros: sobre el fondo del asistente (#f6f6f8) no se ven.
		const palette: Array<[string, string]> = [
			[accent, shade(accent, -0.25)],
			[shade(accent, 0.45), shade(accent, 0.2)],
			["#E3B341", "#B98A1F"],
			["#1D1D1F", "#3A3A3F"],
		];
		const rand = seeded(7);
		const scale = Math.min(1, width / 900) * 0.35 + 0.65;
		// En el teléfono, la mitad de papeles: la misma fiesta sin tapar el QR.
		const total = Math.round(count * Math.min(1, Math.max(0.5, width / 1200)));
		const pieces: Piece[] = Array.from({ length: total }, (_, index) => {
			const fromLeft = index % 2 === 0;
			// Cada cañón apunta hacia arriba y hacia el centro, con algo de abanico.
			const spread = (rand() - 0.5) * 0.55;
			const aim = fromLeft ? -Math.PI / 3 + spread : (-2 * Math.PI) / 3 + spread;
			const speed = (17 + rand() * 12) * scale * Math.sqrt(height / 800);
			const [front, back] = palette[Math.floor(rand() * palette.length)];
			const ribbon = rand() < 0.25;
			return {
				x: fromLeft ? -10 : width + 10,
				y: height * 0.82,
				vx: Math.cos(aim) * speed,
				vy: Math.sin(aim) * speed,
				w: ribbon ? 4 : 7 + rand() * 4,
				h: ribbon ? 14 + rand() * 6 : 4 + rand() * 3,
				angle: rand() * Math.PI * 2,
				spin: (rand() - 0.5) * 0.18,
				flip: rand() * Math.PI * 2,
				flipSpeed: 0.08 + rand() * 0.12,
				front,
				back,
				// Salen escalonados en ~250 ms, como dos disparos y no un bloque.
				life: -Math.floor(rand() * 15),
				ttl: 150 + rand() * 60,
			};
		});

		let frame = 0;
		let last = performance.now();
		const started = last;
		const tick = (now: number) => {
			const dt = Math.min(2, (now - last) / 16.67);
			last = now;
			ctx.clearRect(0, 0, width, height);
			let alive = 0;
			for (const p of pieces) {
				p.life += dt;
				if (p.life < 0 || p.life > p.ttl) continue;
				alive += 1;
				p.vx *= Math.pow(DRAG, dt);
				p.vy = p.vy * Math.pow(DRAG, dt) + GRAVITY * dt;
				// El aire lo frena: al caer se mece de lado a lado.
				p.x += (p.vx + Math.sin(p.flip) * 0.6) * dt;
				p.y += Math.min(p.vy, 5.5) * dt;
				p.angle += p.spin * dt;
				p.flip += p.flipSpeed * dt;
				const facing = Math.cos(p.flip);
				const fade = p.life > p.ttl - 30 ? (p.ttl - p.life) / 30 : 1;
				ctx.save();
				ctx.globalAlpha = Math.max(0, fade);
				ctx.translate(p.x, p.y);
				ctx.rotate(p.angle);
				ctx.scale(1, Math.max(0.08, Math.abs(facing)));
				ctx.fillStyle = facing >= 0 ? p.front : p.back;
				// fillRect y no roundRect: Safari < 16 (iOS 15) no lo tiene y a este tamaño la esquina no se nota.
				ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
				ctx.restore();
			}
			if (alive > 0 || now - started < 400) {
				frame = requestAnimationFrame(tick);
			} else {
				setDone(true);
			}
		};
		const timer = window.setTimeout(() => {
			last = performance.now();
			frame = requestAnimationFrame(tick);
		}, 180);
		const safety = window.setTimeout(() => setDone(true), DURATION_MS + 1500);
		return () => {
			window.clearTimeout(timer);
			window.clearTimeout(safety);
			cancelAnimationFrame(frame);
		};
	}, [accent, count, reduce, inBrowser]);

	if (reduce || done || !inBrowser) return null;
	// Al body: dentro del paso que entra (lleva `transform`), el `fixed` quedaría atado a la
	// columna y los primeros fotogramas saldrían aplastados.
	return createPortal(<canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50 h-full w-full" aria-hidden />, document.body);
}
