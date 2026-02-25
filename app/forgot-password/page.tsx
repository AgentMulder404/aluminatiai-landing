"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/auth-helpers";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(resetError.message || "Failed to send reset email. Please try again.");
      setIsLoading(false);
      return;
    }

    setSent(true);
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold mb-8 inline-block">
            AluminatiAi
          </Link>
          <h1 className="text-3xl font-bold mt-6">Reset Password</h1>
          <p className="text-gray-400 mt-2">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {/* Card */}
        <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                <p className="text-green-300 text-sm font-medium">Reset email sent!</p>
                <p className="text-green-400/70 text-sm mt-1">
                  Check your inbox for a link to reset your password. It expires in 1 hour.
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Didn&apos;t get it?{" "}
                <button
                  onClick={() => { setSent(false); setEmail(""); }}
                  className="text-gray-300 hover:text-white transition-colors underline"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
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
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <Link href="/login" className="hover:text-white transition-colors">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
