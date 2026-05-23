import Image from "next/image";

const MARK_PX = { sm: 24, md: 28, lg: 36 } as const;

export function SaasLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = MARK_PX[size];
  const text =
    size === "lg"
      ? "text-xl"
      : size === "sm"
        ? "text-sm"
        : "text-base";

  return (
    <span className="inline-flex items-center gap-1.5" aria-label="GodCode">
      <Image
        src="/logo.png"
        alt=""
        width={px}
        height={px}
        className="shrink-0"
      />
      <span className={`${text} font-bold tracking-tight text-slate-900 dark:text-white`}>
        God<span className="text-indigo-600 dark:text-indigo-400">Code</span>
      </span>
    </span>
  );
}
