/**
 * Vive en `lib/infra/db-compat.ts`: ahora también la usan la tienda, Mi cuenta y el súper admin
 * (columnas de sucursal que llegan con migraciones pendientes). Se reexporta para el alta y el
 * barrido, que la importan desde aquí. Ruta relativa: resuelve igual desde la app y desde el
 * servicio de alta.
 */
export { isMissingColumnError } from "../infra/db-compat";
