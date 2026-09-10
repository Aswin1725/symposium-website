import { MapPin, CalendarDays, ArrowRight } from "lucide-react";
import symposiumLogo from "@/imports/image-1.png";

export function Hero({ onRegister }: { onRegister: () => void }) {
  return (
    <section
      id="home"
      className="relative flex min-h-[calc(100vh-72px)] w-full items-center overflow-hidden bg-[var(--color-paper)] scroll-mt-40"
    >
      {/* Ambient background field */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 82% 18%, rgba(47,155,255,0.18) 0%, rgba(245,248,255,0) 55%), radial-gradient(90% 90% at 12% 95%, rgba(10,166,194,0.12) 0%, rgba(245,248,255,0) 50%)",
        }}
      />
      {/* Grid lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(18,87,184,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(18,87,184,0.10) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(circle at 72% 42%, black 0%, transparent 72%)",
        }}
      />

      {/* Logo motif — responsive: centered watermark on mobile, right-side on desktop */}
      <div className="pointer-events-none absolute right-1/2 top-1/2 -translate-y-1/2 translate-x-1/2 opacity-20 md:right-6 md:translate-x-0 md:opacity-100 lg:right-10">
        <div className="relative h-[16rem] w-[16rem] sm:h-[20rem] sm:w-[20rem] md:h-[22rem] md:w-[22rem] lg:h-[26rem] lg:w-[26rem]">
          <div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(47,155,255,0.28) 0%, transparent 62%)",
              animation: "nextron-pulse 6s ease-in-out infinite",
            }}
          />
          <img
            src={symposiumLogo}
            alt="Kuppam Educational Society emblem"
            className="relative h-full w-full object-contain drop-shadow-[0_20px_45px_rgba(18,87,184,0.25)]"
            style={{ animation: "nextron-spin 60s linear infinite" }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.5em] text-[var(--color-flame)]">
          Kuppam Engineering College presents
        </p>

        <h1 className="mt-5 font-display text-6xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
          <span className="text-black">Next</span>
          <span className="text-[var(--color-electric)]">ron</span>
          <span className="text-sky-400">-2026</span>
        </h1>

        <p className="mt-4 max-w-xl font-display text-lg font-medium uppercase tracking-[0.25em] text-[var(--color-ink-soft)]">
          National Technical Symposium
        </p>

        <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600">
          Where circuits meet code and ideas take flight. A day of coding
          battles, robotics, paper wars, and technical showdowns — engineered
          for the next generation of makers.
        </p>

        {/* Meta row */}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onRegister}
            className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-electric)] px-7 py-3 font-display text-sm font-semibold uppercase tracking-widest text-white transition-all hover:bg-[var(--color-electric-bright)] hover:shadow-[0_10px_30px_rgba(18,87,184,0.35)]"
          >
            Register Now
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </button>

          {/* Location button — left area of meta row */}
          <a
            href="https://maps.google.com/?q=Kuppam+Engineering+College"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-electric)]/25 bg-white px-6 py-3 font-display text-sm font-medium uppercase tracking-widest text-[var(--color-ink)] shadow-sm transition-colors hover:border-[var(--color-electric)] hover:text-[var(--color-electric)]"
          >
            <MapPin className="size-4 text-[var(--color-flame)]" />
            Kuppam, Andhra Pradesh
          </a>

          <span className="inline-flex items-center gap-2 font-mono text-sm text-slate-500">
            <CalendarDays className="size-4 text-[var(--color-electric)]" />
            23 &amp; 24 September 2026
          </span>
        </div>
      </div>

      {/* Copyright */}
      <p className="absolute bottom-5 left-6 z-10 font-mono text-xs tracking-wide text-slate-400">
        © 2026 NEXTRON · Kuppam Engineering College. All rights reserved.
      </p>
    </section>
  );
}

export default Hero;
