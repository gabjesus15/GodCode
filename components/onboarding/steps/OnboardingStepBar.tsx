import { Check } from "lucide-react";
import { useLocale } from "next-intl";

const COPY = {
  es: ["Registro", "Plan", "Pago"],
  en: ["Sign up", "Plan", "Payment"],
} as const;

export function OnboardingStepBar({ current }: { current: 1 | 2 | 3 }) {
  const locale = useLocale();
  const lang = locale.toLowerCase().startsWith("es") ? "es" : "en";
  const labels = COPY[lang];
  const steps = [
    { n: 1, label: labels[0] },
    { n: 2, label: labels[1] },
    { n: 3, label: labels[2] },
  ] as const;

  return (
    <div className="mb-8 flex justify-center sm:mb-10">
      <ol className="flex items-center gap-0">
        {steps.map((s, i) => {
          const done = s.n < current;
          const active = s.n === current;
          return (
            <li key={s.n} className="flex items-center" aria-current={active ? "step" : undefined}>
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition sm:h-9 sm:w-9 ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-slate-900 text-white shadow-md"
                        : "border border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : s.n}
                </span>
                <span
                  className={`mt-1.5 text-[10px] font-medium uppercase tracking-wider sm:text-xs ${
                    active ? "text-slate-900" : done ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`mx-2 h-px w-8 sm:mx-3 sm:w-12 ${
                    done ? "bg-emerald-400" : "bg-slate-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
