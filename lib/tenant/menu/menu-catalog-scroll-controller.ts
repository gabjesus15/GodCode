export type MenuCatalogScrollController = {
	isVirtualized: boolean;
	/**
	 * Desplaza hasta la sección y llama a `onSettled` cuando el scroll terminó
	 * de verdad (con correcciones incluidas). Devuelve cómo cancelarlo.
	 */
	scrollToSection: (sectionId: string, behavior?: ScrollBehavior, onSettled?: () => void) => () => void;
};