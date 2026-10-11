"use client";

import { useActionState, useState } from "react";
import { reviewResident, type ActionState } from "@/app/(dashboard)/actions";

const initialState: ActionState = { error: null, done: false };

/** Approve, or reject with a reason the resident will see. */
export function ReviewForm({ profileId, hasIdPhoto }: { profileId: string; hasIdPhoto: boolean }) {
  const [state, formAction, pending] = useActionState(reviewResident, initialState);
  const [rejecting, setRejecting] = useState(false);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="profileId" value={profileId} />

      {rejecting && (
        <div>
          <label htmlFor={`note-${profileId}`} className="mb-1.5 block text-sm font-semibold">
            Why isn&apos;t it approved? <span className="font-normal text-muted">(the resident sees this)</span>
          </label>
          <textarea
            id={`note-${profileId}`}
            name="note"
            rows={2}
            maxLength={300}
            required
            placeholder="e.g. The photo is blurry. Please take it again in good light."
            className="w-full rounded-lg border border-line px-3 py-2 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </div>
      )}

      {state.error && (
        <p role="alert" className="rounded-lg bg-urgent-soft px-3 py-2.5 text-sm font-semibold text-urgent">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {rejecting ? (
          <>
            <button
              type="submit"
              name="decision"
              value="reject"
              disabled={pending}
              className="rounded-lg bg-urgent px-4 py-2.5 text-[15px] font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Reject ID"}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="rounded-lg border border-line px-4 py-2.5 text-[15px] font-bold hover:border-brand hover:text-brand"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="submit"
              name="decision"
              value="approve"
              disabled={pending || !hasIdPhoto}
              title={hasIdPhoto ? undefined : "There's no ID photo to check"}
              className="rounded-lg bg-success px-4 py-2.5 text-[15px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Saving…" : "Approve ID"}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(true)}
              className="rounded-lg border border-urgent px-4 py-2.5 text-[15px] font-bold text-urgent hover:bg-urgent-soft"
            >
              Reject ID…
            </button>
          </>
        )}
      </div>
      {!hasIdPhoto && !rejecting && (
        <p className="text-sm text-muted">Approve is off because there&apos;s no ID photo to check.</p>
      )}
    </form>
  );
}
