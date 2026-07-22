"use client";

/* eslint-disable no-console */

import { useEffect } from "react";

/** Silencia console.* en el navegador (solo producción). */
export function SilentConsole() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "production") return;

		const noop = () => {};
		console.log = noop;
		console.debug = noop;
		console.info = noop;
		console.warn = noop;
		console.error = noop;
		console.trace = noop;
		console.table = noop;
		console.group = noop;
		console.groupCollapsed = noop;
		console.groupEnd = noop;
	}, []);

	return null;
}
