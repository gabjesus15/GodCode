"use client";

import { BranchHoursEditor } from "../../account/tabs/branch-hours-editor";

import type { BusinessHoursWeek } from "@/lib/tenant/business-hours";

export type LocalForm = {
	whatsapp: string;
	instagram: string;
	address: string;
	hoursWeek: BusinessHoursWeek;
	hoursEnabled: boolean;
	/** El horario ya estaba guardado por días (si no, el editor muestra el texto viejo). */
	hoursStored: boolean;
	legacySchedule: string | null;
	legacyParsed: boolean;
	timeZone: string | null;
};

const INPUT =
	"h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-3.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

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
	const phonePlaceholder = /venezuela|^ve$/i.test(country ?? "") ? "+58 412 123 4567" : "+56 9 1234 5678";
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold tracking-[-0.01em] text-[#1d1d1f]">Datos del local</h2>
				<p className="mt-1 text-sm text-[#6e6e73]">Salen en tu menú para que te escriban, te sigan y sepan cuándo abres.</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<label className="block">
					<span className="mb-1.5 block text-sm font-medium text-[#1d1d1f]">WhatsApp para pedidos</span>
					<input
						value={form.whatsapp}
						onChange={(e) => onChange({ whatsapp: e.target.value })}
						inputMode="tel"
						placeholder={phonePlaceholder}
						disabled={disabled}
						aria-invalid={whatsappError ? true : undefined}
						className={`${INPUT} ${whatsappError ? "border-red-400" : ""}`}
					/>
					{whatsappError && <span className="mt-1 block text-xs text-red-600">{whatsappError}</span>}
				</label>
				<label className="block">
					<span className="mb-1.5 block text-sm font-medium text-[#1d1d1f]">Instagram</span>
					<input
						value={form.instagram}
						onChange={(e) => onChange({ instagram: e.target.value })}
						placeholder="@tulocal"
						disabled={disabled}
						className={INPUT}
					/>
				</label>
				<label className="block sm:col-span-2">
					<span className="mb-1.5 block text-sm font-medium text-[#1d1d1f]">Dirección</span>
					<input
						value={form.address}
						onChange={(e) => onChange({ address: e.target.value })}
						placeholder="Calle, número y comuna o ciudad"
						disabled={disabled}
						className={INPUT}
					/>
				</label>
			</div>

			<div>
				<p className="mb-2 text-sm font-medium text-[#1d1d1f]">Horario</p>
				<BranchHoursEditor
					week={form.hoursWeek}
					onWeekChange={(hoursWeek) => onChange({ hoursWeek })}
					enabled={form.hoursEnabled}
					onEnabledChange={(hoursEnabled) => onChange({ hoursEnabled })}
					disabled={disabled}
					timeZone={form.timeZone}
					legacyText={form.hoursStored ? null : form.legacySchedule}
					legacyParsed={form.legacyParsed}
				/>
			</div>
		</div>
	);
}
