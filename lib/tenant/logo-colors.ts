/**
 * Colores de marca sacados del logo, para proponerlos en «Configura tu tienda».
 *
 * Puro: recibe los píxeles RGBA (de un `<canvas>` en el navegador) y devuelve hasta tres
 * colores en hex, del más presente al menos. Ignora el fondo transparente, los casi
 * blancos, los casi negros y los grises: un logo negro sobre blanco no propone nada.
 */

type Rgb = { r: number; g: number; b: number };

const BUCKET = 24;

function toHex({ r, g, b }: Rgb): string {
	return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string): Rgb | null {
	const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
	return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function saturationAndLightness({ r, g, b }: Rgb): { s: number; l: number } {
	const max = Math.max(r, g, b) / 255;
	const min = Math.min(r, g, b) / 255;
	const l = (max + min) / 2;
	const d = max - min;
	const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
	return { s, l };
}

function distance(a: Rgb, b: Rgb): number {
	return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function pickBrandColors(pixels: Uint8ClampedArray | number[], max = 3): string[] {
	const buckets = new Map<string, { sum: Rgb; count: number }>();
	const total = Math.floor(pixels.length / 4);
	// Basta una muestra: un logo de 512×512 tiene 260 mil píxeles.
	const step = Math.max(1, Math.floor(total / 20_000));
	for (let i = 0; i < total; i += step) {
		const o = i * 4;
		if (pixels[o + 3] < 128) continue;
		const rgb = { r: pixels[o], g: pixels[o + 1], b: pixels[o + 2] };
		const { s, l } = saturationAndLightness(rgb);
		if (l > 0.92 || l < 0.08 || s < 0.2) continue;
		const key = `${Math.floor(rgb.r / BUCKET)}-${Math.floor(rgb.g / BUCKET)}-${Math.floor(rgb.b / BUCKET)}`;
		const bucket = buckets.get(key) ?? { sum: { r: 0, g: 0, b: 0 }, count: 0 };
		bucket.sum.r += rgb.r;
		bucket.sum.g += rgb.g;
		bucket.sum.b += rgb.b;
		bucket.count += 1;
		buckets.set(key, bucket);
	}

	const sampled = Math.ceil(total / step);
	const ranked = [...buckets.values()]
		// Un color que ocupa menos del 1 % de la muestra suele ser borde o antialias.
		.filter((bucket) => bucket.count >= Math.max(2, sampled * 0.01))
		.map((bucket) => ({
			color: { r: bucket.sum.r / bucket.count, g: bucket.sum.g / bucket.count, b: bucket.sum.b / bucket.count },
			count: bucket.count,
		}))
		.sort((a, b) => b.count - a.count);

	const picked: Rgb[] = [];
	for (const { color } of ranked) {
		if (picked.every((other) => distance(other, color) > 70)) picked.push(color);
		if (picked.length >= max) break;
	}
	return picked.map(toHex);
}

/** El mismo color más oscuro (`amount` < 0) o más claro (> 0), para el hover de los botones. */
export function shadeHex(hex: string, amount: number): string {
	const rgb = hexToRgb(hex);
	if (!rgb) return hex;
	const target = amount < 0 ? 0 : 255;
	const t = Math.min(1, Math.abs(amount));
	return toHex({ r: rgb.r + (target - rgb.r) * t, g: rgb.g + (target - rgb.g) * t, b: rgb.b + (target - rgb.b) * t });
}

function luminance({ r, g, b }: Rgb): number {
	const [lr, lg, lb] = [r, g, b].map((v) => {
		const c = v / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/**
 * Los botones del menú con el color de la marca. Llevan texto blanco, así que un color
 * claro (un amarillo, por ejemplo) se oscurece lo justo para que el texto se lea.
 */
export function brandButtonColors(hex: string): { primaryColor: string; hoverColor: string } | null {
	if (!hexToRgb(hex)) return null;
	let primary = hex.toLowerCase();
	for (let i = 0; i < 12; i++) {
		const rgb = hexToRgb(primary);
		if (!rgb || 1.05 / (luminance(rgb) + 0.05) >= 4.5) break;
		primary = shadeHex(primary, -0.08);
	}
	return { primaryColor: primary, hoverColor: shadeHex(primary, -0.12) };
}

/**
 * El color del logo que mejor queda en los botones: el más presente entre los que ya se
 * leen con texto blanco (contraste ≥ 3). Así un logo rojo y amarillo propone el rojo, no un
 * amarillo oscurecido hasta quedar café. Si ninguno sirve, el más presente.
 */
export function pickButtonColor(colors: string[]): string | null {
	const readable = colors.find((hex) => {
		const rgb = hexToRgb(hex);
		return rgb != null && 1.05 / (luminance(rgb) + 0.05) >= 3;
	});
	return readable ?? colors[0] ?? null;
}
