import type { Metadata } from "next";
import Link from "next/link";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { HelpIcon, SignOutIcon } from "@/components/NavIcons";
import { SoundToggle } from "@/components/NewReportSound";
import { PageHeader } from "@/components/PageHeader";
import { StartTutorialButton } from "@/components/Tutorial";
import { getDictionary } from "@/lib/i18n-server";
import { signOut } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.settings };
}

export default async function SettingsPage() {
  const t = await getDictionary();

  return (
    <>
      <PageHeader title={t.nav.settings} description={t.settings.description} />

      <div className="max-w-4xl px-8 py-6">
        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          <section data-tour="settings-sound" aria-label={t.sound.label} className="p-3">
            <SoundToggle />
          </section>

          <section className="flex flex-wrap items-center justify-between gap-5 p-6">
            <div className="max-w-sm">
              <h2 className="text-sm font-semibold">{t.language.label}</h2>
              <p className="mt-1 text-sm text-muted">{t.settings.languageHint}</p>
            </div>
            <div className="w-full sm:w-60">
              <LanguageSwitch hideLabel />
            </div>
          </section>

          <section data-tour="settings-tutorial" className="flex flex-wrap items-center justify-between gap-5 p-6">
            <div className="max-w-sm">
              <h2 className="text-sm font-semibold">{t.tutorial.label}</h2>
              <p className="mt-1 text-sm text-muted">{t.tutorial.hint}</p>
            </div>
            <StartTutorialButton />
          </section>

          <section className="flex flex-wrap items-center justify-between gap-5 p-6">
            <div className="max-w-sm">
              <h2 className="text-sm font-semibold">{t.nav.help}</h2>
              <p className="mt-1 text-sm text-muted">{t.settings.helpHint}</p>
            </div>
            <Link
              href="/help"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-brand hover:text-brand"
            >
              <HelpIcon />
              {t.settings.openHelp}
            </Link>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-5 p-6">
            <div className="max-w-sm">
              <h2 className="text-sm font-semibold">{t.settings.account}</h2>
              <p className="mt-1 text-sm text-muted">{t.settings.signOutHint}</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-brand hover:text-brand"
              >
                <SignOutIcon />
                {t.nav.signOut}
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
