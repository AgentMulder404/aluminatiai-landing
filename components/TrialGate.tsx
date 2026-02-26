"use client";

import Link from "next/link";
import { useTrialContext } from "@/contexts/TrialContext";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth-helpers";
import { useRouter } from "next/navigation";

export default function TrialGate({ children }: { children: React.ReactNode }) {
  const { isTrialActive, loading } = useTrialContext();
  const { user } = useAuth();
  const router = useRouter();

  // Never block on loading — let children render optimistically
  if (loading || isTrialActive) return <>{children}</>;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Lock icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900">
        <svg
          className="h-9 w-9 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </div>

      {/* Headline */}
      <h2 className="text-2xl font-bold text-white">Your free trial has ended</h2>

      {/* Subtext */}
      <p className="mt-3 max-w-sm text-gray-400">
        Your 30-day trial is complete. Get in touch to continue monitoring your GPU energy usage.
      </p>

      {user?.email && (
        <p className="mt-2 text-sm text-neutral-600">
          Signed in as {user.email}
        </p>
      )}

      {/* CTAs */}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/contact?source=trial_gate"
          className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-purple-700 hover:to-blue-700"
        >
          Contact us to continue →
        </Link>
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-neutral-700 px-6 py-3 text-sm font-semibold text-gray-400 transition-colors hover:border-neutral-500 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
