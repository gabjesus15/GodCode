"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Clock, MapPin, Moon } from "lucide-react";

import { BranchHoursEditor } from "../../account/tabs/branch-hours-editor";
import { InstagramIcon, WhatsAppIcon } from "../ui/brand-icons";
import { SetupField, SetupInput } from "../ui/setup-field";
import { SetupSwitch } from "../ui/setup-switch";

import {
	DAY_LABEL,
	DAY_LETTER,
	DEFAULT_SETUP_INTERVAL,
	describeUniformHours,
	HOURS_PRESETS,
	sameUniformHours,
	uniformHours,
	weekFromUniform,
	type UniformHours,
} from "@/lib/owner-setup/hours";
import type { LocalForm } from "@/lib/owner-setup/types";
import { isVenezuela } from "@/lib/owner-setup/use-owner-setup";
import { WEEKDAYS_FROM_MONDAY, type BusinessHoursWeek, type Weekday } from "@/lib/tenant/business-hours";
import { cn } from "@/utils/cn";

export type { LocalForm };

const TIME_INPUT =
	"h-12 w-full rounded-xl bg-(--su-surface) px-3.5 text-base tabular-nums text-(--su-ink) ring-1 ring-inset ring-(--su-line-strong) outline-none transition-[box-shadow] focus:ring-2 focus:ring-(--su-accent) focus:shadow-(--su-shadow-focus) sm:text-[15px] disabled:opacity-60";

/** Días con un solo turno: botones redondos para los días y dos horas. */
function SimpleHours({ hours, onChange, disabled }: { hours: UniformHours; onChange: (hours: UniformHours) => void; disabled: boolean }) {
	const toggle = (day: Weekday) =>
		onChange({ ...hours, days: hours.days.includes(day) ? hours.days.filter((item) => item !== day) : [...hours.days, day] });
	const overnight = hours.interval.close < hours.interval.open;
	return (
		<div className="space-y-5">
			<div className="grid grid-cols-3 gap-2" role="group" aria-label="Horarios comunes">
				{HOURS_PRESETS.map((preset) => {
					const selected = sameUniformHours(hours, preset.hours);
					return (
						<button
							key={preset.id}
							type="button"
							aria-pressed={selected}
							aria-label={`${preset.label}, de ${preset.hours.interval.open} a ${preset.hours.interval.close}`}
							disabled={disabled}
							onClick={() => onChange({ days: [...preset.hours.days], interval: { ...preset.hours.interval } })}
							className={cn(
								"flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2.5 text-center transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.97]",
								"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--su-accent)/25",
								selected ? "bg-(--su-accent-soft) shadow-[inset_0_0_0_1.5px_var(--su-accent)]" : "bg-(--su-surface-sunken) hover:bg-[#ebebf0]",
							)}
						>
							<span className={cn("text-[13px] font-semibold leading-tight", selected ? "text-(--su-accent)" : "text-(--su-ink)")}>
								<span className="sm:hidden">{preset.short}</span>
								<span className="hidden sm:inline">{preset.label}</span>
							</span>
							<span className={cn("text-[12px] tabular-nums", selected ? "text-(--su-accent)/75" : "text-(--su-subtle)")}>
								{preset.hours.interval.open}–{preset.hours.interval.close}
							</span>
						</button>
					);
				})}
			</div>

			<div>
				<p className="mb-2.5 text-[13px] font-medium text-(--su-muted)">Días que abres</p>
				<div className="flex justify-between gap-1.5 sm:justify-start sm:gap-2">
					{WEEKDAYS_FROM_MONDAY.map((day) => {
						const on = hours.days.includes(day);
						return (
							<button
								key={day}
								type="button"
								aria-pressed={on}
								aria-label={DAY_LABEL[day]}
								title={DAY_LABEL[day]}
								disabled={disabled}
								onClick={() => toggle(day)}
								className={cn(
									"flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-[14px] font-semibold transition-[background-color,color,transform] duration-150 active:scale-90 sm:w-11",
									"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--su-accent)/25",
									on
										? "bg-(--su-accent) text-white shadow-[0_4px_12px_-4px_rgba(79,91,255,0.6)]"
										: "bg-(--su-surface-sunken) text-(--su-muted) hover:bg-[#e9e9ee]",
								)}
							>
								{DAY_LETTER[day]}
							</button>
						);
					})}
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<label className="block">
					<span className="mb-2 block text-[13px] font-medium text-(--su-muted)">Abre</span>
					<input
						type="time"
						value={hours.interval.open}
						disabled={disabled}
						onChange={(event) => event.target.value && onChange({ ...hours, interval: { ...hours.interval, open: event.target.value } })}
						className={TIME_INPUT}
					/>
				</label>
				<label className="block">
					<span className="mb-2 block text-[13px] font-medium text-(--su-muted)">Cierra</span>
					<input
						type="time"
						value={hours.interval.close}
						disabled={disabled}
						onChange={(event) => event.target.value && onChange({ ...hours, interval: { ...hours.interval, close: event.target.value } })}
						className={TIME_INPUT}
					/>
				</label>
			</div>
			{overnight ? (
				<p className="flex items-center gap-1.5 text-[13px] text-(--su-muted)">
					<Moon className="h-3.5 w-3.5" aria-hidden />
					Cierra al día siguiente.
				</p>
			) : null}
		</div>
	);
}

export function LocalStep({
	form,
	onChange,
	whatsappError,
	disabled,
	country,
}: {
	form: LocalForm;
	onChange: (patch: Partial<LocalForm>) => void;
	whatsappError: string | null;
	disabled: boolean;
	country: string | null;
}) {
	const phonePlaceholder = isVenezuela(country) ? "+58 412 123 4567" : "+56 9 1234 5678";
	const uniform = uniformHours(form.hoursWeek);
	const [advanced, setAdvanced] = useState(() => uniform === null);
	const summary = describeUniformHours(uniform);
	const setWeek = (hoursWeek: BusinessHoursWeek) => onChange({ hoursWeek });

	/** Volver al horario simple: los días abiertos con el turno del primero. */
	const toSimple = () => {
		const days = WEEKDAYS_FROM_MONDAY.filter((day) => form.hoursWeek[day].length > 0);
		const first = days.length > 0 ? form.hoursWeek[days[0]][0] : DEFAULT_SETUP_INTERVAL;
		setWeek(weekFromUniform({ days, interval: { ...first } }));
		setAdvanced(false);
	};

	return (
		<div className="space-y-9">
			<section className="space-y-5" aria-label="Contacto">
				<SetupField
					label="WhatsApp para pedidos"
					hint="Con el código de país. Tus clientes te escriben aquí."
					error={whatsappError}
				>
					{({ id, describedBy }) => (
						<SetupInput
							id={id}
							aria-describedby={describedBy}
							value={form.whatsapp}
							onChange={(event) => onChange({ whatsapp: event.target.value })}
							inputMode="tel"
							autoComplete="tel"
							placeholder={phonePlaceholder}
							disabled={disabled}
							invalid={Boolean(whatsappError)}
							leading={<WhatsAppIcon className="text-(--su-whatsapp)" />}
						/>
					)}
				</SetupField>
				<div className="grid gap-5 sm:grid-cols-2">
					<SetupField label="Instagram" optional>
						{({ id, describedBy }) => (
							<SetupInput
								id={id}
								aria-describedby={describedBy}
								value={form.instagram}
								onChange={(event) => onChange({ instagram: event.target.value })}
								placeholder="@tulocal"
								autoCapitalize="none"
								autoCorrect="off"
								spellCheck={false}
								disabled={disabled}
								leading={<InstagramIcon />}
							/>
						)}
					</SetupField>
					<SetupField label="Dirección">
						{({ id, describedBy }) => (
							<SetupInput
								id={id}
								aria-describedby={describedBy}
								value={form.address}
								onChange={(event) => onChange({ address: event.target.value })}
								placeholder="Calle, número y ciudad"
								autoComplete="street-address"
								disabled={disabled}
								leading={<MapPin />}
							/>
						)}
					</SetupField>
				</div>
			</section>

			<section className="space-y-4" aria-labelledby="hours-title">
				<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
					<h3 id="hours-title" className="flex items-center gap-2 text-sm font-medium text-(--su-ink)">
						<Clock className="h-4 w-4 text-(--su-subtle)" aria-hidden />
						Horario
					</h3>
					{summary && !advanced ? <p className="text-[13px] text-(--su-muted)">{summary}</p> : null}
				</div>

				{form.legacySchedule && !form.hoursStored ? (
					<p className="rounded-2xl bg-(--su-warning-soft) px-4 py-3 text-[13px] leading-relaxed text-[#7c3a06]">
						{form.legacyParsed ? "Pasamos a días el horario que tenías escrito. Revísalo: " : "Tu horario estaba escrito como texto. Cárgalo aquí: "}
						<span className="font-medium">«{form.legacySchedule}»</span>
					</p>
				) : null}

				<div className="rounded-[22px] bg-(--su-surface) p-4 ring-1 ring-inset ring-(--su-line) sm:p-5">
					<AnimatePresence mode="wait" initial={false}>
						{advanced ? (
							<motion.div key="advanced" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
								<BranchHoursEditor
									week={form.hoursWeek}
									onWeekChange={setWeek}
									enabled={form.hoursEnabled}
									onEnabledChange={(hoursEnabled) => onChange({ hoursEnabled })}
									disabled={disabled}
									timeZone={form.timeZone}
									legacyText={null}
									legacyParsed={form.legacyParsed}
									showPauseToggle={false}
								/>
							</motion.div>
						) : (
							<motion.div key="simple" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
								<SimpleHours hours={uniform ?? { days: [], interval: { ...DEFAULT_SETUP_INTERVAL } }} onChange={(hours) => setWeek(weekFromUniform(hours))} disabled={disabled} />
							</motion.div>
						)}
					</AnimatePresence>
					<div className="mt-5 border-t border-(--su-line) pt-4">
						<button
							type="button"
							onClick={() => (advanced ? toSimple() : setAdvanced(true))}
							disabled={disabled}
							className="inline-flex items-center gap-2 rounded-lg text-[13.5px] font-medium text-(--su-accent) transition hover:text-(--su-accent-hover) focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--su-accent)/25"
						>
							<CalendarClock className="h-4 w-4" aria-hidden />
							{advanced ? "Usar el mismo horario todos los días" : "Tengo horarios distintos según el día"}
						</button>
					</div>
				</div>

				<div className="rounded-[22px] bg-(--su-surface) px-4 py-3.5 ring-1 ring-inset ring-(--su-line) sm:px-5">
					<SetupSwitch
						checked={form.hoursEnabled}
						onChange={(hoursEnabled) => onChange({ hoursEnabled })}
						disabled={disabled}
						label="Pausar pedidos fuera de horario"
						description="El menú no recibe pedidos cuando estás cerrado, aunque la caja quede abierta."
					/>
				</div>
			</section>
		</div>
	);
}
