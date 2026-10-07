import { notFound } from "next/navigation";

import { PickerPlayground } from "./playground";

/** Laboratorio del selector de plantillas (el de «Tienda» en /cuenta): solo en desarrollo. */
export default async function MenuTemplatePickerLab({ searchParams }: { searchParams: Promise<{ sector?: string }> }) {
	if (process.env.NODE_ENV === "production") notFound();
	const { sector } = await searchParams;
	return <PickerPlayground sector={sector ?? null} />;
}
