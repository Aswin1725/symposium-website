// NEXTRON-2026 top bar: college header, slim nav, and scrolling notification ticker.
import { useState } from "react";
import {
  Home,
  CalendarDays,
  ClipboardCheck,
  LogIn,
  Menu,
  X,
  Megaphone,
} from "lucide-react";
import collegeHeader from "@/imports/ChatGPT_Image_Sep_7__2026__03_33_52_PM-1.png";
import ieeeHyderabad from "@/imports/123342.png";
import ieeeCas from "@/imports/ChatGPT_Image_Sep_9__2026__11_23_15_AM.png";
import ieeeBts from "@/imports/ChatGPT_Image_Sep_9__2026__11_25_06_AM.png";
import ieeeEds from "@/imports/ChatGPT_Image_Sep_9__2026__11_26_31_AM.png";
import ieeeComsoc from "@/imports/ChatGPT_Image_Sep_9__2026__11_27_34_AM.png";
import ieeeAnanthapuramu from "@/imports/ChatGPT_Image_Sep_9__2026__11_29_03_AM.png";
import type { View } from "@/App";

const organizerText =
  "Dept of ECE & IEEE Student Branch (BTS, CAS, EDS, ComSoc) jointly organized Symposium";

const organizerLogos: { src: string; alt: string }[] = [
  { src: ieeeBts, alt: "IEEE Broadcast Technology Society" },
  { src: ieeeCas, alt: "IEEE Circuits and Systems Society" },
  { src: ieeeEds, alt: "IEEE Electron Devices Society" },
  { src: ieeeComsoc, alt: "IEEE Communications Society" },
  { src: ieeeHyderabad, alt: "IEEE Hyderabad Section" },
  { src: ieeeAnanthapuramu, alt: "IEEE Ananthapuramu Sub-Section" },
];

function OrganizerContent() {
  return (
    <div className="flex shrink-0 items-center gap-8 pr-8" aria-hidden="true">
      <span className="font-display text-[11px] font-semibold uppercase tracking-widest text-[var(--color-ink)] sm:text-xs">
        {organizerText}
      </span>
      {organizerLogos.map((logo, i) => (
        <img
          key={i}
          src={logo.src}
          alt={logo.alt}
          className="h-8 w-auto object-contain sm:h-9"
        />
      ))}
    </div>
  );
}

const links: { label: string; view: View; icon: typeof Home }[] = [
  { label: "Home", view: "home", icon: Home },
  { label: "Events", view: "events", icon: CalendarDays },
  { label: "Registration Status", view: "status", icon: ClipboardCheck },
  { label: "Login", view: "login", icon: LogIn },
];

const tickerItems = [
  "NEXTRON-2026 conducted by ECE (Electronics and Communication Engineering)",
  "WIN up to ₹60K Prize Money",
  "23 & 24 September 2026",
];

function TickerContent() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden="true">
      {tickerItems.map((item, i) => (
        <span
          key={i}
          className="flex items-center px-8 font-display text-[11px] font-semibold uppercase tracking-widest"
        >
          {item}
          <span className="ml-8 text-[var(--color-cyan)]">◆</span>
        </span>
      ))}
    </div>
  );
}

export function TopBar({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (v: View) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full border-b border-[var(--color-electric)]/15 bg-white">
      {/* College header image — full width (edges clipped to hide the image's dark frame) */}
      <div className="flex w-full items-center overflow-hidden px-3 py-2">
        <img
          src={collegeHeader}
          alt="Kuppam Engineering College (UGC - Autonomous)"
          className="h-auto w-full scale-[1.04] object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="border-t border-[var(--color-electric)]/12 bg-[var(--color-ink)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4">
          {/* Desktop links — left side */}
          <ul className="hidden items-center gap-0.5 sm:flex">
            {links.map(({ label, view: v, icon: Icon }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => onNavigate(v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 font-display text-xs font-medium uppercase tracking-widest transition-colors ${
                    view === v
                      ? "text-[var(--color-cyan)]"
                      : "text-slate-200 hover:text-[var(--color-cyan)]"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              </li>
            ))}
          </ul>

          {/* Mobile toggle — left side */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="inline-flex items-center justify-center p-2 text-white sm:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          {/* Name — right side */}
          <span className="font-display text-xs font-bold uppercase tracking-[0.25em] text-white">
            Nextron
            <span className="text-[var(--color-electric-bright)]">-2026</span>
          </span>
        </div>

        {/* Mobile links */}
        {open && (
          <ul className="flex flex-col border-t border-white/10 sm:hidden">
            {links.map(({ label, view: v, icon: Icon }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(v);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-5 py-2.5 font-display text-xs font-medium uppercase tracking-widest transition-colors hover:bg-white/5 ${
                    view === v
                      ? "text-[var(--color-cyan)]"
                      : "text-slate-200 hover:text-[var(--color-cyan)]"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* Notification ticker */}
      <div className="flex items-stretch overflow-hidden border-t border-[var(--color-electric)]/20 bg-[var(--color-flame)] text-white">
        <span className="z-10 hidden shrink-0 items-center gap-1.5 bg-[var(--color-ink)] px-3 font-display text-[11px] font-bold uppercase tracking-widest sm:flex">
          <Megaphone className="size-3.5 text-[var(--color-cyan)]" />
          Latest
        </span>
        <div className="relative flex-1 overflow-hidden py-1.5">
          <div
            className="flex w-max whitespace-nowrap"
            style={{ animation: "nextron-marquee 22s linear infinite" }}
          >
            <TickerContent />
            <TickerContent />
          </div>
        </div>
      </div>

      {/* Organizer scrolling bar */}
      <div className="flex items-stretch overflow-hidden border-t border-[var(--color-electric)]/15 bg-white">
        <span className="z-10 hidden shrink-0 items-center bg-[var(--color-electric)] px-3 font-display text-[11px] font-bold uppercase tracking-widest text-white sm:flex">
          Collaborated With
        </span>
        <div className="relative flex-1 overflow-hidden py-2">
          <div
            className="flex w-max whitespace-nowrap"
            style={{ animation: "nextron-marquee 30s linear infinite" }}
          >
            <OrganizerContent />
            <OrganizerContent />
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
