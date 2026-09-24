import { redirect } from "next/navigation";

/** Las solicitudes de alta se revisan desde el Inicio (enlace de correos anteriores). */
export default function SolicitudesRedirect() {
	redirect("/dashboard");
}
