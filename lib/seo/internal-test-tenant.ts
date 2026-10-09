/**
 * Tiendas de prueba internas (demo, QA, test): no van al sitemap ni al listado
 * público de negocios. Siguen accesibles por URL, pero no queremos que Google las
 * tome como negocios reales ni que compitan con la home por «menú digital».
 *
 * Cómo marcar una tienda interna: que su slug empiece por `demo`, `qa`, `test`,
 * `prueba`, `pruebas` o `staging`, seguido de un guion o del final del slug
 * (`demo-pizzeria`, `qa`, `test-sushi`), o añadirla a `INTERNAL_TEST_TENANT_SLUGS`.
 * El marcador va al inicio a propósito: un local real llamado «La Prueba»
 * (`la-prueba`) o «Sushi Demo» (`sushi-demo`) no se esconde por accidente.
 */
export const INTERNAL_TEST_TENANT_SLUGS: ReadonlySet<string> = new Set(["pizzeria-demo-qa"]);

const INTERNAL_TEST_PREFIX = /^(demo|qa|test|prueba|pruebas|staging)(-|$)/i;

export function isInternalTestTenantSlug(slug: string): boolean {
	const normalized = slug.trim().toLowerCase();
	return INTERNAL_TEST_TENANT_SLUGS.has(normalized) || INTERNAL_TEST_PREFIX.test(normalized);
}
