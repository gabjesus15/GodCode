/** Las páginas de /dashboard y, encima, la ventana de gestión de empresa o solicitud (`@modal`). */
export default function DashboardLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
	return (
		<>
			{children}
			{modal}
		</>
	);
}
