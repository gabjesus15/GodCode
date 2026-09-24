import { redirect } from "next/navigation";

/** Las alertas de pagos se ven como avisos en el Inicio. */
export default function SaludPagosRedirect() {
	redirect("/dashboard");
}
