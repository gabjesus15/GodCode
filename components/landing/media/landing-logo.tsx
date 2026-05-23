import Image from "next/image";

export function LandingLogo({ className, forceLightText = false }: { className?: string; forceLightText?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
      aria-label="GodCode"
    >
      <Image src="/logo.png" alt="" width={28} height={28} className="shrink-0" priority />
      <span className={`text-lg font-bold tracking-tight ${forceLightText ? "text-slate-900" : "text-slate-900 dark:text-white"}`}>
        God<span className="text-indigo-600 dark:text-indigo-400">Code</span>
      </span>
    </span>
  );
}
