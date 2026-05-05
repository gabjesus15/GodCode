import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";

interface MetricCardProps {
	label: string;
	value: string;
	helper?: string;
	href?: string;
}

export default function MetricCard({ label, value, helper, href }: MetricCardProps) {
	const inner = (
		<Card
			className={cn(
				"flex h-full min-h-0 min-w-0 flex-col gap-2 p-4 sm:gap-3 sm:p-5",
				href &&
					"transition hover:border-indigo-200/80 hover:shadow-md dark:hover:border-indigo-800/50",
			)}
		>
			<p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{label}</p>
			<div className="min-w-0 truncate text-2xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
				{value}
			</div>
			{helper ? (
				<p className="mt-auto min-w-0 text-sm leading-snug text-zinc-500 dark:text-zinc-400">{helper}</p>
			) : null}
		</Card>
	);

	if (href) {
		return (
			<Link
				href={href}
				className="block h-full min-w-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
			>
				{inner}
			</Link>
		);
	}

	return inner;
}
