"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

const INPUT =
  "w-full rounded-md border bg-white px-3.5 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  // A wrong password used to wipe both fields: React resets a form after an action passed to its
  // `action` prop. So the form submits through onSubmit instead (no automatic reset), and the
  // fields are controlled, keeping what the staff member typed.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const hasError = Boolean(state.error);

  // After a failed attempt, put the cursor back in the password, ready to retype it.
  useEffect(() => {
    if (state.error) {
      passwordRef.current?.focus();
      passwordRef.current?.select();
    }
  }, [state]);

  const checkCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState("CapsLock"));

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <div>
        <label htmlFor="email" className="mb-1.5 block text-[15px] font-semibold">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "sign-in-error" : undefined}
          className={`${INPUT} ${hasError ? "border-urgent" : "border-line"}`}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-[15px] font-semibold">
          Password
        </label>
        <div className="relative">
          <input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={checkCapsLock}
            onKeyUp={checkCapsLock}
            onBlur={() => setCapsLock(false)}
            aria-invalid={hasError || undefined}
            aria-describedby={
              [hasError ? "sign-in-error" : "", capsLock ? "caps-lock" : ""].filter(Boolean).join(" ") ||
              undefined
            }
            className={`${INPUT} pr-12 ${hasError ? "border-urgent" : "border-line"}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-controls="password"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted hover:text-brand"
          >
            <EyeIcon crossed={showPassword} />
          </button>
        </div>
        {capsLock && (
          <p id="caps-lock" className="mt-1.5 text-sm font-semibold text-warning">
            Caps Lock is on.
          </p>
        )}
      </div>

      {state.error && (
        <div
          id="sign-in-error"
          role="alert"
          className="flex gap-2.5 rounded-lg border border-urgent/30 bg-urgent-soft px-3.5 py-3 text-[15px] text-urgent"
        >
          <svg
            viewBox="0 0 24 24"
            width={20}
            height={20}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden
            className="mt-px shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5v.01" />
          </svg>
          <span className="font-semibold">{state.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-3.5 text-base font-bold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

/** An eye to show the password; crossed out while it's shown, to hide it again. */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M4 4l16 16" />}
    </svg>
  );
}
