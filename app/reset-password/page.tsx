"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { updatePassword } from "@/lib/auth-helpers";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Supabase appends error/error_description when the link is expired or invalid
    const err = searchParams.get("error") || searchParams.get("error_description");
    if (err) setLinkInvalid(true);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setIsLoading(true);
    const { error: updateError } = await updatePassword(password);

    if (updateError) {
      setError(updateError.message || "Failed to update password. Please try again.");
      setIsLoading(false);
      return;
    }

    router.push("/login?message=password_updated");
  };

  if (linkInvalid) {
    return (
      <div className="space-y-4 text-center">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-300 text-sm font-medium">Reset link expired or invalid.</p>
          <p className="text-red-400/70 text-sm mt-1">
            Reset links expire after 1 hour. Please request a new one.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="block w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-center"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
          New Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
          className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-2">
          Confirm Password
        </label>
        <input
          type="password"
          id="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your new password"
          required
          className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 transition-colors"
        />
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-neutral-700 border-t-purple-600"></div>
        </main>
      }
    >
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold mb-8 inline-block">
              AluminatiAi
            </Link>
            <h1 className="text-3xl font-bold mt-6">Set New Password</h1>
            <p className="text-gray-400 mt-2">
              Choose a strong password for your account.
            </p>
          </div>

          {/* Card */}
          <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
            <ResetPasswordForm />
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-sm text-gray-500">
            <Link href="/login" className="hover:text-white transition-colors">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </main>
    </Suspense>
  );
}
