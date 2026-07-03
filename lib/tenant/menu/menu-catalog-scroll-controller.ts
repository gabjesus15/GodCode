export type MenuCatalogScrollController = {
	isVirtualized: boolean;
	scrollToSection: (sectionId: string, behavior?: ScrollBehavior) => void;
};