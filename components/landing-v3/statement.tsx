import { LANDING_STATEMENT_ACCENT_START, LANDING_STATEMENT_TEXT } from "@/lib/landing/statement";
import { SectionGlow } from "./section-light";

export function Statement() {
	const plain = LANDING_STATEMENT_TEXT.slice(0, LANDING_STATEMENT_ACCENT_START);
	const accent = LANDING_STATEMENT_TEXT.slice(LANDING_STATEMENT_ACCENT_START);

	return (
		<section className="v3-section-dark pt-20 pb-20 md:pt-28 md:pb-24">
			<SectionGlow
				className="left-1/2 top-1/2 h-[480px] w-[min(1000px,140vw)] -translate-x-1/2 -translate-y-1/2"
				intensity={0.13}
			/>
			<div className="v3-container flex flex-col items-center">
				<blockquote data-reveal className="max-w-4xl text-balance text-center text-2xl font-medium leading-snug text-[#f4f4f5] md:text-4xl lg:text-5xl">
					<span className="text-[#4f5bff]">&ldquo;</span>
					{plain}
					<span className="text-[#4f5bff]">{accent}</span>
					<span className="text-[#4f5bff]">&rdquo;</span>
				</blockquote>
			</div>
		</section>
	);
}
