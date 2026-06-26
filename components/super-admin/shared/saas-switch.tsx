import { cn } from "@/utils/cn";

interface SaasSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function SaasSwitch({ checked, onChange, label, description, disabled }: SaasSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-3 text-left disabled:opacity-50"
    >
      <div>
        {label && (
          <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
        )}
        {description && (
          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{description}</span>
        )}
      </div>
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
          checked ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform dark:bg-zinc-900",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
