"use client";

import { REPORT_STATUSES, type ReportStatus } from "@banabaconnect/shared";
import { useActionState, useState } from "react";
import { updateReportStatus, type ActionState } from "@/app/(dashboard)/actions";
import { useDictionary } from "@/components/I18nProvider";

const initialState: ActionState = { error: null, done: false };

export function StatusUpdateForm({ reportId, current }: { reportId: string; current: ReportStatus }) {
  const t = useDictionary();
  const [state, formAction, pending] = useActionState(updateReportStatus, initialState);
  const [choice, setChoice] = useState<ReportStatus>(current);
  const unchanged = choice === current;
  const invalid = choice === "invalid";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="reportId" value={reportId} />
      <fieldset>
        <legend className="sr-only">{t.statusForm.legend}</legend>
        <div className="grid grid-cols-2 gap-2">
          {REPORT_STATUSES.map((status) => {
            const selected = choice === status;
            return (
              <label
                key={status}
                className={`cursor-pointer rounded-lg border-2 px-3 py-2.5 transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${
                  selected ? "border-brand bg-brand-soft" : "border-line hover:border-brand/50"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={status}
                  checked={selected}
                  onChange={() => setChoice(status)}
                  className="sr-only"
                />
                <span className="block text-[15px] font-bold">
                  {t.status[status]}
                  {status === current && (
                    <span className="ml-1 text-[13px] font-semibold text-muted">{t.statusForm.now}</span>
                  )}
                </span>
                <span className="block text-[13px] text-muted">{t.statusHint[status]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="note" className="mb-1.5 block text-sm font-semibold">
          {invalid ? t.statusForm.invalidLabel : t.statusForm.noteLabel}{" "}
          <span className="font-normal text-muted">{invalid ? t.statusForm.required : t.statusForm.optional}</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          maxLength={300}
          required={invalid}
          placeholder={invalid ? t.statusForm.invalidPlaceholder : t.statusForm.notePlaceholder}
          className="w-full rounded-md border border-line px-3 py-2 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-urgent-soft px-3 py-2.5 text-sm font-semibold text-urgent">
          {state.error}
        </p>
      )}
      {state.done && !pending && unchanged && (
        <p role="status" className="rounded-lg bg-success-soft px-3 py-2.5 text-sm font-semibold text-success">
          {t.statusForm.saved}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || unchanged}
        className="w-full rounded-md bg-brand px-4 py-3 text-base font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-muted/40"
      >
        {pending ? t.common.saving : unchanged ? t.statusForm.chooseNew : t.statusForm.setTo(t.status[choice])}
      </button>
    </form>
  );
}
