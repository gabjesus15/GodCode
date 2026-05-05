"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyFieldButton({
	value,
	label,
	className = "",
}: {
	value: string;
	label: string;
	className?: string;
}) {
	const [done, setDone] = useState(false);

	const onClick = async () => {
		if (!value) return;
		try {
			await navigator.clipboard.writeText(value);
			setDone(true);
			window.setTimeout(() => setDone(false), 1800);
		} catch {
		}
	};

	return (
		<button
			type="button"
			onClick={() => void onClick()}
			disabled={!value}
			title={`Copiar ${label}`}
			aria-label={`Copiar ${label}`}
			className={`inline-flex h-7 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-600 shadow-sm hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 ${className}`}
		>
			{done ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
			<span className="max-w-[4.5rem] truncate">{done ? "Copiado" : label}</span>
		</button>
	);
}
