export function LandingLogo({ className, forceLightText = false }: { className?: string; forceLightText?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
      aria-label="GodCode"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden
      >
        <rect width="28" height="28" rx="8" className="fill-indigo-600" />
        <path
          d="M8 10.5h5.5a2.5 2.5 0 010 5H11v3"
          className="stroke-white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="19" cy="17.5" r="2.5" className="fill-violet-300" />
      </svg>
      <span className={`text-lg font-bold tracking-tight ${forceLightText ? "text-slate-900" : "text-slate-900 dark:text-white"}`}>
        God<span className="text-indigo-600 dark:text-indigo-400">Code</span>
      </span>
    </span>
  );
}
