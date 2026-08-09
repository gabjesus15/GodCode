export function Ticker() {
  const items = Array.from({ length: 12 }).map((_, i) =>
    i % 2 === 0 ? "GCODE" : "EMPEZAR AHORA"
  );

  return (
    <section className="overflow-hidden bg-[#4f5bff] py-5">
      <div className="ticker-track">
        {items.map((text, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-6 px-6 font-display text-3xl tracking-[0.12em] text-[#0d0d0d] md:text-4xl"
          >
            {text}
            <span className="text-lg">★</span>
          </span>
        ))}
        {items.map((text, i) => (
          <span
            key={`dup-${i}`}
            className="flex shrink-0 items-center gap-6 px-6 font-display text-3xl tracking-[0.12em] text-[#0d0d0d] md:text-4xl"
          >
            {text}
            <span className="text-lg">★</span>
          </span>
        ))}
      </div>
    </section>
  );
}
