import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

interface SaasSelectOption {
  value: string;
  label: string;
}

interface SaasSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SaasSelectOption[];
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function SaasSelect({
  options,
  onChange,
  label,
  placeholder,
  className,
  value,
  ...props
}: SaasSelectProps) {
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-1.5 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3 pr-9 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      </div>
    </div>
  );
}
