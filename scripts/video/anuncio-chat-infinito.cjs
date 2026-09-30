/**
 * Anuncio para Instagram «El chat infinito» (Rica Pizza, Gcode POS). Privado: usa rutas internas.
 * Público: negocios con menú tradicional que toman pedidos a mano por WhatsApp. Pedido con delivery.
 * Motor y guía: skill ui-demo-video (~/.claude/skills/ui-demo-video).
 *
 *   node ~/.claude/skills/ui-demo-video/scripts/voiceover.cjs  scripts/video/anuncio-chat-infinito.cjs out
 *   node ~/.claude/skills/ui-demo-video/scripts/record-demo.cjs scripts/video/anuncio-chat-infinito.cjs out master --safe=instagram
 *
 * Rica Pizza es un negocio REAL y la base local es la real: el pedido se responde en falso (network.fakes).
 */
const base = require('./asi-pide-tu-cliente.cjs');

module.exports = {
	...base,
	name: 'anuncio-chat-infinito',

	// Ubicación simulada del cliente (a ~4 km del local, dentro de su zona de delivery).
	geolocation: { latitude: 11.0172, longitude: -63.8561, accuracy: 20 },

	voice: {
		voiceId: 'JddqVF50ZSIR7SRbJE6u', // Valeria - Casual, Friendly and Chatty (biblioteca de ElevenLabs)
		model: 'eleven_multilingual_v2',
		settings: { stability: 0.4, similarity_boost: 0.8, style: 0.35, speed: 1.1 },
		lines: {
			hook: 'Si tienes restaurante, ya te sabes esta canción…',
			pizza: '¡Y mientras respondes, se te enfría la pizza!',
			respira: 'Respira: con Gcode, tu cliente pide solito desde tu menú.',
			carta: 'Ve la carta con fotos y precios… y se le antoja todo.',
			delivery: '¿Lo quiere en casa? Pone su ubicación y el envío se calcula solo.',
			pago: 'Elige cómo pagar, confirma…',
			listo: '¡Y listo!',
			caja: 'El pedido te llega completo, directo a tu caja.',
			cta: 'Deja el chat para los amigos: crea tu menú con Gcode.',
		},
	},

	copy: {
		...base.copy,
		hook: {
			chatName: 'Pedidos del local',
			status: '8 personas escribiendo…',
			avatar: '🍕',
			unread: 4,
			messages: [
				{ from: 'María', text: 'Holaaa, ¿me pasas el menú? 🙏' },
				{ from: 'Carlos', text: '¿Cuánto cuesta la familiar?' },
				{ from: 'Ana', text: '¿Hacen delivery?' },
				{ from: 'José', text: '¿Aceptan pago móvil?' },
				{ from: 'Luis', text: '¿Siguen abiertos?' },
				{ from: 'María', text: '¿Y la de champiñones?' },
				{ from: 'Carlos', text: 'hola??' },
				{ from: 'Ana', text: '???' },
				{ from: 'Pedro', text: 'Buenas, ¿tienen menú? 👀' },
				{ from: 'Luis', text: 'Holaaaa' },
				{ from: 'Rosa', text: '¿Cuánto es el delivery a Porlamar?' },
				{ from: 'José', text: '¿Me mandas foto de las pizzas?' },
				{ from: 'Pedro', text: 'Quiero 2 grandes… no, mejor 3' },
				{ from: 'Ana', text: '¿Ya viene mi pedido? 😅' },
				{ from: 'María', text: 'Al final, ¿cuánto te debo?' },
				{ from: 'Carlos', text: '??' },
			],
		},
		celebrate: '¡Y listo!',
		celebrateSub: 'Pedido recibido en la caja del local',
		outro: 'Deja el chat para los amigos',
		outroKey: [4],
		cta: 'Crea tu menú digital →',
	},

	network: {
		...base.network,
		fakes: [
			...base.network.fakes,
			// Dirección de la ubicación simulada, la misma que devuelve el servicio real. Ese servicio (Nominatim, vía
			// el servidor) a veces tarda 10 s o falla, y la toma no debe depender de eso. Es una lectura.
			{ match: /\/api\/geo\/reverse-geocode/, method: 'GET', label: 'dirección de la ubicación (lectura)', body: { line1: 'Guatamare', commune: 'Municipio Arismendi' } },
		],
		// Lecturas del delivery (cotizar el envío, ubicar la dirección): no escriben en la base.
		allowWrites: [...base.network.allowWrites, /\/api\/geo\/delivery-quote/, /\/api\/geo\/delivery-geocode/],
	},

	async warmUp({ page, app, sleep }) {
		const click = (loc) => loc.evaluate((n) => n.click()).then(() => sleep(700));
		await page.goto(`${app}/rica-pizza`, { waitUntil: 'networkidle' });
		await page.goto(`${app}/rica-pizza/menu`, { waitUntil: 'networkidle' });
		await sleep(5000);
		for (let i = 0; i < 20; i++) {
			await page.getByText('La Corner Champignon', { exact: true }).locator('visible=true').first().evaluate((n) => n.click());
			if (await page.getByRole('button', { name: /^Agregar ·/ }).waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false)) break;
		}
		await click(page.getByRole('button', { name: /^Agregar ·/ }));
		await click(page.locator('button', { hasText: /^\s*Listo\s*$/ }));
		await click(page.locator('button[aria-label="Agregar Suprema Rica Pizza al carrito"]'));
		await click(page.getByRole('button', { name: /^Carrito/ }));
		await click(page.getByRole('button', { name: 'Ir a pagar' }));
		await click(page.getByRole('radio', { name: 'Delivery' }));
		await click(page.locator('button.cart-locate__btn'));
		await page.locator('section.cart-address-card').waitFor({ timeout: 60000 });
		await page.locator('#cart-delivery-reference').fill('Casa blanca, portón negro');
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
		const { sleep, cam, caption, tap, typeInto, smoothScroll, say } = api;
		const f = () => api.frame();
		const dur = (id) => api.voiceDuration(id) * 1000;

		// GANCHO: el chat que no para (sin intro de marca: el primer segundo tiene que frenar el scroll)
		await sleep(100);
		await api.hook(300);
		await say('hook');
		await sleep(650);
		await api.hookTitle('¿Todavía atiendes así?', [2]);
		await sleep(Math.max(600, dur('hook') - 650 + 80));
		await say('pizza');
		await api.hookTitle('¡Y se enfría la pizza!', [4]);
		await sleep(dur('pizza') + 60);

		// Respira: entra el teléfono con el menú digital
		await api.hookOut();
		await cam(0, 60, 0.84, { ms: 950 });
		await say('respira');
		await sleep(420);
		await caption('Tu cliente pide solo', [3]);
		await sleep(700);
		await tap(api.frames.main.getByRole('link', { name: /Ver (el )?men[uú]/i }), { click: false, travel: 440 });
		await sleep(80);
		await api.swapToAlt();
		await sleep(Math.max(150, dur('respira') - 1700));

		await say('carta');
		await caption('Mira la carta', [2]);
		await cam(0, 150, 1.12, { ms: 850 });
		await sleep(300);
		await smoothScroll(420, 950);
		await caption('Elige tu pizza', [2]);
		await tap(f().getByText('La Corner Champignon', { exact: true }).first(), { travel: 440 });
		await sleep(200);
		await cam(0, -110, 1.1, { ms: 800 });
		await sleep(450);
		await tap(f().getByRole('button', { name: /^Agregar ·/ }), { travel: 440 });
		await sleep(250);
		await tap(f().locator('button', { hasText: /^\s*Listo\s*$/ }), { travel: 380 });
		await sleep(300);

		await caption('Revisa tu pedido', [2]);
		await cam(0, -230, 1.18, { ms: 800 });
		await sleep(300);
		await tap(f().getByRole('button', { name: /^Carrito/ }), { travel: 440 });
		await sleep(200);
		await cam(0, 26, 0.97, { ms: 800 });
		await sleep(650);
		await tap(f().getByRole('button', { name: 'Ir a pagar' }), { travel: 440 });
		await sleep(450);

		// Delivery: ubicación actual → mapa → indicaciones → costo de envío
		await say('delivery');
		await caption('Pídelo a domicilio', [2]);
		await cam(0, -70, 1.12, { ms: 800 });
		await sleep(250);
		await tap(f().getByRole('radio', { name: 'Delivery' }), { travel: 420 });
		await sleep(350);
		await tap(f().locator('button.cart-locate__btn'), { travel: 420 });
		await f().locator('section.cart-address-card').waitFor({ timeout: api.waitMs });
		await api.focus(f().locator('section.cart-address-card'), { scale: 1.1, at: 0.42, ms: 800 });
		await sleep(600);
		await typeInto(f().locator('#cart-delivery-reference'), 'Portón negro', { delay: 26 });
		await f().locator('div.cart-ship:not([data-state])').waitFor({ timeout: api.waitMs });
		await api.focus(f().locator('div.cart-ship'), { scale: 1.12, at: 0.5, ms: 750 });
		await sleep(700);
		await tap(f().getByRole('button', { name: 'Continuar a métodos de pago' }), { travel: 440 });
		await sleep(450);

		await say('pago');
		await caption('Elige cómo pagar', [2, 3]);
		await cam(0, -70, 1.12, { ms: 750 });
		await tap(f().locator('button', { hasText: 'Efectivo' }).first(), { travel: 420 });
		await sleep(400);
		await caption('Confirma y listo', [2]);
		await cam(0, 40, 1.05, { ms: 750 });
		await sleep(150);
		await typeInto(f().getByPlaceholder('Tu nombre'), 'Camila Rojas', { delay: 20 });
		await typeInto(f().getByPlaceholder('V-12345678'), 'V-24567890', { delay: 16 });
		await typeInto(f().getByPlaceholder('+58 412 123 4567'), '+58 412 555 0199', { delay: 14 });
		await tap(f().getByRole('button', { name: 'Confirmar pedido' }), { travel: 420 });
		await f().getByText('¡Pedido recibido!').waitFor({ timeout: api.waitMs }); // confirmación REAL de la app, pedido FALSO
		await api.fingerHide();
		await caption('');
		await sleep(250);

		// Celebración, caja y llamado a la acción
		await cam(0, 250, 0.66, { ms: 800 });
		await api.celebrate();
		await sleep(330);
		await say('listo');
		await sleep(dur('listo') + 120);
		await say('caja');
		await sleep(Math.max(1200, dur('caja') - 600));
		await api.outro();
		await sleep(900);
		await say('cta');
		await sleep(dur('cta') + 700);
	},
};
