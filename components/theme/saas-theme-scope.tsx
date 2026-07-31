const STORAGE_KEY = "saas-theme";

export function forceLightTheme() {
	if (typeof document === "undefined") return;
	try {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
		window.localStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
}

export const LIGHT_ONLY_THEME_SCRIPT = `
(function() {
	try {
		document.documentElement.classList.remove('dark');
		document.documentElement.setAttribute('data-theme', 'light');
		localStorage.removeItem('${STORAGE_KEY}');
	} catch (_) {}
})();
`;
