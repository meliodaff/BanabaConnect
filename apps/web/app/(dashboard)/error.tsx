"use client";

import { useEffect } from "react";
import { useDictionary } from "@/components/I18nProvider";

/** Shown when reports or residents can't be loaded, instead of a blank or stale page. */
export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useDictionary();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-8 py-16">
      <div role="alert" className="mx-auto max-w-lg rounded-lg border border-line bg-surface p-7 text-center">
        <h1 className="text-xl font-bold">{t.error.title}</h1>
        <p className="mt-2 text-[15px] text-muted">{t.error.body}</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 rounded-lg bg-brand px-5 py-3 text-base font-bold text-white hover:bg-brand-dark"
        >
          {t.error.retry}
        </button>
      </div>
    </div>
  );
}
