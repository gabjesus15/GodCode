"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";

import { ROLE_ACTION_OPTIONS, ROLE_TAB_OPTIONS } from "@/lib/super-admin/role-permissions";
import type { CompanyRole, TeamMember, TeamSnapshot } from "@/lib/tenant/company-team";
import type { UseTeamReturn } from "../../hooks/use-team";
import { Alert } from "../../ui/Alert";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { useConfirmDialog } from "../../ui/ConfirmDialog";
import { Dialog, DialogFooter } from "../../ui/Dialog";
import { Skeleton } from "../../ui/Skeleton";

const inputClass =
	"h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-[#f5f5f7]";
const labelClass = "mb-1.5 block text-xs font-medium text-[#6e6e73]";
const hintClass = "mt-1 text-xs text-[#6e6e73]";
const checkboxClass = "mt-0.5 h-4 w-4 shrink-0 rounded border-[#c7c7cc] accent-[#0071e3]";

const TAB_LABELS = new Map<string, string>(ROLE_TAB_OPTIONS.map((tab) => [tab.id, tab.label]));
const ACTION_LABELS = new Map<string, string>(ROLE_ACTION_OPTIONS.map((action) => [action.key, action.label]));

/** Valor del selector de rol: «admin», «cashier» o «role:<id>» para un rol propio. */
type RoleValue = string;

const roleValueOf = (member: Pick<TeamMember, "role" | "companyRoleId">): RoleValue =>
	member.companyRoleId ? `role:${member.companyRoleId}` : member.role;

function roleBody(value: RoleValue): Record<string, unknown> {
	return value.startsWith("role:") ? { companyRoleId: value.slice(5) } : { role: value, companyRoleId: null };
}

function roleLabel(member: TeamMember, roles: CompanyRole[]): string {
	if (member.companyRoleId) return roles.find((r) => r.id === member.companyRoleId)?.name ?? "Rol propio";
	return member.role === "admin" ? "Administrador" : "Cajero";
}

export type AccountEquipoTabProps = {
	team: UseTeamReturn;
	onGoToPlan: () => void;
};

/**
 * Equipo del negocio: el CEO crea los usuarios de su panel hasta el tope de su plan (él
 * no cuenta) y les da un rol: administrador, cajero o uno propio con las secciones y
 * acciones que elija.
 */
export function AccountEquipoTab({ team, onGoToPlan }: AccountEquipoTabProps) {
	const { loading, error, ok, team: data } = team;

	if (!data) {
		return (
			<Card className="space-y-4 p-4 sm:p-5">
				<TeamHeading />
				{loading || !error ? (
					<div className="space-y-3">
						<Skeleton className="h-5 w-48" />
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
				) : (
					<Alert
						variant="danger"
						action={
							<Button variant="secondary" size="sm" onClick={() => void team.reload()}>
								Reintentar
							</Button>
						}
					>
						{error}
					</Alert>
				)}
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{error ? <Alert variant="danger">{error}</Alert> : null}
			{ok ? <Alert variant="success">{ok}</Alert> : null}
			<MembersCard team={team} data={data} onGoToPlan={onGoToPlan} />
			<RolesCard team={team} data={data} />
		</div>
	);
}

function TeamHeading() {
	return (
		<div className="space-y-1">
			<h2 className="flex items-center gap-2 text-base font-semibold text-[#1d1d1f]">
				<Users size={16} aria-hidden /> Tu equipo
			</h2>
			<p className="text-sm text-[#6e6e73]">Las personas que entran al panel de tu negocio y lo que puede hacer cada una.</p>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

function MembersCard({ team, data, onGoToPlan }: { team: UseTeamReturn; data: TeamSnapshot; onGoToPlan: () => void }) {
	const { members, roles, branches, seats } = data;
	const [editing, setEditing] = useState<TeamMember | "new" | null>(null);
	const { confirm, ConfirmDialogNode } = useConfirmDialog();
	const full = seats.limit != null && seats.used >= seats.limit;
	const branchName = (id: string | null) => (id ? branches.find((b) => b.id === id)?.name ?? "Sucursal" : null);

	const toggleActive = async (member: TeamMember) => {
		if (member.isActive) {
			const yes = await confirm({
				title: `¿Desactivar a ${member.email}?`,
				description: "No podrá entrar al panel y deja libre su cupo. Puedes volver a activarlo cuando quieras.",
				confirmLabel: "Desactivar",
				tone: "danger",
			});
			if (!yes) return;
		}
		await team.send("member", "PUT", { id: member.id, isActive: !member.isActive }, member.isActive ? "Usuario desactivado." : "Usuario activado.");
	};

	const remove = async (member: TeamMember) => {
		const yes = await confirm({
			title: `¿Borrar a ${member.email}?`,
			description: "Se borra su acceso al panel. Si ya tiene movimientos en tu negocio, mejor desactívalo.",
			confirmLabel: "Borrar",
			tone: "danger",
		});
		if (yes) await team.send("member", "DELETE", { id: member.id }, "Usuario borrado.");
	};

	return (
		<Card className="space-y-4 p-4 sm:p-5">
			{ConfirmDialogNode}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<TeamHeading />
				<Button
					variant="primary"
					size="sm"
					icon={<UserPlus size={14} />}
					disabled={full || team.saving}
					onClick={() => {
						team.clearFeedback();
						setEditing("new");
					}}
				>
					Agregar usuario
				</Button>
			</div>

			<div className="flex flex-wrap items-center gap-2 text-sm text-[#6e6e73]">
				<Badge variant={full ? "warning" : "neutral"}>
					{seats.limit == null ? `${seats.used} en tu equipo · sin tope` : `${seats.used} de ${seats.limit} usuarios`}
				</Badge>
				<span>Tu cuenta de CEO no cuenta.</span>
			</div>

			{full ? (
				<Alert
					variant="info"
					action={
						<Button variant="secondary" size="sm" onClick={onGoToPlan}>
							Ver planes
						</Button>
					}
				>
					{seats.limit === 0
						? "Tu plan no incluye usuarios para tu equipo."
						: "Llegaste al tope de usuarios de tu plan. Desactiva a alguien o pasa a un plan con más usuarios."}
				</Alert>
			) : null}

			{members.length === 0 ? (
				<p className="rounded-xl border border-dashed border-[#d2d2d7] px-4 py-6 text-center text-sm text-[#6e6e73]">
					Todavía no agregaste a nadie. Crea un usuario para tu cajero, tu encargado o quien atienda los pedidos.
				</p>
			) : (
				<ul className="divide-y divide-[#e5e5ea] rounded-xl border border-[#e5e5ea]">
					{members.map((member) => (
						<li key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3">
							<div className="min-w-0 space-y-1">
								<p className="truncate text-sm font-medium text-[#1d1d1f]">{member.fullName || member.email}</p>
								<div className="flex flex-wrap items-center gap-1.5 text-xs text-[#6e6e73]">
									{member.fullName ? <span className="truncate">{member.email}</span> : null}
									<Badge variant={member.role === "admin" ? "accent" : "neutral"}>{roleLabel(member, roles)}</Badge>
									{branchName(member.branchId) ? <span>{branchName(member.branchId)}</span> : null}
									{member.isActive ? null : <Badge variant="warning">Desactivado</Badge>}
								</div>
							</div>
							<div className="flex flex-wrap gap-1.5">
								<Button
									variant="ghost"
									size="sm"
									icon={<Pencil size={14} />}
									disabled={team.saving}
									onClick={() => {
										team.clearFeedback();
										setEditing(member);
									}}
								>
									Editar
								</Button>
								<Button
									variant="ghost"
									size="sm"
									disabled={team.saving || (!member.isActive && full)}
									onClick={() => void toggleActive(member)}
								>
									{member.isActive ? "Desactivar" : "Activar"}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									icon={<Trash2 size={14} />}
									aria-label={`Borrar a ${member.email}`}
									disabled={team.saving}
									onClick={() => void remove(member)}
								>
									Borrar
								</Button>
							</div>
						</li>
					))}
				</ul>
			)}

			{editing ? (
				<MemberDialog
					key={editing === "new" ? "new" : editing.id}
					team={team}
					data={data}
					member={editing === "new" ? null : editing}
					onClose={() => setEditing(null)}
				/>
			) : null}
		</Card>
	);
}

function MemberDialog({
	team,
	data,
	member,
	onClose,
}: {
	team: UseTeamReturn;
	data: TeamSnapshot;
	member: TeamMember | null;
	onClose: () => void;
}) {
	const [fullName, setFullName] = useState(member?.fullName ?? "");
	const [email, setEmail] = useState(member?.email ?? "");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState<RoleValue>(member ? roleValueOf(member) : data.roles[0] ? `role:${data.roles[0].id}` : "cashier");
	const [branchId, setBranchId] = useState(member?.branchId ?? data.branches[0]?.id ?? "");

	const submit = async (e: FormEvent) => {
		e.preventDefault();
		const common = { fullName: fullName.trim(), branchId: branchId || null, ...roleBody(role) };
		const saved = member
			? await team.send("member", "PUT", { id: member.id, ...common, ...(password ? { password } : {}) }, "Cambios guardados.")
			: await team.send("member", "POST", { ...common, email: email.trim(), password }, `Listo. ${email.trim()} ya puede entrar al panel.`);
		if (saved) onClose();
	};

	return (
		<Dialog
			open
			onOpenChange={(open) => (open ? null : onClose())}
			title={member ? "Editar usuario" : "Agregar usuario"}
			description={member ? member.email : "Con este correo y contraseña entra al panel de tu negocio."}
		>
			<form className="space-y-4" onSubmit={(e) => void submit(e)}>
				{team.error ? <Alert variant="danger">{team.error}</Alert> : null}
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="sm:col-span-2">
						<label htmlFor="team-name" className={labelClass}>
							Nombre (opcional)
						</label>
						<input id="team-name" className={inputClass} maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} />
					</div>
					{member ? null : (
						<div className="sm:col-span-2">
							<label htmlFor="team-email" className={labelClass}>
								Correo
							</label>
							<input
								id="team-email"
								type="email"
								required
								autoComplete="off"
								className={inputClass}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
					)}
					<div className="sm:col-span-2">
						<label htmlFor="team-password" className={labelClass}>
							{member ? "Nueva contraseña (opcional)" : "Contraseña"}
						</label>
						<input
							id="team-password"
							type="password"
							autoComplete="new-password"
							required={!member}
							minLength={8}
							className={inputClass}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
						<p className={hintClass}>
							{member ? "Déjala vacía para no cambiarla." : "Al menos 8 caracteres. Pásasela a esa persona; luego la puede cambiar."}
						</p>
					</div>
					<div>
						<label htmlFor="team-role" className={labelClass}>
							Rol
						</label>
						<select id="team-role" className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
							{data.roles.length > 0 ? (
								<optgroup label="Tus roles">
									{data.roles.map((r) => (
										<option key={r.id} value={`role:${r.id}`}>
											{r.name}
										</option>
									))}
								</optgroup>
							) : null}
							<optgroup label="Roles de GodCode">
								<option value="cashier">Cajero</option>
								<option value="admin">Administrador</option>
							</optgroup>
						</select>
					</div>
					<div>
						<label htmlFor="team-branch" className={labelClass}>
							Sucursal
						</label>
						<select id="team-branch" className={inputClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
							<option value="">Sin sucursal fija</option>
							{data.branches.map((b) => (
								<option key={b.id} value={b.id}>
									{b.name}
								</option>
							))}
						</select>
					</div>
				</div>
				<p className={hintClass}>
					{role === "admin"
						? "El administrador ve y hace todo en el panel, en todas tus sucursales."
						: "Trabaja en su sucursal: ve sus pedidos y su caja, más lo que permita su rol."}
				</p>
				<DialogFooter>
					<Button type="button" variant="ghost" disabled={team.saving} onClick={onClose}>
						Cancelar
					</Button>
					<Button type="submit" variant="primary" loading={team.saving}>
						{member ? "Guardar" : "Crear usuario"}
					</Button>
				</DialogFooter>
			</form>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Roles propios
// ---------------------------------------------------------------------------

function RolesCard({ team, data }: { team: UseTeamReturn; data: TeamSnapshot }) {
	const [editing, setEditing] = useState<CompanyRole | "new" | null>(null);
	const { confirm, ConfirmDialogNode } = useConfirmDialog();

	const remove = async (role: CompanyRole) => {
		const yes = await confirm({
			title: `¿Borrar el rol «${role.name}»?`,
			description: "Solo se puede borrar si nadie lo usa.",
			confirmLabel: "Borrar",
			tone: "danger",
		});
		if (yes) await team.send("role", "DELETE", { id: role.id }, "Rol borrado.");
	};

	return (
		<Card className="space-y-4 p-4 sm:p-5">
			{ConfirmDialogNode}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<h2 className="flex items-center gap-2 text-base font-semibold text-[#1d1d1f]">
						<ShieldCheck size={16} aria-hidden /> Roles
					</h2>
					<p className="text-sm text-[#6e6e73]">
						Crea roles a tu medida, como «Mesero» o «Cocina», y elige qué secciones del panel ven y qué pueden hacer.
					</p>
				</div>
				<Button
					variant="secondary"
					size="sm"
					icon={<Plus size={14} />}
					disabled={team.saving}
					onClick={() => {
						team.clearFeedback();
						setEditing("new");
					}}
				>
					Crear rol
				</Button>
			</div>

			<ul className="divide-y divide-[#e5e5ea] rounded-xl border border-[#e5e5ea]">
				<li className="space-y-1 px-3.5 py-3">
					<p className="text-sm font-medium text-[#1d1d1f]">Administrador</p>
					<p className="text-xs text-[#6e6e73]">Ve y hace todo en el panel, en todas tus sucursales.</p>
				</li>
				<li className="space-y-1 px-3.5 py-3">
					<p className="text-sm font-medium text-[#1d1d1f]">Cajero</p>
					<p className="text-xs text-[#6e6e73]">Pedidos y caja de su sucursal, como lo define GodCode.</p>
				</li>
				{data.roles.map((role) => (
					<li key={role.id} className="flex flex-wrap items-start justify-between gap-3 px-3.5 py-3">
						<div className="min-w-0 space-y-1.5">
							<p className="text-sm font-medium text-[#1d1d1f]">
								{role.name}{" "}
								<span className="font-normal text-[#6e6e73]">
									· {role.members === 1 ? "1 usuario" : `${role.members} usuarios`}
								</span>
							</p>
							<div className="flex flex-wrap gap-1">
								{role.navTabs.map((id) => (
									<Badge key={id} variant="neutral">
										{TAB_LABELS.get(id) ?? id}
									</Badge>
								))}
								{role.actions.map((key) => (
									<Badge key={key} variant="accent">
										{ACTION_LABELS.get(key) ?? key}
									</Badge>
								))}
							</div>
						</div>
						<div className="flex flex-wrap gap-1.5">
							<Button
								variant="ghost"
								size="sm"
								icon={<Pencil size={14} />}
								disabled={team.saving}
								onClick={() => {
									team.clearFeedback();
									setEditing(role);
								}}
							>
								Editar
							</Button>
							<Button
								variant="ghost"
								size="sm"
								icon={<Trash2 size={14} />}
								aria-label={`Borrar el rol ${role.name}`}
								disabled={team.saving || role.members > 0}
								title={role.members > 0 ? "Cámbiales el rol a sus usuarios antes de borrarlo" : undefined}
								onClick={() => void remove(role)}
							>
								Borrar
							</Button>
						</div>
					</li>
				))}
			</ul>

			{editing ? (
				<RoleDialog
					key={editing === "new" ? "new" : editing.id}
					team={team}
					availableTabs={data.availableTabs}
					role={editing === "new" ? null : editing}
					onClose={() => setEditing(null)}
				/>
			) : null}
		</Card>
	);
}

function RoleDialog({
	team,
	availableTabs,
	role,
	onClose,
}: {
	team: UseTeamReturn;
	availableTabs: string[];
	role: CompanyRole | null;
	onClose: () => void;
}) {
	const [name, setName] = useState(role?.name ?? "");
	const [navTabs, setNavTabs] = useState<string[]>(role?.navTabs ?? ["orders"].filter((id) => availableTabs.includes(id)));
	const [actions, setActions] = useState<string[]>(role?.actions ?? []);

	const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

	const submit = async (e: FormEvent) => {
		e.preventDefault();
		const body = { name: name.trim(), navTabs, actions };
		const saved = role
			? await team.send("role", "PUT", { id: role.id, ...body }, "Rol guardado. Quien lo tenga lo verá al volver a entrar al panel.")
			: await team.send("role", "POST", body, `Rol «${name.trim()}» creado. Ya puedes dárselo a tus usuarios.`);
		if (saved) onClose();
	};

	return (
		<Dialog
			open
			onOpenChange={(open) => (open ? null : onClose())}
			title={role ? `Editar «${role.name}»` : "Crear rol"}
			description="Trabaja en su sucursal, como un cajero, con las secciones y permisos que marques."
			size="lg"
		>
			<form className="space-y-5" onSubmit={(e) => void submit(e)}>
				{team.error ? <Alert variant="danger">{team.error}</Alert> : null}
				<div>
					<label htmlFor="role-name" className={labelClass}>
						Nombre
					</label>
					<input
						id="role-name"
						required
						maxLength={40}
						className={inputClass}
						placeholder="Mesero, Cocina, Encargado…"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>

				<fieldset className="space-y-2">
					<legend className={labelClass}>Secciones del panel que ve</legend>
					<div className="grid gap-2 sm:grid-cols-2">
						{availableTabs.map((id) => (
							<label key={id} className="flex items-start gap-2 text-sm text-[#1d1d1f]">
								<input
									type="checkbox"
									className={checkboxClass}
									checked={navTabs.includes(id)}
									onChange={() => setNavTabs((prev) => toggle(prev, id))}
								/>
								{TAB_LABELS.get(id) ?? id}
							</label>
						))}
					</div>
				</fieldset>

				<fieldset className="space-y-2">
					<legend className={labelClass}>Qué más puede hacer</legend>
					<div className="space-y-2">
						{ROLE_ACTION_OPTIONS.map((action) => (
							<label key={action.key} className="flex items-start gap-2 text-sm text-[#1d1d1f]">
								<input
									type="checkbox"
									className={checkboxClass}
									checked={actions.includes(action.key)}
									onChange={() => setActions((prev) => toggle(prev, action.key))}
								/>
								<span>
									{action.label}
									<span className="block text-xs text-[#6e6e73]">{action.description}</span>
								</span>
							</label>
						))}
					</div>
				</fieldset>

				<DialogFooter>
					<Button type="button" variant="ghost" disabled={team.saving} onClick={onClose}>
						Cancelar
					</Button>
					<Button type="submit" variant="primary" loading={team.saving} disabled={navTabs.length === 0}>
						{role ? "Guardar" : "Crear rol"}
					</Button>
				</DialogFooter>
			</form>
		</Dialog>
	);
}
