const teaching = [
  { name: "Dr. G. N. Kodanda Ramaiah", role: "Professor & HOD" },
  { name: "Dr. K. Rasadurai", role: "Professor" },
  { name: "Dr. D. Jaya Kumar", role: "Professor" },
  { name: "Dr. P. Ajay Kumar Reddy", role: "Associate Professor" },
  { name: "Dr. Santhosh B. Panjagal", role: "Associate Professor" },
  { name: "Dr. M. Lakshmipathy", role: "Associate Professor" },
  { name: "Mr. D. Siva Kumar", role: "Associate Professor" },
  { name: "Mrs. V. Sathiyavani", role: "Associate Professor" },
  { name: "Mr. R. Selvarasan", role: "Associate Professor" },
  { name: "Mr. B. K. Subramanyam", role: "Assistant Professor" },
  { name: "Mr. M. Ranjith Kumar", role: "Assistant Professor" },
  { name: "Mr. T. Siva Kumar", role: "Assistant Professor" },
  { name: "Ms. M. Sumalatha", role: "Assistant Professor" },
  { name: "Mr. G. Vivek", role: "Assistant Professor" },
  { name: "Mr. R. Sudesh", role: "Assistant Professor" },
  { name: "Mr. G. Subramani", role: "Assistant Professor" },
  { name: "Mrs. P. S. Devi", role: "Assistant Professor" },
  { name: "Mrs. S. Revathi", role: "Assistant Professor" },
  { name: "Mr. Vivek Kumar Singh", role: "Assistant Professor" },
  { name: "Mrs. C. Haritha", role: "Assistant Professor" },
  { name: "Mrs. V. Sandya", role: "Lecturer" },
  { name: "Mr. S. Mohamad Ali", role: "Lecturer" },
  { name: "Mr. Shaik Nayum", role: "Lecturer" },
];

const nonTeaching = [
  { name: "Mr. D. Tharaka Ramaiah", role: "Lab Instructor" },
  { name: "Mr. S. Sathyanarayana", role: "Lab Instructor" },
  { name: "Mrs. C. R. Divya", role: "Lab Instructor" },
  { name: "Mr. S. Naga Pavan Kumar Reddy", role: "Lab Instructor" },
  { name: "Mrs. D. Haritha", role: "Technical Assistant" },
  { name: "Mr. B. Chalapathi", role: "Attender" },
  { name: "Mr. S. Venkateswara Naik", role: "Attender" },
];

function initials(name: string) {
  return name
    .replace(/^(Sri|Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

type Person = { name: string; role: string };

const FACULTY_URL =
  "https://www.kec.ac.in/departments/electronics-communication-engineering/";

function StaffGrid({ people }: { people: Person[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {people.map((p) => (
        <a
          key={p.name}
          href={FACULTY_URL}
          target="_blank"
          rel="noreferrer"
          title={`View ${p.name} on kec.ac.in`}
          className="group flex items-center gap-3 rounded-xl border border-[var(--color-electric)]/12 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--color-electric)]/40 hover:shadow-[0_12px_30px_rgba(18,87,184,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-electric)] focus-visible:ring-offset-2"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-electric)] to-[var(--color-cyan)] font-display text-sm font-bold uppercase text-white">
            {initials(p.name)}
          </div>
          <div className="min-w-0">
            <h4 className="truncate font-display text-[15px] font-semibold text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-electric)]">
              {p.name}
            </h4>
            <p className="truncate text-xs font-medium text-[var(--color-ink-soft)]">
              {p.role}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}

export function Faculty() {
  return (
    <section className="relative w-full border-t border-[var(--color-electric)]/10 bg-[var(--color-paper)] py-20">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="flex flex-col items-center text-center">
          <p className="font-mono text-xs uppercase tracking-[0.5em] text-[var(--color-flame)]">
            Department of ECE
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold uppercase tracking-tight text-[var(--color-ink)] sm:text-5xl">
            Our Faculty & Staff
          </h2>
          <div className="mt-4 h-1 w-16 rounded-full bg-[var(--color-electric)]" />
        </div>

        <div className="mt-14">
          <div className="mb-6 flex items-center gap-3">
            <span className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-[var(--color-electric)]">
              Teaching Staff
            </span>
            <span className="h-px flex-1 bg-[var(--color-electric)]/15" />
          </div>
          <StaffGrid people={teaching} />
        </div>

        <div className="mt-14">
          <div className="mb-6 flex items-center gap-3">
            <span className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-[var(--color-electric)]">
              Non-Teaching Staff
            </span>
            <span className="h-px flex-1 bg-[var(--color-electric)]/15" />
          </div>
          <StaffGrid people={nonTeaching} />
        </div>
      </div>
    </section>
  );
}

export default Faculty;
