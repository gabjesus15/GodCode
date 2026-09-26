/** Clases Tailwind para cada variante semántica de color. */
export const colorVariants = {
  accent:  { bg: "bg-indigo-600",  text: "text-indigo-600",  subtle: "bg-indigo-50",  border: "border-indigo-200"  },
  success: { bg: "bg-emerald-600", text: "text-emerald-600", subtle: "bg-emerald-50", border: "border-emerald-200" },
  warning: { bg: "bg-amber-500",   text: "text-amber-600",   subtle: "bg-amber-50",   border: "border-amber-200"   },
  danger:  { bg: "bg-red-600",     text: "text-red-600",     subtle: "bg-red-50",     border: "border-red-200"     },
  info:    { bg: "bg-sky-600",     text: "text-sky-600",     subtle: "bg-sky-50",     border: "border-sky-200"     },
  neutral: { bg: "bg-zinc-500",    text: "text-zinc-600",    subtle: "bg-zinc-100",   border: "border-zinc-200"    },
} as const;

export type ColorVariant = keyof typeof colorVariants;
