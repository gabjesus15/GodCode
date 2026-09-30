/**
 * Anuncio para Instagram «La hora de la cena» (Rica Pizza, Gcode POS). Privado: usa rutas internas.
 * Público: negocios con menú tradicional que atienden pedidos a mano por WhatsApp.
 * Estructura: gancho (el teléfono del dueño explota de mensajes) → solución (el cliente pide solo, con
 * saltos de pasos) → recompensa (llega un pedido completo) → llamado a la acción.
 *
 *   node ~/.claude/skills/ui-demo-video/scripts/voiceover.cjs  scripts/video/anuncio-hora-de-la-cena.cjs out
 *   node ~/.claude/skills/ui-demo-video/scripts/record-demo.cjs scripts/video/anuncio-hora-de-la-cena.cjs out master --safe=instagram
 *
 * Rica Pizza es un negocio REAL y la base local es la real: el pedido se responde en falso (network.fakes).
 */
const base = require('./asi-pide-tu-cliente.cjs');

module.exports = {
	name: 'anuncio-hora-de-la-cena',
	appOrigin: base.appOrigin,
	stageOrigin: base.stageOrigin,
	stageBlankPath: base.stageBlankPath,
	embedPathPrefix: base.embedPathPrefix,
	// Directo a la carta: la página de inicio es un paso que el anuncio se salta.
	urls: { main: '/rica-pizza/menu' },
	frameCss: base.frameCss,
	brand: base.brand,

	// Títulos en su franja (nunca encima de la app) y efectos de sonido.
	video: { band: true, sfx: true },

	// Ubicación simulada del cliente (a ~4 km del local, dentro de su zona de delivery).
	geolocation: { latitude: 11.0172, longitude: -63.8561, accuracy: 20 },

	voice: {
		voiceId: 'JddqVF50ZSIR7SRbJE6u', // Valeria - Casual, Friendly and Chatty (biblioteca de ElevenLabs, plan pago)
		model: 'eleven_multilingual_v2',
		settings: { stability: 0.38, similarity_boost: 0.8, style: 0.4, speed: 1.1 },
		lines: {
			hook: '¿A tu WhatsApp también le pasa esto en cada turno?',
			solito: 'Con Gcode, tu cliente pide solito:',
			carta: 'entra a tu menú, ve fotos y precios, y elige.',
			carrito: 'Revisa su carrito…',
			delivery: '¿A domicilio? El envío se calcula solo, según la distancia.',
			pago: 'Selecciona los métodos de pago que tu menú permita…',
			listo: 'Confirma… ¡y listo!',
			caja: 'Y a ti te llega tu orden al instante, con todos los detalles.',
			cta: 'Crea tu menú con Gcode, y deja el chat para los amigos.',
		},
	},

	copy: {
		hook: {
			style: 'lock', // pantalla bloqueada del dueño con notificaciones que no paran
			time: '12:47', // hora del almuerzo: sirve para locales de día y de noche
			date: 'viernes',
			icon: '💬',
			unread: 3,
			messages: [
				{ from: 'María', text: 'Holaaa, ¿me pasas el menú? 🙏' },
				{ from: 'Carlos', text: '¿Cuánto cuesta la familiar?' },
				{ from: 'Ana', text: '¿Hacen delivery?' },
				{ from: 'José', text: '¿Aceptan pago móvil?' },
				{ from: 'Luis', text: '¿Siguen abiertos?' },
				{ from: 'Rosa', text: '¿Cuánto es el envío a Porlamar?' },
				{ from: 'Pedro', text: 'Buenas, ¿tienen menú? 👀' },
				{ from: 'María', text: '¿Y la de champiñones?' },
				{ from: 'Carlos', text: 'hola??' },
				{ from: 'Ana', text: '???' },
				{ from: 'José', text: '¿Me mandas foto de las pizzas?' },
				{ from: 'Luis', text: 'Holaaaa' },
				{ from: 'Pedro', text: 'Quiero 2 grandes… no, mejor 3' },
				{ from: 'Rosa', text: '¿Ya viene mi pedido? 😅' },
				{ from: 'María', text: 'Al final, ¿cuánto te debo?' },
				{ from: 'Carlos', text: '??' },
				{ from: 'Ana', text: '¿Tienen algo sin cebolla?' },
				{ from: 'José', text: 'Te llamo mejor' },
				{ from: 'Luis', text: '¿Me repites el total?' },
				{ from: 'Pedro', text: 'Holaaa' },
				{ from: 'Rosa', text: '¿Me pasas el menú otra vez?' },
				{ from: 'María', text: '🍕🍕🍕' },
				{ from: 'Carlos', text: '¿Hacen delivery a Pampatar?' },
				{ from: 'Ana', text: 'hola??' },
				{ from: 'José', text: '¿Ya me anotaste?' },
				{ from: 'Luis', text: '???' },
				{ from: 'Pedro', text: '¿Cuánto tarda?' },
				{ from: 'Rosa', text: '¿Me pasas el menú? 🙏' },
				{ from: 'María', text: 'holaaaa' },
				{ from: 'Carlos', text: '¿?' },
			],
		},
		celebrate: '¡Y listo!',
		celebrateSub: '',
		outro: 'Deja el chat para los amigos',
		outroKey: [4],
		cta: 'Crea tu menú digital →',
	},

	network: {
		...base.network,
		fakes: [
			...base.network.fakes,
			// Dirección de la ubicación simulada, la misma que devuelve el servicio real (Nominatim vía el servidor),
			// que a veces tarda 10 s o falla. Es una lectura.
			{ match: /\/api\/geo\/reverse-geocode/, method: 'GET', label: 'dirección de la ubicación (lectura)', body: { line1: 'Guatamare', commune: 'Municipio Arismendi' } },
		],
		// Lecturas del delivery (cotizar el envío, ubicar la dirección): no escriben en la base.
		allowWrites: [...base.network.allowWrites, /\/api\/geo\/delivery-quote/, /\/api\/geo\/delivery-geocode/],
	},

	async warmUp({ page, app, sleep }) {
		const click = (loc) => loc.evaluate((n) => n.click()).then(() => sleep(700));
		await page.goto(`${app}/rica-pizza/menu`, { waitUntil: 'networkidle' });
		await sleep(5000);
		for (let i = 0; i < 20; i++) {
			await page.getByText('La Corner Champignon', { exact: true }).locator('visible=true').first().evaluate((n) => n.click());
			if (await page.getByRole('button', { name: /^Agregar ·/ }).waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false)) break;
		}
		await click(page.getByRole('button', { name: /^Agregar ·/ }));
		await click(page.locator('button', { hasText: /^\s*Listo\s*$/ }));
		await click(page.getByRole('button', { name: /^Carrito/ }));
		await click(page.getByRole('button', { name: 'Ir a pagar' }));
		await click(page.getByRole('radio', { name: 'Delivery' }));
		await click(page.locator('button.cart-locate__btn'));
		await page.locator('section.cart-address-card').waitFor({ timeout: 60000 });
		await page.locator('#cart-delivery-reference').fill('Portón negro');
		await page.locator('div.cart-ship:not([data-state])').waitFor({ timeout: 60000 });
		await sleep(1500);
		await click(page.getByRole('button', { name: 'Continuar a métodos de pago' }));
		await click(page.locator('button', { hasText: 'Efectivo' }).first());
		await page.getByPlaceholder('Tu nombre').fill('Ensayo');
		await page.getByPlaceholder('V-12345678').fill('V-10000000');
		await page.getByPlaceholder('+58 412 123 4567').fill('+58 412 000 0000');
		await click(page.getByRole('button', { name: 'Confirmar pedido' }));
		await page.getByText('¡Pedido recibido!').waitFor({ timeout: 60000 });
	},

	async run(api) {
		const { sleep, cam, caption, tap, smoothScroll, say } = api;
		const f = () => api.frame();
		// Fuera de cámara no hay dedo: clic directo del DOM y esperar lo que aparece.
		const click = async (loc, then) => { await loc.waitFor({ state: 'visible', timeout: api.waitMs }); await loc.evaluate((n) => n.click()); if (then) await then.waitFor({ state: 'visible', timeout: api.waitMs }); };

		// 1) GANCHO — el teléfono del dueño en pleno turno (3 s: una sola pregunta)
		await sleep(60);
		await api.hook(150);
		await say('hook');
		await sleep(350);
		await api.hookTitle('¿Te pasa en cada turno?', [4]);
		await api.waitVoice(80);

		// 2) SOLUCIÓN — el cliente pide solo (directo a la carta). Todo encadenado: sin pausas.
		const dur = (id) => api.voiceDuration(id) * 1000;
		await api.hookOut();
		await say('solito');
		await caption('Tu menú digital', [2]);
		// Un solo encuadre para carta y carrito (0,8: se ve la pantalla entera, también el botón «Agregar» de abajo).
		await cam(0, 60, 0.8, { ms: 750 });
		await sleep(300);
		// Mientras habla, la carta baja: el scroll dura lo que queda de la frase.
		await smoothScroll(800, Math.max(1100, dur('solito') - 350));

		await say('carta');
		await caption('Elige en un toque', [2, 3]);
		await smoothScroll(-680, 900);
		await tap(f().getByText('La Corner Champignon', { exact: true }).first(), { travel: 320 });
		await f().getByRole('button', { name: /^Agregar ·/ }).waitFor({ state: 'visible', timeout: api.waitMs });
		await sleep(250);
		await tap(f().getByRole('button', { name: /^Agregar ·/ }), { travel: 300 });
		await sleep(120);
		await tap(f().locator('button', { hasText: /^\s*Listo\s*$/ }), { travel: 260 });

		// Carrito a la vista: se abre, se ve lo que lleva y el total, y a pagar
		await api.waitVoice(0);
		await say('carrito');
		await caption('Revisa su carrito', [2]);
		await tap(f().getByRole('button', { name: /^Carrito/ }), { travel: 300 });
		await f().getByRole('button', { name: 'Ir a pagar' }).waitFor({ state: 'visible', timeout: api.waitMs });
		await sleep(450);
		await tap(f().getByRole('button', { name: 'Ir a pagar' }), { travel: 280 });
		await f().getByRole('radio', { name: 'Delivery' }).waitFor({ state: 'visible', timeout: api.waitMs });

		// 3) DELIVERY — ubicación, mapa y envío calculado
		await api.waitVoice(0);
		await say('delivery');
		await caption('Delivery sin llamadas', [2]);
		// Checkout: un acercamiento al entrar y después uno lento y continuo (nada de ir y volver).
		await api.focus(f().getByRole('radio', { name: 'Delivery' }), { scale: 1, ms: 650 });
		await tap(f().getByRole('radio', { name: 'Delivery' }), { travel: 280 });
		await sleep(120);
		await tap(f().locator('button.cart-locate__btn'), { travel: 280 });
		await f().locator('section.cart-address-card').waitFor({ timeout: api.waitMs });
		await f().locator('#cart-delivery-reference').fill('Portón negro');
		await api.fingerHide();
		// Mapa, indicaciones y costo de envío quedan en cuadro; la cámara se acerca despacio lo que dure la frase.
		await api.focus(f().locator('#cart-delivery-reference'), { scale: 1.12, ms: Math.max(1200, api.voiceLeft()) });
		await f().locator('div.cart-ship:not([data-state])').waitFor({ timeout: api.waitMs });
		await api.waitVoice(0);

		// Métodos de pago a la vista
		await say('pago');
		await caption('Elige cómo pagar', [2, 3]);
		await tap(f().getByRole('button', { name: 'Continuar a métodos de pago' }), { travel: 280 });
		await f().locator('button', { hasText: 'Efectivo' }).first().waitFor({ state: 'visible', timeout: api.waitMs });
		await api.focus(f().locator('button', { hasText: 'Tarjeta' }).first(), { scale: 1, ms: 600 });
		await sleep(350);
		await tap(f().locator('button', { hasText: 'Efectivo' }).first(), { travel: 300 });
		await f().getByPlaceholder('Tu nombre').waitFor({ state: 'visible', timeout: api.waitMs });
		// Arriba queda el resumen con «Pago: Efectivo»: acercamiento lento ahí mientras termina la frase.
		await api.fingerHide();
		if (api.voiceLeft() > 300) await api.focus(f().getByText('Efectivo', { exact: true }).first(), { scale: 1.12, ms: Math.max(700, api.voiceLeft()) });
		await api.waitVoice(0);

		// Salto: los datos (inventados) se llenan fuera de cámara
		await api.fingerHide();
		await api.cut(async () => {
			await f().getByPlaceholder('Tu nombre').fill('Camila Rojas');
			await f().getByPlaceholder('V-12345678').fill('V-24567890');
			await f().getByPlaceholder('+58 412 123 4567').fill('+58 412 555 0199');
			await api.focus(f().getByRole('button', { name: 'Confirmar pedido' }), { scale: 1, ms: 250 });
		});

		// 4) CONFIRMA → ¡y listo!
		await say('listo');
		await caption('Confirma y listo', [2]);
		await tap(f().getByRole('button', { name: 'Confirmar pedido' }), { travel: 300 });
		await f().getByText('¡Pedido recibido!').waitFor({ timeout: api.waitMs }); // confirmación REAL de la app, pedido FALSO
		await api.fingerHide();
		await caption('');
		await cam(0, 300, 0.62, { ms: 600, free: true });
		await api.celebrate();
		await api.waitVoice(120);

		// 5) RECOMPENSA — llega un pedido completo (los datos del pedido falso de la toma)
		await say('caja');
		await cam(0, 1150, 0.6, { ms: 600, free: true });
		await api.ticket({ label: 'NUEVO PEDIDO · #214', title: 'Delivery · Camila R.', rows: [['1× La Corner Champignon', '$14.00'], ['Envío (~4 km)', '$2.00'], ['Pago', 'Efectivo']], total: '$16.00' });
		await api.waitVoice(150);

		// 6) LLAMADO A LA ACCIÓN
		await api.ticket(null);
		await api.outro();
		await sleep(350);
		await say('cta');
		await api.waitVoice(700);
	},
};
