import { redirect } from "next/navigation";

/** La gestión de cada empresa se abre en ventana sobre el Inicio. */
export default async function CompanyRedirect({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	redirect(`/dashboard/empresa/${encodeURIComponent(id)}`);
}
