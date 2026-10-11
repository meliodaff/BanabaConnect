"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-[15px] font-semibold">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-[15px] font-semibold">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-line bg-white px-3.5 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-urgent-soft px-3.5 py-3 text-[15px] font-semibold text-urgent">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-3.5 text-base font-bold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
