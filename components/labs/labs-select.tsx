"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/utils/cn";

export type LabsSelectOption = { value: string; label: string };

type LabsSelectProps = {
	id: string;
	name: string;
	/** Id del `<label>` del campo: nombra también a la lista. */
	labelId: string;
	options: readonly LabsSelectOption[];
	/** Lo que se ve mientras no hay nada elegido y ninguna opción vale "" («Elige una opción»). */
	placeholder?: string;
	defaultValue?: string;
	invalid?: boolean;
	describedBy?: string;
	onValueChange?: (value: string) => void;
};

/** Alto aproximado de la lista abierta, para decidir si cabe hacia abajo. */
const OPTION_HEIGHT = 44;
const LIST_MAX = 288;

/** Para buscar escribiendo: «sistema» encuentra «Sistema a medida» aunque se escriba sin tilde. */
const fold = (text: string) =>
	text
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase();

/**
 * Selector del formulario de Labs. El `<select>` nativo abre la lista del sistema (gris, cuadrada y
 * con otra letra); este la dibuja con el estilo de la página y la anima al abrir.
 *
 * Es un combobox de solo selección (patrón de WAI-ARIA): el foco se queda en el botón y la opción
 * activa se anuncia con `aria-activedescendant`. Teclado: flechas, Inicio, Fin, Re Pág y Av Pág,
 * Enter o Espacio para elegir, Escape para cerrar, Tab elige y sigue, y escribir salta a la opción
 * que empieza así. El valor viaja en un input oculto con el mismo `name`: el formulario lo sigue
 * leyendo con FormData y vuelve al valor inicial con `form.reset()`.
 */
export function LabsSelect({
	id,
	name,
	labelId,
	options,
	placeholder,
	defaultValue = "",
	invalid,
	describedBy,
	onValueChange,
}: LabsSelectProps) {
	const listId = useId();
	const [value, setValue] = useState(defaultValue);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const [dropUp, setDropUp] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const typed = useRef({ text: "", at: 0 });

	const selectedIndex = options.findIndex((option) => option.value === value);
	const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
	const last = options.length - 1;
	const optionId = (index: number) => `${listId}-${index}`;

	// Cerrar al tocar fuera.
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: PointerEvent) => {
			if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [open]);

	// La opción activa siempre a la vista dentro de la lista.
	useEffect(() => {
		if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
	}, [open, active, listId]);

	// `form.reset()` no toca un input oculto controlado por React: se escucha y se vuelve al inicial.
	useEffect(() => {
		const form = buttonRef.current?.form;
		if (!form) return;
		const onReset = () => setValue(defaultValue);
		form.addEventListener("reset", onReset);
		return () => form.removeEventListener("reset", onReset);
	}, [defaultValue]);

	function openList(index: number) {
		const rect = buttonRef.current?.getBoundingClientRect();
		if (rect) {
			const needed = Math.min(options.length * OPTION_HEIGHT + 12, LIST_MAX) + 16;
			const below = window.innerHeight - rect.bottom;
			setDropUp(below < needed && rect.top > below);
		}
		setActive(Math.max(0, Math.min(index, last)));
		setOpen(true);
	}

	function choose(index: number) {
		const option = options[index];
		if (!option) return;
		setOpen(false);
		if (option.value !== value) {
			setValue(option.value);
			onValueChange?.(option.value);
		}
	}

	/** Busca la opción que empieza con lo que se escribió en el último medio segundo. */
	function jumpTo(key: string) {
		const now = Date.now();
		typed.current = { text: now - typed.current.at < 500 ? typed.current.text + key : key, at: now };
		const query = fold(typed.current.text);
		const from = open ? active : selectedIndex;
		const ordered = [...options.slice(from + 1), ...options.slice(0, from + 1)];
		const match = ordered.find((option) => fold(option.label).startsWith(query));
		if (!match) return;
		const index = options.indexOf(match);
		if (open) setActive(index);
		else openList(index);
	}

	function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
		if (!open) {
			if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				openList(selectedIndex >= 0 ? selectedIndex : 0);
			} else if (event.key === "Home" || event.key === "End") {
				event.preventDefault();
				openList(event.key === "Home" ? 0 : last);
			} else if (printable) {
				event.preventDefault();
				jumpTo(event.key);
			}
			return;
		}

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				setActive((index) => Math.min(index + 1, last));
				break;
			case "ArrowUp":
				event.preventDefault();
				if (event.altKey) choose(active);
				else setActive((index) => Math.max(index - 1, 0));
				break;
			case "Home":
				event.preventDefault();
				setActive(0);
				break;
			case "End":
				event.preventDefault();
				setActive(last);
				break;
			case "PageDown":
				event.preventDefault();
				setActive((index) => Math.min(index + 10, last));
				break;
			case "PageUp":
				event.preventDefault();
				setActive((index) => Math.max(index - 10, 0));
				break;
			case "Enter":
			case " ":
				event.preventDefault();
				choose(active);
				break;
			case "Escape":
				event.preventDefault();
				setOpen(false);
				break;
			case "Tab":
				// Sin preventDefault: elige y el foco sigue al próximo campo.
				choose(active);
				break;
			default:
				if (printable) {
					event.preventDefault();
					jumpTo(event.key);
				}
		}
	}

	return (
		<div ref={wrapperRef} className="relative mt-2">
			<input type="hidden" name={name} value={value} />
			<button
				ref={buttonRef}
				id={id}
				type="button"
				role="combobox"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={listId}
				aria-activedescendant={open ? optionId(active) : undefined}
				aria-invalid={invalid || undefined}
				aria-describedby={describedBy}
				onClick={() => (open ? setOpen(false) : openList(selectedIndex >= 0 ? selectedIndex : 0))}
				onKeyDown={onKeyDown}
				onBlur={() => setOpen(false)}
				className={cn(
					"flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left text-[15px] transition-[border-color,box-shadow] duration-200 focus:outline-none",
					open
						? "border-[#4f5bff] ring-2 ring-[#4f5bff]/30"
						: "border-black/10 hover:border-black/25 focus-visible:border-[#4f5bff] focus-visible:ring-2 focus-visible:ring-[#4f5bff]/30",
					invalid && !open && "border-red-400",
				)}
			>
				<span className={cn("truncate", selected ? "text-[#1d1d1f]" : "text-[#9a9aa0]")}>
					{selected ? selected.label : placeholder}
				</span>
				<ChevronDown
					className={cn(
						"h-4 w-4 shrink-0 transition-[rotate,color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
						open ? "rotate-180 text-[#4f5bff]" : "text-[#6b6b76]",
					)}
					aria-hidden
				/>
			</button>
			<ul
				id={listId}
				role="listbox"
				aria-labelledby={labelId}
				tabIndex={-1}
				data-open={open || undefined}
				data-up={dropUp || undefined}
				// El foco se queda en el botón: sin esto, el clic en una opción lo cerraría por blur.
				onMouseDown={(event) => event.preventDefault()}
				// Al menos tan ancha como el campo y, si hace falta, tanto como la opción más larga: así no se parte en dos líneas.
				className="labs-select-list absolute left-0 z-40 max-h-72 w-max min-w-full max-w-[min(28rem,calc(100vw-4rem))] overflow-y-auto overscroll-contain rounded-2xl border border-black/[0.08] bg-white p-1.5 shadow-[0_28px_60px_-24px_rgba(20,8,90,0.45)]"
			>
				{options.map((option, index) => {
					const isSelected = option.value === value;
					return (
						<li
							key={option.value || "sin-valor"}
							id={optionId(index)}
							role="option"
							aria-selected={isSelected}
							onMouseMove={() => setActive(index)}
							onClick={() => choose(index)}
							className={cn(
								"flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors duration-150",
								index === active ? "bg-[#f1f0ff] text-[#15151a]" : "text-[#3a3a44]",
								isSelected && "font-semibold text-[#4f5bff]",
							)}
						>
							<span>{option.label}</span>
							<Check
								className={cn(
									"h-4 w-4 shrink-0 transition-[opacity,scale] duration-200",
									isSelected ? "scale-100 opacity-100" : "scale-50 opacity-0",
								)}
								strokeWidth={2.5}
								aria-hidden
							/>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
