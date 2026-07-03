import dynamic from "next/dynamic";
import type { ComponentType } from "react";

type LoaderModule<P> = { default: ComponentType<P> } | Record<string, ComponentType<P>>;

export function createClientDynamic<P = Record<string, never>>(
	loader: () => Promise<LoaderModule<P>>,
	exportName?: string,
) {
	return dynamic(
		() =>
			loader().then((mod) => {
				const component = exportName
					? (mod as Record<string, ComponentType<P>>)[exportName]
					: (mod as { default: ComponentType<P> }).default;
				return { default: component };
			}),
		{ ssr: false },
	);
}
