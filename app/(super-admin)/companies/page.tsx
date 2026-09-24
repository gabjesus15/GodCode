import { redirect } from "next/navigation";

/** La lista de empresas vive en el Inicio. */
export default function CompaniesRedirect() {
	redirect("/dashboard");
}
