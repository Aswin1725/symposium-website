const patrons = [
  { name: "Sri B. C. Nagaraj", role: "Chairman" },
  { name: "Dr. N. Sunil Raj", role: "Vice-Chairman" },
  { name: "Sri N. Sagar Raj", role: "Secretary / CEO" },
  { name: "Dr. S. Sudhakar Babu", role: "Principal" },
  {
    name: "Dr. G. N. Kodanda Ramaiah",
    role: "HOD of ECE & Director of R&D",
  },
  { name: "Dr. K. Rasadurai", role: "Professor" },
];

function initials(name: string) {
  return name
    .replace(/^(Sri|Dr\.)\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
}

export function Patrons() {
  return (
    <section className="relative w-full border-t border-[var(--color-electric)]/10 bg-white py-20">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="flex flex-col items-center text-center">
          <p className="font-mono text-xs uppercase tracking-[0.5em] text-[var(--color-flame)]">
            Guidance & Blessings
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold uppercase tracking-tight text-[var(--color-ink)] sm:text-5xl">
            Our Patrons
          </h2>
          <div className="mt-4 h-1 w-16 rounded-full bg-[var(--color-electric)]" />
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {patrons.map((p) => (
            <div
              key={p.name}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[var(--color-electric)]/12 bg-[var(--color-paper)] p-5 transition-all hover:-translate-y-1 hover:border-[var(--color-electric)]/40 hover:shadow-[0_16px_40px_rgba(18,87,184,0.14)]"
            >
              <div
                className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[var(--color-electric)] to-[var(--color-cyan)] transition-transform duration-300 group-hover:scale-x-100"
                aria-hidden
              />
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-electric)] font-display text-lg font-bold uppercase text-white">
                {initials(p.name)}
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg font-semibold text-[var(--color-ink)]">
                  {p.name}
                </h3>
                <p className="mt-0.5 text-sm font-medium text-[var(--color-ink-soft)]">
                  {p.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Patrons;
