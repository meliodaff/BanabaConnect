import { redirect } from "next/navigation";
import { NewReportSoundProvider } from "@/components/NewReportSound";
import { Sidebar } from "@/components/Sidebar";
import { countPendingVerifications } from "@/lib/data";
import { getDictionary } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    redirect("/login");
  }

  const [{ data: profile }, t] = await Promise.all([
    supabase.from("profiles").select("role, full_name").eq("id", userId).maybeSingle(),
    getDictionary(),
  ]);

  // Residents can sign in with the same accounts they use in the app; the dashboard is staff only.
  // Row-level security protects the data either way.
  if (profile?.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-line bg-surface p-7 text-center shadow-sm">
          <h1 className="text-xl font-bold">{t.notStaff.title}</h1>
          <p className="mt-2 text-[15px] text-muted">{t.notStaff.body}</p>
          <form action={signOut} className="mt-6">
            <button
              type="submit"
              className="w-full rounded-md bg-brand px-4 py-3 font-bold text-white hover:bg-brand-dark"
            >
              {t.nav.signOut}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const pending = await countPendingVerifications();

  return (
    <NewReportSoundProvider>
      <div className="flex min-h-screen print:min-h-0">
        <Sidebar
          staffName={profile.full_name?.trim() || t.common.barangayStaff}
          pendingVerifications={pending}
          signOutAction={signOut}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </NewReportSoundProvider>
  );
}
