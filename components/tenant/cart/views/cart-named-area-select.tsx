"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DeliveryNamedArea } from "@/lib/delivery/delivery-settings";
import { buildNamedAreaOptions, filterNamedAreaOptions, type NamedAreaOption } from "@/lib/delivery/named-area-options";
import { TENANT_OVERLAY_PRIORITIES } from "@/lib/tenant/config/tenant-ui-config";
import { useOverlayHistoryDepthSync, useOverlayHistoryHandler } from "@/lib/tenant/mobile/overlay-history";

/** Pantalla chica o táctil: la lista sale como hoja inferior, como en las apps. */
const SHEET_QUERY = "(max-width: 699px), (pointer: coarse)";
const subscribeSheetMode = (onChange: () => void) => {
	const media = window.matchMedia(SHEET_QUERY);
	media.addEventListener("change", onChange);
	return () => media.removeEventListener("change", onChange);
};
const readSheetMode = () => window.matchMedia(SHEET_QUERY).matches;
const readSheetModeServer = () => true;

/** Con pocas zonas el buscador estorba más de lo que ayuda. */
const SEARCH_MIN_OPTIONS = 7;
/** Arrastre hacia abajo que cierra la hoja. */
const DISMISS_DRAG_PX = 90;
/** Lo que dura la salida de la hoja (igual que en el CSS). */
const SHEET_LEAVE_MS = 220;

/**
 * Zona de reparto. En móvil, una hoja inferior con buscador, asa para cerrarla
 * arrastrando y el botón atrás del teléfono cerrándola a ella (no al carrito).
 * En computador, un desplegable con buscador y teclado.
 */
export function CartNamedAreaSelect({
	areas,
	value,
	onPick,
	formatMoney,
	currency = "CLP",
}: {
	areas: DeliveryNamedArea[];
	value: string | null;
	onPick: (id: string | null) => void;
	formatMoney: (amount: number, currency?: string) => string;
	currency?: string;
}) {
	const t = useTranslations("tenant.cart.modal.delivery");
	const sheetMode = useSyncExternalStore(subscribeSheetMode, readSheetMode, readSheetModeServer);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const [placeUp, setPlaceUp] = useState(false);
	const [popMax, setPopMax] = useState<number | null>(null);
	const [dragY, setDragY] = useState(0);
	const [dragging, setDragging] = useState(false);
	const [leaving, setLeaving] = useState(false);

	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const dragStartRef = useRef<number | null>(null);
	const leaveTimerRef = useRef<number | null>(null);
	/** La hoja quita su propia entrada del historial al cerrarse sin el gesto atrás. */
	const ownPopPendingRef = useRef(false);
	const baseId = useId();
	const listId = `${baseId}-list`;
	const titleId = `${baseId}-title`;

	const options = useMemo(() => buildNamedAreaOptions(areas), [areas]);
	const filtered = useMemo(() => filterNamedAreaOptions(options, query), [options, query]);
	const selected = value ? options.find((option) => option.id === value) : undefined;
	const showSearch = options.length >= SEARCH_MIN_OPTIONS;
	const sheetOpen = open && sheetMode;

	const finishClose = useCallback((restoreFocus: boolean) => {
		setOpen(false);
		setLeaving(false);
		setQuery("");
		setDragY(0);
		if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
	}, []);

	/** `fromHistory`: el gesto atrás ya consumió la entrada del historial. */
	const close = useCallback(
		(restoreFocus = true, fromHistory = false) => {
			if (!sheetMode) {
				finishClose(restoreFocus);
				return;
			}
			if (leaveTimerRef.current != null) return;
			if (!fromHistory) {
				// Sin esto, la entrada que abrió la hoja queda suelta y el siguiente
				// «atrás» cerraría el carrito entero.
				ownPopPendingRef.current = true;
				window.history.back();
			}
			setLeaving(true);
			leaveTimerRef.current = window.setTimeout(() => {
				leaveTimerRef.current = null;
				finishClose(restoreFocus);
			}, SHEET_LEAVE_MS);
		},
		[finishClose, sheetMode],
	);

	useEffect(
		() => () => {
			if (leaveTimerRef.current != null) window.clearTimeout(leaveTimerRef.current);
		},
		[],
	);

	const openPicker = () => {
		if (!sheetMode) {
			// Abre hacia arriba si abajo no cabe (el pie fijo del carrito taparía la lista).
			const trigger = triggerRef.current?.getBoundingClientRect();
			const scroller = rootRef.current?.closest(".cart-body")?.getBoundingClientRect();
			if (trigger && scroller) {
				const below = scroller.bottom - trigger.bottom;
				const above = trigger.top - scroller.top;
				const up = below < 300 && above > below;
				setPlaceUp(up);
				setPopMax(Math.round(Math.max(160, Math.min(340, (up ? above : below) - 14))));
			}
		}
		const selectedIndex = selected ? options.findIndex((option) => option.id === selected.id) : 0;
		setActiveIndex(Math.max(0, selectedIndex));
		setOpen(true);
	};

	const pick = (option: NamedAreaOption) => {
		onPick(option.id);
		close();
	};

	// Hoja: `<dialog>` modal (foco atrapado y fondo inerte por el propio navegador).
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (sheetOpen && !dialog.open) dialog.showModal();
		if (!sheetOpen && dialog.open) dialog.close();
	}, [sheetOpen]);

	// El gesto atrás del teléfono cierra la hoja, no el carrito entero.
	useOverlayHistoryDepthSync(sheetOpen ? 1 : 0, "cart-zone-sheet");
	useOverlayHistoryHandler({
		id: "cart-zone-sheet",
		priority: TENANT_OVERLAY_PRIORITIES.zoneSheet,
		isActive: () => sheetOpen || ownPopPendingRef.current,
		onPop: () => {
			if (ownPopPendingRef.current) {
				ownPopPendingRef.current = false;
				return true;
			}
			close(false, true);
			return true;
		},
	});

	// Con el teclado abierto la hoja sube sobre él (iOS no achica el viewport de diseño).
	useEffect(() => {
		const dialog = dialogRef.current;
		const viewport = window.visualViewport;
		if (!sheetOpen || !dialog || !viewport) return;
		const update = () => {
			const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
			dialog.style.setProperty("--zone-kb", `${Math.round(inset)}px`);
		};
		viewport.addEventListener("resize", update);
		viewport.addEventListener("scroll", update);
		return () => {
			viewport.removeEventListener("resize", update);
			viewport.removeEventListener("scroll", update);
			dialog.style.removeProperty("--zone-kb");
		};
	}, [sheetOpen]);

	// Desplegable: se cierra al tocar fuera.
	useEffect(() => {
		if (!open || sheetMode) return;
		const onDocument = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) close(false);
		};
		document.addEventListener("mousedown", onDocument);
		return () => document.removeEventListener("mousedown", onDocument);
	}, [close, open, sheetMode]);

	// La opción activa (teclado) siempre a la vista.
	useEffect(() => {
		if (!open) return;
		listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
	}, [activeIndex, open]);

	// Sin buscador (pocas zonas) el foco va a la lista, que responde igual al teclado.
	useEffect(() => {
		if (open && !sheetMode && !showSearch) listRef.current?.focus();
	}, [open, sheetMode, showSearch]);

	const onNavKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setActiveIndex((index) => Math.max(0, index - 1));
		} else if (event.key === "Home") {
			event.preventDefault();
			setActiveIndex(0);
		} else if (event.key === "End") {
			event.preventDefault();
			setActiveIndex(filtered.length - 1);
		} else if (event.key === "Enter") {
			event.preventDefault();
			const option = filtered[activeIndex];
			if (option) pick(option);
		} else if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			close();
		}
	};

	// Arrastre del asa: la hoja sigue al dedo y se cierra si baja lo suficiente.
	const onGrabDown = (event: PointerEvent<HTMLDivElement>) => {
		// La X vive dentro del asa: capturar su puntero se comería el clic.
		if ((event.target as Element).closest("button")) return;
		dragStartRef.current = event.clientY;
		setDragging(true);
		event.currentTarget.setPointerCapture(event.pointerId);
	};
	const onGrabMove = (event: PointerEvent<HTMLDivElement>) => {
		if (dragStartRef.current == null) return;
		setDragY(Math.max(0, event.clientY - dragStartRef.current));
	};
	const onGrabUp = () => {
		if (dragStartRef.current == null) return;
		dragStartRef.current = null;
		setDragging(false);
		if (dragY > DISMISS_DRAG_PX) close();
		else setDragY(0);
	};

	const fee = (amount: number) => formatMoney(amount, currency);
	const activeId = filtered[activeIndex] ? `${baseId}-opt-${filtered[activeIndex].id}` : undefined;

	const searchField = (autoFocus: boolean) =>
		showSearch ? (
			<div className="cart-zone-search">
				<Search size={16} aria-hidden className="cart-zone-search__icon" />
				<input
					type="search"
					className="cart-zone-search__input"
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setActiveIndex(0);
					}}
					onKeyDown={onNavKeyDown}
					placeholder={t("zoneSearch")}
					aria-label={t("zoneSearch")}
					role="combobox"
					aria-expanded
					aria-controls={listId}
					aria-activedescendant={activeId}
					aria-autocomplete="list"
					autoComplete="off"
					enterKeyHint="search"
					autoFocus={autoFocus}
				/>
				{query ? (
					<button
						type="button"
						className="cart-zone-search__clear"
						onClick={() => {
							setQuery("");
							setActiveIndex(0);
						}}
						aria-label={t("zoneSearchClear")}
					>
						<X size={14} aria-hidden />
					</button>
				) : null}
			</div>
		) : null;

	const list = (
		<>
			<ul
				className="cart-zone-list"
				role="listbox"
				id={listId}
				ref={listRef}
				aria-label={t("selectAreaAria")}
				tabIndex={!sheetMode && !showSearch ? 0 : -1}
				aria-activedescendant={!sheetMode && !showSearch ? activeId : undefined}
				onKeyDown={!sheetMode && !showSearch ? onNavKeyDown : undefined}
				onMouseDown={sheetMode ? undefined : (event) => event.preventDefault()}
			>
				{filtered.map((option, index) => {
					const isSelected = option.id === value;
					return (
						<li
							key={option.id}
							id={`${baseId}-opt-${option.id}`}
							role="option"
							aria-selected={isSelected}
							data-index={index}
							data-active={!sheetMode && index === activeIndex ? "" : undefined}
							className="cart-zone-option"
							onMouseMove={() => {
								if (!sheetMode && index !== activeIndex) setActiveIndex(index);
							}}
							onClick={() => pick(option)}
						>
							<span className="cart-zone-option__text">
								<span className="cart-zone-option__title">{option.title}</span>
								{option.subtitle ? <span className="cart-zone-option__sub">{option.subtitle}</span> : null}
							</span>
							<span className="cart-zone-option__fee">{fee(option.fee)}</span>
							<span className="cart-zone-option__check" aria-hidden>
								{isSelected ? <Check size={18} strokeWidth={2.4} /> : null}
							</span>
						</li>
					);
				})}
			</ul>
			{filtered.length === 0 ? <p className="cart-zone-empty">{t("zoneNoResults", { query: query.trim() })}</p> : null}
		</>
	);

	return (
		<div
			className="cart-zone"
			ref={rootRef}
			data-open={open ? "" : undefined}
			onBlur={(event) => {
				// Tab fuera del desplegable lo cierra.
				if (open && !sheetMode && !rootRef.current?.contains(event.relatedTarget as Node | null)) close(false);
			}}
		>
			<button
				ref={triggerRef}
				type="button"
				className="cart-field cart-zone__trigger"
				aria-labelledby="cart-named-area-label"
				aria-haspopup={sheetMode ? "dialog" : "listbox"}
				aria-expanded={open}
				data-empty={selected ? undefined : ""}
				onClick={() => (open ? close() : openPicker())}
			>
				<MapPin size={17} aria-hidden className="cart-zone__pin" />
				<span className="cart-zone__value">
					<span className="cart-zone__title">{selected ? selected.title : t("pickNamedArea")}</span>
					{selected?.subtitle ? <span className="cart-zone__sub">{selected.subtitle}</span> : null}
				</span>
				{selected ? <span className="cart-zone__fee">{fee(selected.fee)}</span> : null}
				<ChevronDown size={17} aria-hidden className="cart-zone__chevron" />
			</button>

			{open && !sheetMode ? (
				<div
					className="cart-zone-pop"
					data-up={placeUp ? "" : undefined}
					style={popMax ? ({ "--zone-pop-max": `${popMax}px` } as CSSProperties) : undefined}
				>
					{searchField(true)}
					{list}
				</div>
			) : null}

			<dialog
				ref={dialogRef}
				className="cart-zone-sheet"
				aria-labelledby={titleId}
				data-leaving={leaving ? "" : undefined}
				onCancel={(event) => {
					event.preventDefault();
					close();
				}}
				onClick={(event) => {
					// Tocar el fondo (fuera del panel) cierra, como en una hoja nativa.
					if (event.target === event.currentTarget) close();
				}}
			>
				{sheetOpen ? (
					<div
						className="cart-zone-sheet__panel"
						data-dragging={dragging ? "" : undefined}
						data-tall={showSearch ? "" : undefined}
						style={!leaving && dragY ? { transform: `translateY(${dragY}px)` } : undefined}
					>
						<div
							className="cart-zone-sheet__grab"
							onPointerDown={onGrabDown}
							onPointerMove={onGrabMove}
							onPointerUp={onGrabUp}
							onPointerCancel={onGrabUp}
						>
							<span className="cart-zone-sheet__handle" aria-hidden />
							<div className="cart-zone-sheet__head">
								<h2 className="cart-zone-sheet__title" id={titleId}>
									{t("zoneLabel")}
								</h2>
								<button type="button" className="cart-zone-sheet__close" onClick={() => close()} aria-label={t("zoneClose")}>
									<X size={18} aria-hidden />
								</button>
							</div>
						</div>
						{searchField(false)}
						<div className="cart-zone-sheet__scroll">{list}</div>
					</div>
				) : null}
			</dialog>
		</div>
	);
}
