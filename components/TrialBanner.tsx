"use client";

import Link from "next/link";
import { useTrialContext } from "@/contexts/TrialContext";

export default function TrialBanner() {
  const { isTrialActive, daysRemaining, loading } = useTrialContext();

  if (loading) return null;

  if (!isTrialActive) {
    return (
      <div className="border-b border-red-800 bg-red-950/80 py-2 px-6 flex items-center justify-center gap-4 text-sm">
        <span className="text-red-200 font-medium">Your free trial has expired.</span>
        <Link
          href="/contact?source=trial_expired"
          className="text-white font-semibold underline underline-offset-2 hover:text-red-200 transition-colors"
        >
          Contact us to continue →
        </Link>
      </div>
    );
  }

  if (daysRemaining <= 5) {
    return (
      <div className="border-b border-red-900/50 bg-red-950/60 py-2 px-6 flex items-center justify-center gap-4 text-sm">
        <span className="text-red-300">
          Your trial expires in{" "}
          <span className="font-semibold">{daysRemaining} {daysRemaining === 1 ? "day" : "days"}</span>.
        </span>
        <Link
          href="/contact?source=trial_warning"
          className="text-red-200 font-semibold underline underline-offset-2 hover:text-white transition-colors"
        >
          Contact us to upgrade →
        </Link>
      </div>
    );
  }

  return (
    <div className="border-b border-neutral-800 bg-neutral-900 py-2 px-6 flex items-center justify-center gap-4 text-sm">
      <span className="text-gray-400">
        Your free trial ends in{" "}
        <span className="text-gray-300 font-medium">{daysRemaining} days</span>.
      </span>
      <Link
        href="/contact?source=trial_banner"
        className="text-gray-400 hover:text-white transition-colors underline underline-offset-2"
      >
        Contact us to upgrade →
      </Link>
    </div>
  );
}
