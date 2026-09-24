import { cn } from "@/utils/cn";

const WIDTH = 72;
const HEIGHT = 24;
const PAD = 3;

/** Curva suave (Catmull-Rom a Bézier) que pasa por todos los puntos. */
function smoothPath(points: Array<[number, number]>): string {
	if (points.length === 0) return "";
	if (points.length === 1) return `M${points[0][0]},${points[0][1]}`;
	let d = `M${points[0][0]},${points[0][1]}`;
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[i - 1] ?? points[i];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[i + 2] ?? p2;
		const c1x = p1[0] + (p2[0] - p0[0]) / 6;
		const c1y = p1[1] + (p2[1] - p0[1]) / 6;
		const c2x = p2[0] - (p3[0] - p1[0]) / 6;
		const c2y = p2[1] - (p3[1] - p1[1]) / 6;
		d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
	}
	return d;
}

export function HomeSparkline({ values, className }: { values: number[]; className?: string }) {
	const data = values.length > 0 ? values : [0, 0];
	const max = Math.max(...data);
	const min = Math.min(...data);
	const range = max - min;
	const step = (WIDTH - PAD * 2) / Math.max(1, data.length - 1);
	const points: Array<[number, number]> = data.map((v, i) => [
		PAD + i * step,
		// Sin variación la línea queda abajo, plana: "no pasó nada" en vez de un salto falso.
		range === 0 ? HEIGHT - PAD : HEIGHT - PAD - ((v - min) / range) * (HEIGHT - PAD * 2),
	]);
	const last = points[points.length - 1];

	return (
		<svg
			viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			width={WIDTH}
			height={HEIGHT}
			className={cn("shrink-0 overflow-visible", className)}
			aria-hidden
		>
			<path d={smoothPath(points)} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
			<circle cx={last[0]} cy={last[1]} r={2.5} className="fill-white dark:fill-zinc-900" stroke="currentColor" strokeWidth={1.5} />
		</svg>
	);
}
