"use client";

import { useEffect, useState } from "react";

type TrialState = "loading" | "hidden" | "ok" | "warning" | "expired";

interface ProfileData {
  trial_days_remaining: number;
  is_trial_active: boolean;
}

export default function TrialBanner() {
  const [state, setState] = useState<TrialState>("loading");
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data: { profile?: ProfileData }) => {
        const profile = data.profile;
        if (!profile) { setState("hidden"); return; }

        const days = profile.trial_days_remaining;
        setDaysRemaining(days);

        if (!profile.is_trial_active) {
          setState("expired");
        } else if (days <= 5) {
          setState("warning");
        } else {
          setState("ok");
        }
      })
      .catch(() => setState("hidden"));
  }, []);

  if (state === "loading" || state === "hidden") return null;

  const upgradeHref =
    "mailto:contact@aluminatiai.com?subject=Upgrade%20AluminatiAi%20Trial&body=Hi%2C%20I%27d%20like%20to%20upgrade%20my%20AluminatiAi%20account.";

  if (state === "expired") {
    return (
      <div className="border-b border-red-800 bg-red-950/80 py-2 px-6 flex items-center justify-center gap-4 text-sm">
        <span className="text-red-200 font-medium">Your free trial has expired.</span>
        <a
          href={upgradeHref}
          className="text-white font-semibold underline underline-offset-2 hover:text-red-200 transition-colors"
        >
          Contact us to continue →
        </a>
      </div>
    );
  }

  if (state === "warning") {
    return (
      <div className="border-b border-red-900/50 bg-red-950/60 py-2 px-6 flex items-center justify-center gap-4 text-sm">
        <span className="text-red-300">
          Your trial expires in{" "}
          <span className="font-semibold">{daysRemaining} {daysRemaining === 1 ? "day" : "days"}</span>.
        </span>
        <a
          href={upgradeHref}
          className="text-red-200 font-semibold underline underline-offset-2 hover:text-white transition-colors"
        >
          Contact us to upgrade →
        </a>
      </div>
    );
  }

  // state === "ok"
  return (
    <div className="border-b border-neutral-800 bg-neutral-900 py-2 px-6 flex items-center justify-center gap-4 text-sm">
      <span className="text-gray-400">
        Your free trial ends in{" "}
        <span className="text-gray-300 font-medium">{daysRemaining} days</span>.
      </span>
      <a
        href={upgradeHref}
        className="text-gray-400 hover:text-white transition-colors underline underline-offset-2"
      >
        Contact us to upgrade →
      </a>
    </div>
  );
}
