import type { Metadata } from "next";
import Image from "next/image";
import { BanabaOutline } from "@/components/BanabaOutline";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { getDictionary } from "@/lib/i18n-server";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).login.title };
}

/** A faint survey-map grid in the brand color, behind the barangay outline. */
const GRID_LINE = "color-mix(in srgb, var(--color-brand) 10%, transparent)";
const SURVEY_GRID: React.CSSProperties = {
  backgroundImage: `linear-gradient(to right, ${GRID_LINE} 1px, transparent 1px), linear-gradient(to bottom, ${GRID_LINE} 1px, transparent 1px)`,
  backgroundSize: "44px 44px",
};

/**
 * Staff sign-in. Left: Barangay Banaba itself, its official outline on a survey grid with the
 * seal, so the page is unmistakably the barangay's (and matches the dashboard map). Right: the
 * form. On narrow screens the map becomes a short band above the form.
 */
export default async function LoginPage() {
  const t = await getDictionary();
  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <div className="h-1.5 shrink-0 bg-sun" />

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section
          style={SURVEY_GRID}
          className="relative flex min-h-56 flex-col justify-between overflow-hidden border-b border-line bg-brand-soft p-8 lg:border-b-0 lg:border-r lg:p-12"
        >
          <div className="relative z-10 flex items-center gap-3.5">
            <Image
              src="/brand/barangay-banaba-seal.jpg"
              alt={t.nav.sealAlt}
              width={56}
              height={56}
              priority
              className="h-14 w-14 rounded-full shadow-sm ring-4 ring-surface"
            />
            <div className="leading-tight">
              <p className="font-display text-lg font-bold">Barangay Banaba</p>
              <p className="text-[15px] text-muted">San Mateo, Rizal</p>
            </div>
          </div>

          <BanabaOutline className="pointer-events-none absolute inset-x-8 top-1/2 mx-auto hidden max-h-[62%] w-[calc(100%-4rem)] max-w-[620px] -translate-y-1/2 lg:block" />
          <BanabaOutline className="pointer-events-none absolute -right-6 bottom-2 h-40 w-auto opacity-80 lg:hidden" />

          <p className="relative z-10 mt-6 text-sm text-muted">{t.login.boundary}</p>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-10" aria-labelledby="sign-in-title">
          <div className="w-full max-w-[380px]">
            <p className="font-display text-base font-bold">
              Banaba<span className="text-brand">Connect</span>
              <span className="ml-2 rounded-md bg-brand-soft px-2 py-0.5 text-sm font-semibold text-brand">
                {t.nav.commandDashboard}
              </span>
            </p>
            <h1 id="sign-in-title" className="mt-8 text-3xl font-bold">
              {t.login.title}
            </h1>
            <p className="mt-2 text-[15px] text-muted">{t.login.subtitle}</p>

            <div className="mt-8">
              <LoginForm />
            </div>

            <p className="mt-8 border-t border-line pt-5 text-sm text-muted">{t.login.authorizedOnly}</p>
            <div className="mt-5 max-w-56">
              <LanguageSwitch />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
