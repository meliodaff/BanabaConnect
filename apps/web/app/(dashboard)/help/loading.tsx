"use client";

import { useDictionary } from "@/components/I18nProvider";
import { PageHeader } from "@/components/PageHeader";

/** Help has no data to wait for; this only keeps the Overview's placeholder from showing here. */
export default function HelpLoading() {
  const t = useDictionary();
  return <PageHeader title={t.help.title} description={t.help.description} />;
}
