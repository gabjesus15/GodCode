/**
 * Cifra lo que quedó en claro de las cuentas del menú (fichas, pedidos, direcciones
 * y canjes). Corre con la llave del Portal (`MENU_ACCOUNT_PII_KEY`) y la clave de
 * servicio del `.env`.
 *
 *   npx tsx --conditions=react-server --env-file=.env scripts/menu-account/seal-account-data.ts           # solo cuenta
 *   npx tsx --conditions=react-server --env-file=.env scripts/menu-account/seal-account-data.ts --apply   # escribe
 *
 * Es idempotente. Si la llave no es la que cifró las cuentas, falla al abrir la
 * primera y no escribe nada.
 */
/* eslint-disable no-console -- script de terminal: su salida es el reporte */
import { sealExistingAccountData } from "@/lib/menu-account/seal-backfill";

const apply = process.argv.includes("--apply");

sealExistingAccountData({ apply })
	.then((report) => {
		console.log(apply ? "Cifrado aplicado:" : "Pendiente de cifrar (sin --apply no se escribe nada):");
		console.table(report);
	})
	.catch((error: unknown) => {
		console.error("Falló:", error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
