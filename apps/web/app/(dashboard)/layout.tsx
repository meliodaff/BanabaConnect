import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { countPendingVerifications } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .maybeSingle();

  // Residents can sign in with the same accounts they use in the app; the dashboard is staff only.
  // Row-level security protects the data either way.
  if (profile?.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-line bg-surface p-7 text-center shadow-sm">
          <h1 className="text-xl font-bold">This account isn&apos;t barangay staff</h1>
          <p className="mt-2 text-[15px] text-muted">
            The Command Dashboard is only for barangay staff. Residents use the BanabaConnect mobile
            app.
          </p>
          <form action={signOut} className="mt-6">
            <button
              type="submit"
              className="w-full rounded-md bg-brand px-4 py-3 font-bold text-white hover:bg-brand-dark"
            >
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  const pending = await countPendingVerifications();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        staffName={profile.full_name?.trim() || "Barangay staff"}
        pendingVerifications={pending}
        signOutAction={signOut}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
