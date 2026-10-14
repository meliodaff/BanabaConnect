"use server";

import { isReportStatus } from "@banabaconnect/shared";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { Dictionary } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error: string | null;
  done: boolean;
}

function messageFor(error: { code?: string; message: string }, t: Dictionary): string {
  if (error.code === "42501") return t.actions.notStaff;
  if (error.code === "22023") return error.message;
  return t.actions.notSaved;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Changes a report's status; the database records the history and notifies the resident. */
export async function updateReportStatus(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reportId = String(formData.get("reportId") ?? "");
  const status = formData.get("status");
  const note = String(formData.get("note") ?? "").trim();
  const t = await getDictionary();
  if (!reportId || !isReportStatus(status)) {
    return { error: t.actions.chooseStatus, done: false };
  }
  if (status === "invalid" && !note) {
    return { error: t.actions.invalidNeedsNote, done: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_report_status", {
    p_report_id: reportId,
    p_status: status,
    p_note: note || null,
  });
  if (error) {
    console.error("update_report_status failed", error);
    return { error: messageFor(error, t), done: false };
  }
  refresh();
  return { error: null, done: true };
}

/** Approves or rejects a resident's Barangay ID; their open reports are re-scored. */
export async function reviewResident(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profileId = String(formData.get("profileId") ?? "");
  const decision = formData.get("decision");
  const note = String(formData.get("note") ?? "").trim();
  const t = await getDictionary();
  if (!profileId || (decision !== "approve" && decision !== "reject")) {
    return { error: t.actions.chooseDecision, done: false };
  }
  if (decision === "reject" && !note) {
    return { error: t.actions.rejectNeedsNote, done: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_verification", {
    p_profile_id: profileId,
    p_approve: decision === "approve",
    p_note: note || null,
  });
  if (error) {
    console.error("review_verification failed", error);
    return { error: messageFor(error, t), done: false };
  }
  // The reviewed resident leaves the "waiting" list, so confirm on the page instead of on the card.
  redirect(`/residents?reviewed=${decision === "approve" ? "approved" : "rejected"}`);
}
