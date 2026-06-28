import { StatementTypewriter } from "./statement-typewriter";
import { StatementMetrics } from "./statement-metrics";
import {
	formatLandingMetricValue,
	LANDING_METRICS,
	LANDING_STATEMENT_ACCENT_START,
	LANDING_STATEMENT_TEXT,
} from "@/lib/landing/statement";

export function Statement() {
	const staticPlain = LANDING_STATEMENT_TEXT.slice(0, LANDING_STATEMENT_ACCENT_START);
	const staticAccent = LANDING_STATEMENT_TEXT.slice(LANDING_STATEMENT_ACCENT_START);

	return (
		<section className="v3-section-dark py-28 md:py-36">
			<div className="v3-container flex flex-col items-center gap-20">
				<StatementTypewriter className="max-w-4xl text-center text-2xl font-medium leading-snug text-[#f4f4f5] md:text-4xl lg:text-5xl" />

				<StatementMetrics />
			</div>

			<noscript>
				<div className="v3-container mt-10 max-w-4xl text-center text-[#a1a1aa]">
					<p>
						{staticPlain}
						<span className="text-[#7c3aed]">{staticAccent}</span>
					</p>
					<ul className="mt-6 grid grid-cols-2 gap-4 text-left sm:grid-cols-4">
						{LANDING_METRICS.map((metric) => (
							<li key={metric.label}>
								<strong className="text-[#7c3aed]">
									{formatLandingMetricValue(metric.end, metric)}
								</strong>{" "}
								{metric.label}
							</li>
						))}
					</ul>
				</div>
			</noscript>
		</section>
	);
}
