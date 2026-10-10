import { Check } from "lucide-react";

import { cn } from "@/utils/cn";

/**
 * La línea de garantías del hero (`lib/landing/hero-assurances`). Cada frase va entera con su
 * check delante: si la línea se parte (teléfono, columna angosta de las páginas de país), la
 * siguiente empieza con un check y no con un punto medio suelto.
 */
export function HeroAssurances({ items, className }: { items: string[]; className?: string }) {
	return (
		<ul className={cn("flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-start", className)}>
			{items.map((item) => (
				<li key={item} className="inline-flex items-center gap-1.5 whitespace-nowrap">
					<Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-[#4f5bff]" strokeWidth={2.5} />
					{item}
				</li>
			))}
		</ul>
	);
}
