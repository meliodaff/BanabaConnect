"use client";

import { useEffect } from "react";

/** Shown when reports or residents can't be loaded, instead of a blank or stale page. */
export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-8 py-16">
      <div role="alert" className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-7 text-center">
        <h1 className="text-xl font-extrabold">This page didn&apos;t load</h1>
        <p className="mt-2 text-[15px] text-muted">
          The dashboard couldn&apos;t reach the BanabaConnect database. Check the internet connection at
          the barangay hall, then try again. Reports from residents are still saved and will appear
          once it loads.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 rounded-lg bg-brand px-5 py-3 text-base font-bold text-white hover:bg-brand-dark"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
