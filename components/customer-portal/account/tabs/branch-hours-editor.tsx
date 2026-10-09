"use client";

import { Copy, Moon, Plus, X } from "lucide-react";

import {
  MAX_INTERVALS_PER_DAY,
  WEEKDAY_NAME,
  WEEKDAYS_FROM_MONDAY,
  type BusinessHoursInterval,
  type BusinessHoursWeek,
  type Weekday,
} from "@/lib/tenant/business-hours";

const DEFAULT_INTERVAL: BusinessHoursInterval = { open: "09:00", close: "18:00" };

type BranchHoursEditorProps = {
  week: BusinessHoursWeek;
  onWeekChange: (week: BusinessHoursWeek) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
  /** Zona guardada; sin ella el servidor usa la del país de la sucursal al guardar. */
  timeZone: string | null;
  /** Texto libre de antes, cuando todavía no hay horario por días guardado. */
  legacyText: string | null;
  legacyParsed: boolean;
  /** «Configura tu tienda» muestra su propio interruptor de pausa. */
  showPauseToggle?: boolean;
};

export function BranchHoursEditor({
  week,
  onWeekChange,
  enabled,
  onEnabledChange,
  disabled = false,
  timeZone,
  legacyText,
  legacyParsed,
  showPauseToggle = true,
}: BranchHoursEditorProps) {
  const firstOpenDay = WEEKDAYS_FROM_MONDAY.find((day) => week[day].length > 0) ?? null;

  const setDay = (day: Weekday, intervals: BusinessHoursInterval[]) => onWeekChange({ ...week, [day]: intervals });

  const toggleDay = (day: Weekday) => {
    if (week[day].length > 0) {
      setDay(day, []);
      return;
    }
    // Al abrir un día se propone el horario del primer día abierto: casi siempre es el mismo.
    setDay(day, firstOpenDay != null ? week[firstOpenDay].map((interval) => ({ ...interval })) : [{ ...DEFAULT_INTERVAL }]);
  };

  const updateInterval = (day: Weekday, index: number, patch: Partial<BusinessHoursInterval>) =>
    setDay(
      day,
      week[day].map((interval, i) => (i === index ? { ...interval, ...patch } : interval)),
    );

  const addInterval = (day: Weekday) => {
    const last = week[day][week[day].length - 1];
    setDay(day, [...week[day], { open: last?.close ?? "19:00", close: "23:00" }]);
  };

  const removeInterval = (day: Weekday, index: number) =>
    setDay(
      day,
      week[day].filter((_, i) => i !== index),
    );

  const copyToAllDays = () => {
    if (firstOpenDay == null) return;
    const source = week[firstOpenDay];
    const next = { ...week };
    for (const day of WEEKDAYS_FROM_MONDAY) next[day] = source.map((interval) => ({ ...interval }));
    onWeekChange(next);
  };

  const timeInputClass =
    "h-9 w-[6.5rem] rounded-lg border border-[#d2d2d7] bg-white px-2 text-sm tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition duration-150 disabled:opacity-60";

  return (
    <div className="space-y-4">
      {showPauseToggle ? (
      <label className="flex cursor-pointer select-none items-start gap-3 rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] p-4">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="mt-0.5 h-4.5 w-4.5 rounded border-[#d2d2d7] text-indigo-600 focus:ring-indigo-500/20"
          disabled={disabled}
        />
        <span className="space-y-1">
          <span className="block text-sm font-semibold text-[#1d1d1f]">Pausar el menú automáticamente fuera de horario</span>
          <span className="block text-xs leading-relaxed text-[#6e6e73]">
            Fuera de este horario el menú no recibe pedidos, aunque alguien haya dejado la caja abierta. La caja no se
            toca: se cierra y se cuadra como siempre.
          </span>
        </span>
      </label>
      ) : null}

      {legacyText ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900">
          {legacyParsed
            ? "Pasamos a días el horario que tenías escrito. Revísalo antes de guardar: "
            : "Tu horario está escrito como texto y no se pudo pasar a días. Cárgalo aquí para poder pausar el menú solo: "}
          <span className="font-medium">«{legacyText}»</span>
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#8e8e93]">Días y horas</h4>
        <button
          type="button"
          onClick={copyToAllDays}
          disabled={disabled || firstOpenDay == null}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-[#c7c7cc] disabled:hover:bg-transparent"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          {firstOpenDay != null ? `Copiar el ${WEEKDAY_NAME[firstOpenDay].toLowerCase()} a todos` : "Copiar a todos"}
        </button>
      </div>

      <ul className="space-y-2">
        {WEEKDAYS_FROM_MONDAY.map((day) => {
          const intervals = week[day];
          const isOpen = intervals.length > 0;
          return (
            <li
              key={day}
              className="flex flex-col gap-2 rounded-xl border border-[#e5e5ea] bg-white px-3 py-2.5 sm:flex-row sm:items-start sm:gap-4"
            >
              <label className="flex w-32 shrink-0 cursor-pointer select-none items-center gap-2 text-sm font-medium text-[#1d1d1f] sm:h-9">
                <input
                  type="checkbox"
                  checked={isOpen}
                  onChange={() => toggleDay(day)}
                  className="h-4 w-4 rounded border-[#d2d2d7] text-indigo-600 focus:ring-indigo-500/20"
                  disabled={disabled}
                />
                {WEEKDAY_NAME[day]}
              </label>

              {isOpen ? (
                <div className="flex flex-1 flex-col gap-2">
                  {intervals.map((interval, index) => {
                    const allDay = interval.open === interval.close;
                    const overnight = !allDay && interval.close < interval.open;
                    return (
                      <div key={index} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          value={interval.open}
                          onChange={(e) => e.target.value && updateInterval(day, index, { open: e.target.value })}
                          aria-label={`${WEEKDAY_NAME[day]}: abre`}
                          className={timeInputClass}
                          disabled={disabled}
                          required
                        />
                        <span className="text-xs text-[#8e8e93]">a</span>
                        <input
                          type="time"
                          value={interval.close}
                          onChange={(e) => e.target.value && updateInterval(day, index, { close: e.target.value })}
                          aria-label={`${WEEKDAY_NAME[day]}: cierra`}
                          className={timeInputClass}
                          disabled={disabled}
                          required
                        />
                        {index > 0 ? (
                          <button
                            type="button"
                            onClick={() => removeInterval(day, index)}
                            aria-label={`Quitar el segundo turno del ${WEEKDAY_NAME[day].toLowerCase()}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8e8e93] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                            disabled={disabled}
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                        ) : intervals.length < MAX_INTERVALS_PER_DAY ? (
                          <button
                            type="button"
                            onClick={() => addInterval(day)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                            disabled={disabled}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden /> Turno
                          </button>
                        ) : null}
                        {overnight ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#8e8e93]">
                            <Moon className="h-3 w-3" aria-hidden /> cierra al día siguiente
                          </span>
                        ) : allDay ? (
                          <span className="text-[11px] text-[#8e8e93]">abierto las 24 horas</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-sm text-[#8e8e93] sm:flex sm:h-9 sm:items-center">Cerrado</span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] leading-relaxed text-[#8e8e93]">
        Tus clientes ven este horario en el menú y en tu página.{" "}
        {timeZone ? `Se usa la hora de ${timeZone.replace(/_/g, " ")}.` : "Se usa la hora del país de la sucursal."}
      </p>
    </div>
  );
}
