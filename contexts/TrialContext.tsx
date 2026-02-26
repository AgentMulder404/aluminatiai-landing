"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface TrialContextValue {
  isTrialActive: boolean;
  daysRemaining: number;
  loading: boolean;
}

const TrialContext = createContext<TrialContextValue>({
  isTrialActive: true,
  daysRemaining: 0,
  loading: true,
});

export function TrialProvider({ children }: { children: React.ReactNode }) {
  const [isTrialActive, setIsTrialActive] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data: { profile?: { trial_days_remaining: number; is_trial_active: boolean } }) => {
        const profile = data.profile;
        if (!profile) { setLoading(false); return; }
        setIsTrialActive(profile.is_trial_active);
        setDaysRemaining(profile.trial_days_remaining);
      })
      .catch(() => {
        // On error, assume active so we never wrongly block access
        setIsTrialActive(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <TrialContext.Provider value={{ isTrialActive, daysRemaining, loading }}>
      {children}
    </TrialContext.Provider>
  );
}

export function useTrialContext() {
  return useContext(TrialContext);
}
