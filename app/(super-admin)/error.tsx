"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Error dentro del panel: el menú sigue a mano (lo pinta el layout) y se puede reintentar
 * sin recargar todo. Antes un fallo en una página dejaba la pantalla genérica de Next.
 */
export default function SuperAdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("super admin page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">No se pudo cargar esta sección</h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Puede ser un corte momentáneo de la base de datos. Reintenta; si sigue fallando, avisa con el código de abajo.
        </p>
        {error.digest ? <p className="mt-3 font-mono text-xs text-zinc-400">Código: {error.digest}</p> : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Ir al inicio
          </Link>
          <Button onClick={reset}>Reintentar</Button>
        </div>
      </div>
    </div>
  );
}
