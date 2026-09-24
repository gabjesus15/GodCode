import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface SaasPageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}

/** Cabecera de página con el mismo formato que el Inicio: título y bajada, sin icono. */
export function SaasPageHeader({
  title,
  description,
  backHref,
  backLabel = "Volver",
  action,
}: SaasPageHeaderProps) {
  // Se mide el ancho del contenido, no el de la ventana: con la barra lateral abierta,
  // título y acciones no caben en una fila hasta ~48rem.
  return (
    <div className="@container">
      <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-end @3xl:justify-between">
        <div className="min-w-0 flex-1">
          {backHref && (
            <Link
              href={backHref}
              className="mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </Link>
          )}
          <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h1>
          {description && <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
        </div>
        {action && <div className="w-full shrink-0 @3xl:w-auto">{action}</div>}
      </div>
    </div>
  );
}
