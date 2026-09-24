import { Skeleton } from "../../../components/ui/skeleton";
import { cn } from "@/utils/cn";

/** El Skeleton compartido no trae tono oscuro: se ajusta aquí sin tocar `components/ui`. */
function Bar({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-md dark:bg-zinc-800", className)} />;
}

/** Mismo esqueleto que las tarjetas de planes: nombre y botón, precio, resumen y descripciones. */
export default function PlansLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Bar className="h-7 w-28" />
          <Bar className="mt-2 h-4 w-72 max-w-full" />
        </div>
        <Bar className="h-8 w-28 rounded-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {["plan-1", "plan-2", "plan-3"].map((id) => (
          <div
            key={id}
            className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <Bar className="h-4 w-24" />
              <Bar className="h-8 w-20 rounded-lg" />
            </div>
            <Bar className="mt-4 h-6 w-28" />
            <Bar className="mt-2 h-3 w-24" />
            <Bar className="mt-3 h-3 w-40" />
            <div className="mt-4 space-y-2.5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-5/6" />
              <Bar className="h-3 w-4/6" />
              <Bar className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
