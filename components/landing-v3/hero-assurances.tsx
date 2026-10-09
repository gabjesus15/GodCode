import { Fragment } from "react";

/**
 * La línea de garantías del hero (`lib/landing/hero-assurances`): cada frase va
 * entera con su punto medio, así en el teléfono la línea se parte solo entre frases.
 */
export function HeroAssurances({ items, className }: { items: string[]; className?: string }) {
	return (
		<p className={className}>
			{items.map((item, index) => (
				<Fragment key={item}>
					{index > 0 ? " " : null}
					<span className="whitespace-nowrap">
						{index > 0 ? (
							<span aria-hidden className="ml-1 mr-2">
								·
							</span>
						) : null}
						{item}
					</span>
				</Fragment>
			))}
		</p>
	);
}
