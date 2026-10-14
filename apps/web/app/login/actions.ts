"use server";

import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
}

export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const t = await getDictionary();
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
