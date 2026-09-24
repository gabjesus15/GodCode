import { Skeleton } from "../../../components/ui/skeleton";

/** Mientras carga una página de /dashboard: encabezado, cuatro cifras y una tabla. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {["kpi-1", "kpi-2", "kpi-3", "kpi-4"].map((id) => (
          <Skeleton key={id} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
