export function SaasLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "w-9 h-9" : size === "sm" ? "w-6 h-6" : "w-7 h-7";
  const text =
    size === "lg"
      ? "text-xl"
      : size === "sm"
        ? "text-sm"
        : "text-base";

  return (
    <span className="inline-flex items-center gap-1.5" aria-label="GodCode">
      <svg
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${dims} shrink-0`}
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
      <span className={`${text} font-bold tracking-tight text-slate-900 dark:text-white`}>
        God<span className="text-indigo-600 dark:text-indigo-400">Code</span>
      </span>
    </span>
  );
}
