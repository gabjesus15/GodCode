"use client";

export type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#f5f5f7] ${className}`}
      aria-hidden="true"
    />
  );
}

/** Grupo de skeletons para simular una tarjeta de KPI. */
export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl border border-[#e5e5ea] bg-white p-5">
      <Skeleton className="mb-4 h-px w-8" />
      <Skeleton className="mb-2 h-3 w-20" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

