import { Check } from "lucide-react";
import { cn } from "@/utils/cn";

interface SaasCheckboxProps {
  checked: boolean;
  label?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export function SaasCheckbox({
  checked,
  label,
  disabled,
  readOnly,
  onChange,
  className,
}: SaasCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !readOnly && onChange?.(!checked)}
      className={cn(
        "flex items-center gap-2.5 text-left",
        disabled ? "cursor-default opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-md border transition",
          checked
            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
            : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
      {label && (
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      )}
    </button>
  );
}
