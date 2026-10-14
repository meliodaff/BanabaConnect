"use client";

import { useActionState, useState } from "react";
import { reviewResident, type ActionState } from "@/app/(dashboard)/actions";
import { useDictionary } from "@/components/I18nProvider";

const initialState: ActionState = { error: null, done: false };

/**
 * The usual reasons a Barangay ID photo isn't approved. One click writes the note for the
 * resident; staff can still edit it before rejecting. Each note says what to do next, because
 * the resident reads it in the app (in English, like the app; the button names follow the
 * dashboard's language, in review.reasons).
 */
const REJECT_REASONS = [
  {
    key: "blurry",
    note: "The photo is blurry. Please take it again in good light and hold the phone steady.",
  },
  {
    key: "cutOff",
    note: "Part of your ID is cut off. Please fit the whole ID in the photo.",
  },
  {
    key: "glare",
    note: "We can't read your ID because of glare or poor lighting. Please take it again in even light.",
  },
  {
    key: "notBanaba",
    note: "This isn't a Barangay Banaba ID. Please send a photo of your Barangay Banaba ID.",
  },
  {
    key: "nameMismatch",
    note: "The name on the ID doesn't match the name on your account. Please send your own Barangay ID.",
  },
  {
    key: "expired",
    note: "This ID has expired. Please renew it at the Barangay Banaba hall, then send a new photo.",
  },
] as const;

/** Approve, or reject with a reason the resident will see. */
export function ReviewForm({ profileId, hasIdPhoto }: { profileId: string; hasIdPhoto: boolean }) {
  const t = useDictionary();
  const [state, formAction, pending] = useActionState(reviewResident, initialState);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="profileId" value={profileId} />

      {rejecting && (
        <div className="space-y-3">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">
              {t.review.commonReasons} <span className="font-normal text-muted">{t.review.clickToFill}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {REJECT_REASONS.map((reason) => {
                const selected = note === reason.note;
                return (
                  <button
                    key={reason.key}
                    type="button"
                    onClick={() => setNote(reason.note)}
                    aria-pressed={selected}
                    className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                      selected
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-line bg-surface text-ink hover:border-brand hover:text-brand"
                    }`}
                  >
                    {t.review.reasons[reason.key]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor={`note-${profileId}`} className="mb-1.5 block text-sm font-semibold">
              {t.review.whyLabel} <span className="font-normal text-muted">{t.review.residentSees}</span>
            </label>
            <textarea
              id={`note-${profileId}`}
              name="note"
              rows={3}
              maxLength={300}
              required
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t.review.placeholder}
              className="w-full rounded-md border border-line px-3 py-2 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </div>
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
              disabled={pending || note.trim() === ""}
              title={note.trim() === "" ? t.review.pickFirst : undefined}
              className="rounded-md bg-urgent px-4 py-2.5 text-[15px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? t.common.saving : t.review.reject}
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setNote("");
              }}
              className="rounded-md border border-line px-4 py-2.5 text-[15px] font-bold hover:border-brand hover:text-brand"
            >
              {t.common.cancel}
            </button>
          </>
        ) : (
          <>
            <button
              type="submit"
              name="decision"
              value="approve"
              disabled={pending || !hasIdPhoto}
              title={hasIdPhoto ? undefined : t.review.noPhoto}
              className="rounded-md bg-success px-4 py-2.5 text-[15px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? t.common.saving : t.review.approve}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(true)}
              className="rounded-md border border-urgent px-4 py-2.5 text-[15px] font-bold text-urgent hover:bg-urgent-soft"
            >
              {t.review.rejectStart}
            </button>
          </>
        )}
      </div>
      {rejecting && note.trim() === "" && (
        <p className="text-sm text-muted">{t.review.rejectOff}</p>
      )}
      {!hasIdPhoto && !rejecting && (
        <p className="text-sm text-muted">{t.review.approveOff}</p>
      )}
    </form>
  );
}
