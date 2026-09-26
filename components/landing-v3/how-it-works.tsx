const STEPS = [
	{ title: "Crea tu cuenta", text: "Elige tu plan y registra tu negocio en unos minutos." },
	{ title: "Sube tu carta", text: "Productos, fotos y precios. Sin saber de tecnología." },
	{ title: "Comparte tu link", text: "En Instagram, en la mesa o por WhatsApp. Los pedidos llegan a tu caja." },
] as const;

export function HowItWorks() {
	return (
		<section id="como-funciona" className="v3-section-dark pt-24 pb-20 md:pt-28 md:pb-24">
			<div className="v3-container">
				<h2 data-reveal className="font-display text-5xl leading-[0.95] text-[#f4f4f5] md:text-6xl">
					Lista en una tarde
				</h2>

				<ol data-reveal className="relative mt-14 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-10">
					{/* Riel: se dibuja a medida que la sección entra en pantalla (solo donde hay scroll-timeline). */}
					<div
						aria-hidden
						className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-white/[0.08] md:block"
					>
						<div className="v3-rail h-full origin-left bg-[#4f5bff]" />
					</div>

					{STEPS.map((step, index) => (
						<li key={step.title} className="relative flex gap-5 md:flex-col md:gap-7">
							<span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-[#0d0d0d] font-display text-2xl leading-none text-[#f4f4f5] shadow-[0_0_0_8px_#0d0d0d]">
								{index + 1}
							</span>
							<div>
								<h3 className="text-lg font-semibold text-[#f4f4f5]">{step.title}</h3>
								<p className="mt-1.5 max-w-[17rem] leading-relaxed text-[#a1a1aa] text-pretty">{step.text}</p>
							</div>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}
