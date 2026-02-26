"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

// ── Shared types ──────────────────────────────────────────────────────────────

interface Profile {
  full_name: string | null;
  company: string | null;
  email: string;
  electricity_rate_per_kwh: number;
  trial_ends_at: string;
  created_at: string;
  is_trial_active: boolean;
  trial_days_remaining: number;
}

type SaveState = "idle" | "saving" | "saved" | "error";

// ── Section wrapper ───────────────────────────────────────────────────────────

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Save button ───────────────────────────────────────────────────────────────

function SaveButton({
  state,
  onClick,
}: {
  state: SaveState;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={state === "saving" || state === "saved"}
      className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : "Save changes"}
    </button>
  );
}

// ── Inline feedback ───────────────────────────────────────────────────────────

function Feedback({ state, error }: { state: SaveState; error: string | null }) {
  if (state === "error" && error) {
    return (
      <p className="text-sm text-red-400">{error}</p>
    );
  }
  return null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Profile section state
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [profileState, setProfileState] = useState<SaveState>("idle");
  const [profileError, setProfileError] = useState<string | null>(null);

  // Electricity rate section state
  const [rate, setRate] = useState("");
  const [rateState, setRateState] = useState<SaveState>("idle");
  const [rateError, setRateError] = useState<string | null>(null);

  // ── Load profile ────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const p: Profile = data.profile;
      setProfile(p);
      setFullName(p.full_name ?? "");
      setCompany(p.company ?? "");
      setRate(p.electricity_rate_per_kwh?.toString() ?? "0.12");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── Save profile (name + company) ────────────────────────────────────────
  async function saveProfile() {
    setProfileState("saving");
    setProfileError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim() || null, company: company.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setProfileState("saved");
      setTimeout(() => setProfileState("idle"), 2500);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Save failed");
      setProfileState("error");
    }
  }

  // ── Save electricity rate ────────────────────────────────────────────────
  async function saveRate() {
    const parsed = parseFloat(rate);
    if (isNaN(parsed) || parsed < 0 || parsed > 1) {
      setRateError("Rate must be between $0.00 and $1.00 per kWh.");
      setRateState("error");
      return;
    }
    setRateState("saving");
    setRateError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electricity_rate_per_kwh: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setRateState("saved");
      setTimeout(() => setRateState("idle"), 2500);
    } catch (err) {
      setRateError(err instanceof Error ? err.message : "Save failed");
      setRateState("error");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 animate-pulse">
            <div className="h-4 w-32 bg-neutral-800 rounded mb-4" />
            <div className="h-10 w-full bg-neutral-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-6">
          <p className="text-red-400 text-sm">{loadError}</p>
          <button
            onClick={loadProfile}
            className="mt-3 px-4 py-2 rounded-lg bg-red-700 text-sm text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const trialEndDate = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-gray-400">Manage your profile and dashboard preferences.</p>
      </div>

      {/* ── Profile ──────────────────────────────────────────────────────── */}
      <SettingsSection
        title="Profile"
        description="Your name and company are shown in upgrade notifications."
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setProfileState("idle"); }}
              placeholder="Jane Smith"
              className="w-full px-4 py-2.5 bg-black border border-neutral-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-600 transition-colors text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => { setCompany(e.target.value); setProfileState("idle"); }}
              placeholder="Acme Corp"
              className="w-full px-4 py-2.5 bg-black border border-neutral-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-600 transition-colors text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SaveButton state={profileState} onClick={saveProfile} />
          <Feedback state={profileState} error={profileError} />
        </div>
      </SettingsSection>

      {/* ── Electricity rate ─────────────────────────────────────────────── */}
      <SettingsSection
        title="Electricity rate"
        description="Used to calculate dollar costs across your entire dashboard. Set this to your actual rate for accurate cost attribution."
      >
        <div className="flex items-center gap-3">
          <div className="relative w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={rate}
              onChange={(e) => { setRate(e.target.value); setRateState("idle"); }}
              step="0.01"
              min="0"
              max="1"
              className="w-full pl-7 pr-12 py-2.5 bg-black border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-purple-600 transition-colors text-sm"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">/ kWh</span>
          </div>
        </div>
        <p className="text-xs text-gray-600">
          Typical US commercial rate: $0.08–$0.15/kWh. Check your latest utility bill for the exact figure.
        </p>
        <div className="flex items-center gap-4">
          <SaveButton state={rateState} onClick={saveRate} />
          <Feedback state={rateState} error={rateError} />
        </div>
      </SettingsSection>

      {/* ── Account ──────────────────────────────────────────────────────── */}
      <SettingsSection title="Account">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-neutral-800">
            <dt className="text-gray-500">Email</dt>
            <dd className="text-white font-mono">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between py-2 border-b border-neutral-800">
            <dt className="text-gray-500">Trial status</dt>
            <dd>
              {profile?.is_trial_active ? (
                <span className="text-green-400">
                  Active · {profile.trial_days_remaining} {profile.trial_days_remaining === 1 ? "day" : "days"} remaining
                </span>
              ) : (
                <span className="text-red-400">Expired</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between py-2 border-b border-neutral-800">
            <dt className="text-gray-500">Trial ends</dt>
            <dd className="text-white">{trialEndDate}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-gray-500">Member since</dt>
            <dd className="text-white">{memberSince}</dd>
          </div>
        </dl>
        <div className="pt-1">
          <Link
            href="/contact?source=settings_upgrade"
            className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors"
          >
            Contact us to upgrade →
          </Link>
        </div>
      </SettingsSection>

      {/* ── API key ──────────────────────────────────────────────────────── */}
      <SettingsSection
        title="API key"
        description="Your key authenticates the GPU monitoring agent."
      >
        <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-black px-4 py-3 text-sm">
          <span className="text-gray-500 font-mono">alum_••••••••••••••••••••</span>
          <Link
            href="/dashboard/setup"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors shrink-0 ml-4"
          >
            View & rotate in Setup →
          </Link>
        </div>
        <p className="text-xs text-gray-600">
          Rotating your key immediately invalidates the old one. Update your running agent after rotation.
        </p>
      </SettingsSection>
    </div>
  );
}
