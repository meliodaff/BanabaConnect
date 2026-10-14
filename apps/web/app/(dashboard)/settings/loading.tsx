"use client";

import { useDictionary } from "@/components/I18nProvider";
import { PageHeader } from "@/components/PageHeader";

export default function SettingsLoading() {
  const t = useDictionary();
  return <PageHeader title={t.nav.settings} description={t.settings.description} />;
}
