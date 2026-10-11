import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="h-1.5 bg-sun" />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Image
              src="/brand/barangay-banaba-seal.jpg"
              alt="Seal of Barangay Banaba, San Mateo, Rizal"
              width={88}
              height={88}
              priority
              className="mx-auto mb-4 h-22 w-22 rounded-full"
            />
            <p className="text-sm font-bold uppercase tracking-wider text-brand">
              Barangay Banaba, San Mateo, Rizal
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">
              Banaba<span className="text-brand">Connect</span>
            </h1>
            <p className="mt-2 text-[15px] text-muted">Command Dashboard for barangay staff</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-7 shadow-sm">
            <LoginForm />
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            Residents report through the BanabaConnect mobile app.
          </p>
        </div>
      </div>
    </main>
  );
}
