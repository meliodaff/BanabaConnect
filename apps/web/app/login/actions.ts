"use server";

import { redirect } from "next/navigation";
import { DICTIONARIES } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
}

export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Errors show on the sign-in page, which is always in Filipino.
  const t = DICTIONARIES.fil;
  if (!email || !password) {
    return { error: t.login.errors.missing };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error: error.code === "invalid_credentials" ? t.login.errors.wrong : t.login.errors.offline,
    };
  }

  redirect("/");
}
