"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDictionary } from "@/components/I18nProvider";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import {
  HelpIcon,
  MapIcon,
  OverviewIcon,
  ReportsIcon,
  ResidentsIcon,
  SignOutIcon,
} from "@/components/NavIcons";
import { SoundToggle } from "@/components/NewReportSound";

/** The four places staff work, in two groups. Labels are keys of the dictionary's nav words. */
const SECTIONS = [
  {
    heading: "monitoring",
    links: [
      { href: "/", label: "overview", icon: OverviewIcon, match: (path: string) => path === "/" },
      { href: "/reports", label: "reports", icon: ReportsIcon, match: (path: string) => path.startsWith("/reports") },
      { href: "/map", label: "map", icon: MapIcon, match: (path: string) => path.startsWith("/map") },
    ],
  },
  {
    heading: "residentsGroup",
    links: [
      { href: "/residents", label: "residents", icon: ResidentsIcon, match: (path: string) => path.startsWith("/residents") },
    ],
  },
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "BS";
}

/** White sidebar with the barangay seal; color stays reserved for priorities and statuses. */
export function Sidebar({
  staffName,
  pendingVerifications,
  signOutAction,
}: {
  staffName: string;
  pendingVerifications: number;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const t = useDictionary();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-line bg-surface print:hidden">
      <div className="h-1 bg-sun" />

      <div className="border-b border-line px-5 py-5">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/barangay-banaba-seal.jpg"
            alt={t.nav.sealAlt}
            width={48}
            height={48}
            priority
            className="h-12 w-12 shrink-0 rounded-full"
          />
          <div className="min-w-0">
            <p className="font-display text-[15px] font-bold leading-tight text-ink">Barangay Banaba</p>
            <p className="text-sm leading-tight text-muted">San Mateo, Rizal</p>
          </div>
        </div>
        {/* Its own full-width line, so the product name is never cut off. */}
        <div className="mt-3 rounded-lg bg-brand-soft px-3 py-2">
          <p className="font-display text-[15px] font-bold leading-tight text-ink">
            Banaba<span className="text-brand">Connect</span>
          </p>
          <p className="text-[13px] font-semibold leading-tight text-brand">{t.nav.commandDashboard}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={t.nav.label}>
        {SECTIONS.map((section) => (
          <div key={section.heading} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-3 text-xs font-bold uppercase tracking-wider text-muted">{t.nav[section.heading]}</p>
            <ul className="space-y-0.5">
              {section.links.map((link) => {
                const active = link.match(pathname);
                const LinkIcon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition ${
                        active
                          ? "bg-brand-soft font-bold text-brand"
                          : "font-semibold text-ink hover:bg-page hover:text-brand"
                      }`}
                    >
                      <LinkIcon />
                      <span className="flex-1">{t.nav[link.label]}</span>
                      {link.href === "/residents" && pendingVerifications > 0 && (
                        <span
                          className="rounded-full bg-sun px-2 py-0.5 text-xs font-bold text-ink"
                          aria-label={t.nav.idsWaiting(pendingVerifications)}
                          title={t.nav.idsWaitingTitle}
                        >
                          {pendingVerifications}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-line p-3">
        <Link
          href="/help"
          aria-current={pathname === "/help" ? "page" : undefined}
          className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition ${
            pathname === "/help"
              ? "bg-brand-soft font-bold text-brand"
              : "font-semibold text-ink hover:bg-page hover:text-brand"
          }`}
        >
          <HelpIcon />
          {t.nav.help}
        </Link>
        <SoundToggle compact />
        <div className="px-2">
          <LanguageSwitch />
        </div>
      </div>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand"
            aria-hidden
          >
            {initials(staffName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink" title={staffName}>
              {staffName}
            </p>
            <p className="text-[13px] text-muted">{t.nav.staff}</p>
          </div>
        </div>
        <form action={signOutAction} className="mt-1">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold text-muted transition hover:bg-page hover:text-ink"
          >
            <SignOutIcon />
            {t.nav.signOut}
          </button>
        </form>
      </div>
    </aside>
  );
}
