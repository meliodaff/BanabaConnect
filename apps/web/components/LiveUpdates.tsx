"use client";

import { CATEGORY_LABELS, isReportCategory } from "@banabaconnect/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface LiveReportsOptions {
  /** Called for each new report, so the page can highlight it and show an alert. */
  onNewReport?: (id: string, label: string) => void;
  /**
   * While this returns true (e.g. the pointer is on the queue), changes are held instead of
   * re-sorting the list under the staff member's cursor. Call `applyUpdates` to show them.
   */
  shouldHold?: () => boolean;
}

/**
 * Listens for new and changed reports and refreshes the page's data. Several changes at once
 * (e.g. a new report re-scoring its whole incident group) cause a single refresh.
 */
export function useLiveReports({ onNewReport, shouldHold }: LiveReportsOptions = {}) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [held, setHeld] = useState(false);
  const optionsRef = useRef({ onNewReport, shouldHold });

  useEffect(() => {
    optionsRef.current = { onNewReport, shouldHold };
  });

  const applyUpdates = useCallback(() => {
    setHeld(false);
    router.refresh();
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const scheduleRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (optionsRef.current.shouldHold?.()) {
          setHeld(true);
        } else {
          setHeld(false);
          router.refresh();
        }
      }, 400);
    };

    (async () => {
      // Live updates follow row-level security, so they need the staff member's sign-in.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        await supabase.realtime.setAuth(data.session.access_token);
      }
      channel = supabase
        .channel("reports-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { id?: string; category?: string };
            if (row.id) {
              const label = isReportCategory(row.category) ? CATEGORY_LABELS[row.category] : "Report";
              optionsRef.current.onNewReport?.(row.id, label);
            }
          }
          scheduleRefresh();
        })
        .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [router]);

  return { connected, held, applyUpdates };
}

/** "Live" dot, so staff know the list updates by itself (or that it's reconnecting). */
export function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    // Settled (live) is a calm neutral pill with a green dot; reconnecting needs attention.
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${
        connected ? "border-line bg-surface text-ink" : "border-warning/40 bg-warning-soft text-warning"
      }`}
      aria-live="polite"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-success" : "bg-warning"}`} />
      {connected ? "Live: updates automatically" : "Connecting…"}
    </span>
  );
}
