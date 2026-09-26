"use client";

import type { ReactNode } from "react";

/** Interruptor accesible (role="switch") con su etiqueta visible. */
export function Switch({
	checked,
	onChange,
	label,
	disabled,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onChange(!checked)}
			disabled={disabled}
			className="group inline-flex items-center gap-2 rounded-full text-xs font-medium text-[#6e6e73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
		>
			<span>{label}</span>
			<span
				className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-indigo-600" : "bg-[#d2d2d7]"}`}
				aria-hidden
			>
				<span
					className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
						checked ? "translate-x-[18px]" : "translate-x-0.5"
					}`}
				/>
			</span>
		</button>
	);
}

/** Grupo de opciones excluyentes en tarjetas (portada, estilo, forma). */
export function OptionCards<T extends string>({
	label,
	value,
	options,
	onChange,
	disabled,
	columns = 3,
}: {
	label: string;
	value: T;
	options: Array<{ value: T; title: string; hint?: string; visual?: ReactNode; disabled?: boolean }>;
	onChange: (value: T) => void;
	disabled?: boolean;
	columns?: 2 | 3 | 4;
}) {
	const grid = columns === 4 ? "grid-cols-2 sm:grid-cols-4" : columns === 2 ? "grid-cols-2" : "grid-cols-3";
	return (
		<div role="radiogroup" aria-label={label} className={`grid gap-2 ${grid}`}>
			{options.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						role="radio"
						aria-checked={active}
						disabled={disabled || option.disabled}
						onClick={() => onChange(option.value)}
						className={`flex min-w-0 flex-col items-stretch gap-2 rounded-xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-45 ${
							active ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600" : "border-[#e5e5ea] bg-white hover:border-[#c7c7cc]"
						}`}
					>
						{option.visual ? <span className="block overflow-hidden rounded-lg">{option.visual}</span> : null}
						<span className="px-0.5">
							<span className="block text-xs font-semibold text-[#1d1d1f]">{option.title}</span>
							{option.hint ? <span className="mt-0.5 block text-[11px] leading-snug text-[#6e6e73]">{option.hint}</span> : null}
						</span>
					</button>
				);
			})}
		</div>
	);
}

/** Bloque del editor: título, ayuda y contenido. */
export function EditorSection({
	id,
	title,
	description,
	aside,
	children,
}: {
	id?: string;
	title: string;
	description?: string;
	aside?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section id={id} className="scroll-mt-24 rounded-2xl border border-[#e5e5ea] bg-white p-4 shadow-sm shadow-indigo-500/[0.03] sm:p-5">
			<div className="mb-4 flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h3 className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">{title}</h3>
					{description ? <p className="mt-1 text-[13px] leading-relaxed text-[#6e6e73]">{description}</p> : null}
				</div>
				{aside ? <div className="shrink-0">{aside}</div> : null}
			</div>
			{children}
		</section>
	);
}
