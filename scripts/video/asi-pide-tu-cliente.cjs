/**
 * Escenario del video «Así pide tu cliente» (Rica Pizza, Gcode POS). Privado: usa rutas internas.
 * Motor y guía: skill ui-demo-video (~/.claude/skills/ui-demo-video).
 *
 *   node ~/.claude/skills/ui-demo-video/scripts/record-demo.cjs scripts/video/asi-pide-tu-cliente.cjs out master
 *
 * Rica Pizza es un negocio REAL y la base local es la real: el pedido se responde en falso (network.fakes).
 */
module.exports = {
	name: 'asi-pide-tu-cliente',

	// App y escena en orígenes distintos (localhost vs 127.0.0.1) = procesos distintos = sin tirones.
	appOrigin: 'http://localhost:3000',
	stageOrigin: 'http://127.0.0.1:3000',
	stageBlankPath: '/robots.txt', // cualquier URL liviana del mismo servidor
	embedPathPrefix: '/rica-pizza', // documentos a los que se les quita frame-ancestors/X-Frame-Options

	// main se ve al inicio; alt queda precargado debajo para pasar a él con un fundido.
	urls: { main: '/rica-pizza', alt: '/rica-pizza/menu' },

	// CSS inyectado en la app: ocultar el indicador de desarrollo de Next, banners de cookies, etc.
	frameCss: 'nextjs-portal{display:none!important}',

	brand: {
		accent: '#4f5bff',
		logo: '/gcode-mark-c-white.png', // ruta servida por el mismo servidor de la escena
		logoToWhite: true,
		site: 'www.godcode.me',
	},

	copy: {
		intro: ['¿Y cómo pide', 'tu cliente?'], // la 2.ª línea va en una caja blanca
		celebrate: '¡Y listo!',
		celebrateSub: 'Pedido recibido en la caja del local',
		outro: 'Y el pedido llega directo a tu caja',
		outroKey: [4, 5, 6], // índices de palabras resaltadas
	},

	network: {
		// Respuestas inventadas: nunca llegan al servidor. `cors: true` si el host es otro (Supabase, API externa).
		fakes: [
			{ match: /\/rest\/v1\/rpc\/create_order_transaction/, cors: true, label: 'crear pedido', body: { id: 990001, order_number: 214, handoff_code: '7Q3K' } },
			{ match: /\/api\/tenant\/public-order-delivery/, method: 'POST', label: 'datos de entrega', body: { ok: true } },
		],
		// POST que SOLO leen (cálculo de precios, validación de catálogo). Verifica en el código que no escriben.
		allowWrites: [/\/api\/tenant\/cart-branch-prices/, /\/api\/tenant\/order-catalog-items/],
		// Salidas a terceros que no deben ocurrir (mensajes, correos, pagos).
		block: [/wa\.me|whatsapp\.com/],
	},

	/**
	 * Ensayo sin grabar (contexto móvil propio): recorre TODO el flujo una vez, incluido el envío
	 * falso, para que el servidor compile y el navegador descargue todo. En modo desarrollo la
	 * primera carga de cada pantalla congela ~1 s: sin ensayo, esos congelamientos salen en el video.
	 */
	async warmUp({ page, app, sleep }) {
		const click = (loc) => loc.evaluate((n) => n.click()).then(() => sleep(600));
		await page.goto(`${app}/rica-pizza`, { waitUntil: 'networkidle' });
		await page.goto(`${app}/rica-pizza/menu`, { waitUntil: 'networkidle' });
		await sleep(5000); // hidratación: un clic antes recarga la página en vez de abrir la ficha
		for (let i = 0; i < 20; i++) {
			await page.getByText('La Corner Champignon', { exact: true }).locator('visible=true').first().evaluate((n) => n.click());
			const opened = await page.getByRole('button', { name: /^Agregar ·/ }).waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false);
			if (opened) break;
		}
		await click(page.getByRole('button', { name: /^Agregar ·/ }));
		await click(page.locator('button', { hasText: /^\s*Listo\s*$/ }));
		await click(page.locator('button[aria-label="Agregar Suprema Rica Pizza al carrito"]'));
		await click(page.getByRole('button', { name: /^Carrito/ }));
		await click(page.getByRole('button', { name: 'Ir a pagar' }));
		await click(page.getByRole('button', { name: 'Continuar a métodos de pago' }));
		await click(page.locator('button', { hasText: 'Efectivo' }).first());
		await page.getByPlaceholder('Tu nombre').fill('Ensayo');
		await page.getByPlaceholder('V-12345678').fill('V-10000000');
		await page.getByPlaceholder('+58 412 123 4567').fill('+58 412 000 0000');
		await click(page.getByRole('button', { name: 'Confirmar pedido' }));
		await page.getByText('¡Pedido recibido!').waitFor({ timeout: 15000 });
	},

	/**
	 * Guion de la toma. `api`: cam(x, y, escala, rotY?, rotX?), caption(texto, [índices resaltados]),
	 * tap(locator|selector), typeInto(locator, texto), smoothScroll(dy, ms), swapToAlt(), frame(),
	 * frames.main/alt, intro(), introOut(), celebrate(), outro(), fingerHide(), sleep(ms).
	 * Cámara: y positivo baja el teléfono (se ve la parte de arriba); escala 1.1–1.2 = acercamiento.
	 */
	async run(api) {
		const { sleep, cam, caption, tap, typeInto, smoothScroll } = api;
		const f = () => api.frame();

		// Intro de marca
		await sleep(250);
		await api.intro();
		await sleep(1500);
		await api.introOut();
		// Entrada en un solo movimiento: un giro 3D que después se endereza se ve como un brinco.
		await cam(0, 60, 0.84, { ms: 1100 });
		await sleep(950);

		// Página de inicio → carta (cambio al iframe precargado, sin navegar)
		await caption('Abre tu link', [2]);
		await sleep(550);
		await tap(api.frames.main.getByRole('link', { name: /Ver (el )?men[uú]/i }), { click: false });
		await sleep(120);
		await api.swapToAlt();
		await sleep(380);

		await caption('Mira la carta', [2]);
		await cam(0, 150, 1.12);
		await sleep(650);
		await smoothScroll(420, 1200);

		await caption('Elige tu pizza', [2]);
		await tap(f().getByText('La Corner Champignon', { exact: true }).first());
		await sleep(300);
		await cam(0, -110, 1.1);
		await sleep(650);
		await tap(f().getByRole('button', { name: /^Agregar ·/ }));
		await sleep(350);
		await tap(f().locator('button', { hasText: /^\s*Listo\s*$/ }), { travel: 420 });
		await sleep(320);
		await cam(0, 70, 1.1, { ms: 800 });
		await sleep(380);
		await tap('button[aria-label="Agregar Suprema Rica Pizza al carrito"]');
		await sleep(650);

		await caption('Revisa tu pedido', [2]);
		await cam(0, -230, 1.18);
		await sleep(500);
		await tap(f().getByRole('button', { name: /^Carrito/ }), { travel: 500 });
		await sleep(300);
		await cam(0, 26, 0.97); // teléfono completo: se ven los productos y el total
		await sleep(1200);
		await tap(f().getByRole('button', { name: 'Ir a pagar' }));
		await sleep(650);

		await caption('Retira o pide delivery', [3]);
		await cam(0, -70, 1.12);
		await sleep(450);
		await tap(f().locator('button', { hasText: /^\s*Retiro\s*$/ }), { travel: 520 });
		await sleep(350);
		await tap(f().getByRole('button', { name: 'Continuar a métodos de pago' }));
		await sleep(700);
		await caption('Elige cómo pagar', [2, 3]);
		await tap(f().locator('button', { hasText: 'Efectivo' }).first());
		await sleep(650);

		await caption('Confirma y listo', [2]);
		await cam(0, 40, 1.05);
		await sleep(350);
		await typeInto(f().getByPlaceholder('Tu nombre'), 'Camila Rojas');
		await typeInto(f().getByPlaceholder('V-12345678'), 'V-24567890');
		await typeInto(f().getByPlaceholder('+58 412 123 4567'), '+58 412 555 0199');
		await sleep(200);
		await tap(f().getByRole('button', { name: 'Confirmar pedido' }));
		await f().getByText('¡Pedido recibido!').waitFor({ timeout: 15000 }); // confirmación REAL de la app, pedido FALSO
		await api.fingerHide();
		await caption('');
		await sleep(700);

		// Celebración y cierre
		await cam(0, 250, 0.66, { ms: 900 });
		await api.celebrate();
		await sleep(2500);
		await api.outro();
		await sleep(3000);
	},
};
