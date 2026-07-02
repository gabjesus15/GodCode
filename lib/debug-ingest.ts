export function debugIngest(payload: Record<string, unknown>) {
	if (typeof window === "undefined") return;
	fetch("/api/debug-ingest", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ sessionId: "8331ef", timestamp: Date.now(), ...payload }),
	}).catch(() => {});
}
