"use client";
import React from "react";

export interface ActivityRing {
  label: string;
  value: string | number;
  percentage: number; // 0 a 100
  color: string;      // color del anillo
  backgroundColor: string; // color de fondo atenuado del anillo
}

interface ActivityRingsProps {
  rings: ActivityRing[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
}

export function ActivityRings({
  rings,
  size = 180,
  strokeWidth = 12,
  gap = 4,
}: ActivityRingsProps) {
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around sm:gap-4">
      {/* SVG de los anillos */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {rings.map((ring, idx) => {
            // Calcular el radio para cada anillo concéntrico de afuera hacia adentro
            const radius = center - strokeWidth / 2 - idx * (strokeWidth + gap);
            const circumference = 2 * Math.PI * radius;
            
            // Limitar porcentaje entre 0 y 100 (o soportar vueltas completas si se desea)
            const safePct = Math.max(0, Math.min(100, ring.percentage));
            const strokeDashoffset = circumference - (safePct / 100) * circumference;

            return (
              <g key={idx}>
                {/* Círculo de fondo atenuado */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={ring.backgroundColor}
                  strokeWidth={strokeWidth}
                />
                {/* Círculo de progreso */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </g>
            );
          })}
        </svg>

        {/* Indicador central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
            {Math.round(
              rings.reduce((acc, r) => acc + r.percentage, 0) / rings.length
            )}%
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Promedio
          </span>
        </div>
      </div>

      {/* Leyendas con estilo iOS */}
      <div className="flex flex-col gap-3.5">
        {rings.map((ring, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full"
              style={{ backgroundColor: ring.color }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {ring.label}
              </span>
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {ring.value} <span className="text-xs font-medium text-zinc-400">({Math.round(ring.percentage)}%)</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
