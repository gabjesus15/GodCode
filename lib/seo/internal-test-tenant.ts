/**
 * Tiendas de prueba internas (demo, QA, test): no van al sitemap. Siguen
 * accesibles por URL, pero no queremos que Google las tome como negocios reales
 * ni que compitan con la home por «menú digital».
 */
export function isInternalTestTenantSlug(slug: string): boolean {
	return /(^|-)(demo|qa|test|prueba|pruebas|staging)(-|$)/i.test(slug);
}
