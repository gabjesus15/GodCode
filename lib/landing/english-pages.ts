import { LANDING_PRODUCT_NAME } from "./brand";
import type { LANDING_ENGLISH_SLUG_LIST } from "./marketing-paths";

/**
 * English pages for the US market (/en, /en/online-ordering…).
 *
 * Head terms like «restaurant POS» belong to Toast, Square and Clover; these pages go after
 * longer searches a small product can win («commission-free online ordering», «QR code menu
 * for restaurants») and after Spanish-speaking owners who also read English.
 *
 * Rules, same as the Spanish pages:
 * - Only what works today for a US restaurant (checkout without ID and with +1, cents,
 *   one sales tax rate per location, menu in English). No in-menu card payments, no
 *   courier dispatch, no miles: the pages say so instead of hiding it.
 * - Each page has its own copy. `spanishPath` is the same page in Spanish (hreflang).
 */

export type LandingEnglishSlug = (typeof LANDING_ENGLISH_SLUG_LIST)[number];

type EnglishItem = { title: string; text: string };
type EnglishFaq = { question: string; answer: string };

export type LandingEnglishPage = {
	slug: LandingEnglishSlug;
	label: string;
	/** The root template adds « · Gcode Labs». ≤ 60 characters in total. */
	metaTitle: string;
	metaDescription: string;
	keywords: string[];
	heroTitle: [string, string];
	heroSubtitle: string;
	teaser: string;
	guideTitle: string;
	guide: EnglishItem[];
	steps: EnglishItem[];
	faq: EnglishFaq[];
	/** The same page in Spanish, for hreflang. */
	spanishPath: string;
};

const ONLINE_ORDERING: LandingEnglishPage = {
	slug: "online-ordering",
	label: "Online ordering",
	metaTitle: "Commission-free online ordering for restaurants",
	metaDescription:
		"Your own online ordering link for pickup and delivery: orders arrive complete on WhatsApp, in your POS or both. A flat monthly plan in USD, no commission per order.",
	keywords: [
		"commission-free online ordering",
		"online ordering system for restaurants",
		"restaurant online ordering without fees",
		"DoorDash alternative for restaurants",
		"WhatsApp ordering for restaurants",
	],
	heroTitle: ["Commission-free online ordering for", "restaurants"],
	heroSubtitle:
		"Customers order from your own link or QR code, for pickup or delivery. The order reaches you complete, with items, address, payment method and total, and you keep the whole sale.",
	teaser: "Your own ordering link for pickup and delivery, with no commission per order.",
	guideTitle: "What your own ordering system should do",
	guide: [
		{
			title: "Orders that arrive complete",
			text: "Every item with its size, options and notes, the delivery address, the payment method and the total with sales tax. No back-and-forth to confirm what the customer meant.",
		},
		{
			title: "Choose where orders land",
			text: "Send orders to WhatsApp, to your POS, or to both. You can change it at any time without changing your link.",
		},
		{
			title: "Prices in dollars, with tax",
			text: "Prices keep their cents, and the sales tax rate you set for each location is added on top, so the customer sees the real total before ordering.",
		},
		{
			title: "Coupons and payment receipts",
			text: "Customers can apply a discount coupon. If they pay by Zelle or PayPal, they attach the receipt to the order and you confirm it in your POS.",
		},
	],
	steps: [
		{ title: "The customer builds the order", text: "Picks items, sizes and options on your menu, and chooses pickup or delivery." },
		{ title: "They choose how to pay", text: "Cash or card at pickup or delivery, or Zelle or PayPal with a receipt." },
		{ title: "You get it in one place", text: "On WhatsApp with the message ready, in your POS as an order, or both." },
	],
	faq: [
		{
			question: "Do you charge a fee per order?",
			answer: `No. ${LANDING_PRODUCT_NAME} is a flat monthly plan in USD. Orders that come through your own link pay no percentage.`,
		},
		{
			question: "Can customers pay by card inside the menu?",
			answer:
				"Not yet. Today customers pay cash or card when they pick up or receive the order, or send a Zelle or PayPal payment and attach the receipt. In-menu card checkout is not available.",
		},
		{
			question: "Do I have to leave DoorDash or Uber Eats?",
			answer:
				"No. Many restaurants stay on the apps to reach new customers and move their regulars to their own link, where the order carries no commission.",
		},
	],
	spanishPath: "/funciones/pedidos-online",
};

const QR_CODE_MENU: LandingEnglishPage = {
	slug: "qr-code-menu",
	label: "QR code menu",
	metaTitle: "QR code menu for restaurants",
	metaDescription:
		"A QR code menu that never needs reprinting: photos, sizes and options, a printable table card, and prices you update in seconds. Guests order from the same link.",
	keywords: [
		"QR code menu for restaurants",
		"digital menu QR code",
		"dynamic QR menu",
		"contactless menu",
		"QR menu with online ordering",
	],
	heroTitle: ["A QR code menu for", "your restaurant"],
	heroSubtitle:
		"Guests scan the code on the table and see your menu with photos and current prices, with no app to download. The same link takes pickup and delivery orders.",
	teaser: "A QR code that never changes, a printable table card and a menu that is always current.",
	guideTitle: "What a good QR code menu needs",
	guide: [
		{
			title: "A link, not a PDF",
			text: "The code points to your live menu. Change a price or a dish in the dashboard and every printed code shows the update right away.",
		},
		{
			title: "A table card ready to print",
			text: "Download an image with your restaurant name, the QR code and your menu address, sized to print and place on each table.",
		},
		{
			title: "Photos, sizes and options",
			text: "Each dish with its photo and, when it has them, its sizes and options with their prices, so guests know what they are ordering.",
		},
		{
			title: "Opening hours and a pause button",
			text: "Outside your hours the menu says you are closed, and when the kitchen is slammed you can pause orders without taking the menu down.",
		},
	],
	steps: [
		{ title: "Build your menu", text: "Start from a sample menu for your type of restaurant and swap in your dishes, photos and prices." },
		{ title: "Download the QR code", text: "When you publish, download the table card and print it." },
		{ title: "Guests scan", text: "They see the menu on their phone, in English, with current prices." },
	],
	faq: [
		{
			question: "Do guests need to download an app?",
			answer: "No. The QR code opens your menu in the phone's browser, on any brand, with nothing to install.",
		},
		{
			question: "Do I need a new QR code when prices change?",
			answer: "No. The code always points to the same link, and whatever you change in the dashboard shows up immediately.",
		},
		{
			question: "Can I use the same menu on Instagram and Google?",
			answer: "Yes. The menu link works the same in your Instagram bio, your Google Business profile and the QR code on the table.",
		},
	],
	spanishPath: "/funciones/menu-qr",
};

const RESTAURANT_POS: LandingEnglishPage = {
	slug: "restaurant-pos",
	label: "Restaurant POS",
	metaTitle: "Browser-based POS for small restaurants",
	metaDescription:
		"A restaurant POS that runs in your browser: shifts, counter and online orders in one queue, kitchen orders and a close-out by payment method. No hardware.",
	keywords: [
		"browser-based restaurant POS",
		"POS for small restaurants",
		"restaurant POS without hardware",
		"simple restaurant POS",
		"POS with online ordering",
	],
	heroTitle: ["A browser-based POS for", "small restaurants"],
	heroSubtitle:
		"Open the shift, take counter orders next to the ones from your online menu, send them to the kitchen and close out with the total for each payment method. On the computer, tablet or phone you already have.",
	teaser: "Shifts, one order queue and a close-out by payment method, on the device you already have.",
	guideTitle: "What a small restaurant needs from a POS",
	guide: [
		{
			title: "One queue for every order",
			text: "Counter orders and online orders land in the same shift, so nothing gets lost when two screens compete for attention during the rush.",
		},
		{
			title: "Orders the kitchen can read",
			text: "Each order goes to the kitchen with its sizes, options and notes like «no onions», with no need to rewrite it.",
		},
		{
			title: "A close-out that adds up",
			text: "At the end of the shift you see the total for cash, card, Zelle and every method you accept, ready to reconcile.",
		},
		{
			title: "No hardware to buy",
			text: "It runs in the browser of a computer, tablet or phone. Keep the card reader from your bank or processor and record card payments in the POS.",
		},
	],
	steps: [
		{ title: "Open the shift", text: "From then on your online menu accepts orders and the POS starts recording." },
		{ title: "Sell on both sides", text: "Take counter orders and receive online orders on the same screen." },
		{ title: "Close out", text: "Get the shift total by payment method, ready to reconcile." },
	],
	faq: [
		{
			question: "Is this a card reader?",
			answer:
				"No. It is the POS software, not the card terminal. You keep charging cards with your current reader and mark the payment as card in the POS.",
		},
		{
			question: "Why does the online menu stop taking orders when the POS is closed?",
			answer:
				"When online orders go to your POS, the menu only accepts them during an open shift, so no order arrives while nobody is watching.",
		},
		{
			question: "Is the dashboard in English?",
			answer:
				"The menu your customers use is in English. The owner dashboard and the POS are in Spanish today, which suits Spanish-speaking owners and teams.",
		},
	],
	spanishPath: "/funciones/punto-de-venta",
};

export const LANDING_ENGLISH_PAGES: Record<LandingEnglishSlug, LandingEnglishPage> = {
	"online-ordering": ONLINE_ORDERING,
	"qr-code-menu": QR_CODE_MENU,
	"restaurant-pos": RESTAURANT_POS,
};

export const LANDING_ENGLISH_SLUGS = Object.keys(LANDING_ENGLISH_PAGES) as LandingEnglishSlug[];

export function isLandingEnglishSlug(value: string): value is LandingEnglishSlug {
	return Object.hasOwn(LANDING_ENGLISH_PAGES, value);
}

/** The English home (/en): what the product is, what works in the US today, and its questions. */
export const LANDING_ENGLISH_HOME = {
	metaTitle: "Online ordering and QR menus for restaurants",
	metaDescription:
		"Commission-free online ordering, QR code menus and a browser-based POS for restaurants in the US. Flat monthly plan in USD, menu in English, dashboard in Spanish.",
	heroTitle: ["Online ordering and QR menus,", "without the commission"] as [string, string],
	heroSubtitle:
		"Your own menu link for pickup and delivery, a QR code for the tables and a POS in the browser. One flat monthly plan in USD, with no percentage of your sales.",
	worksTitle: "What works for US restaurants today",
	works: [
		"Menu and checkout in English, with US phone numbers and no ID required",
		"Prices in USD with cents, plus your sales tax rate per location",
		"Pickup and in-house delivery, priced by distance (km) or by zones you define",
		"Cash or card at pickup, Zelle or PayPal with a payment receipt",
		"Orders on WhatsApp, in your POS, or both",
	],
	notYetTitle: "Not available yet",
	notYet: [
		"Card payments inside the menu (Stripe, Apple Pay, Google Pay)",
		"Courier dispatch through Uber or DoorDash Drive",
		"Delivery distances in miles and sales tax by address",
	],
	faq: [
		{
			question: `What does ${LANDING_PRODUCT_NAME} cost in the US?`,
			answer:
				"Building your store is free. You pay when you publish it, with a flat monthly plan in USD paid through PayPal. There is no commission per sale, and your first payment covers 2 months.",
		},
		{
			question: "Who is it for?",
			answer:
				"Independent restaurants, food trucks and cafés that want their own ordering channel. The dashboard is in Spanish today, so it fits Spanish-speaking owners best.",
		},
		{
			question: "Can I cancel anytime?",
			answer: "Yes. There is no contract and no cancellation fee.",
		},
	],
} as const;
