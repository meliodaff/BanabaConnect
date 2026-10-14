"use client";

import { useState } from "react";
import { useDictionary } from "@/components/I18nProvider";

/**
 * Copies a phone number to the clipboard, for pasting into a phone or a message. On a laptop
 * the tel: link may open nothing useful, so this is the dependable way to get the number.
 */
export function CopyButton({ text }: { text: string }) {
  const t = useDictionary();
  const [result, setResult] = useState<"copied" | "failed" | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setResult("copied");
    } catch {
      // No clipboard access (an old browser, or blocked): say how to copy it by hand.
      setResult("failed");
    }
    setTimeout(() => setResult(null), 2500);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="rounded-md border border-line bg-surface px-2 py-0.5 text-[13px] font-bold text-ink hover:border-brand hover:text-brand"
      >
        {result === "copied" ? t.report.copied : t.report.copy}
      </button>
      <span aria-live="polite" className="text-[13px] text-muted">
        {result === "failed" ? t.report.copyFailed : ""}
      </span>
    </span>
  );
}
