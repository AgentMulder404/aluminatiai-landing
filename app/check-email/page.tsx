"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resendConfirmation } from "@/lib/auth-helpers";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const isExpired = searchParams.get("error") === "expired";

  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendError, setResendError] = useState<string | null>(null);

  // If the link was expired, nudge the user immediately
  const [showExpiredBanner, setShowExpiredBanner] = useState(isExpired);

  useEffect(() => {
    setShowExpiredBanner(isExpired);
  }, [isExpired]);

  const handleResend = async () => {
    if (!email) return;
    setResendState("sending");
    setResendError(null);

    const { error } = await resendConfirmation(email);

    if (error) {
      setResendError(error.message || "Failed to resend. Please try again.");
      setResendState("error");
      return;
    }

    setShowExpiredBanner(false);
    setResendState("sent");
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold mb-8 inline-block">
            AluminatiAi
          </Link>
        </div>

        {/* Card */}
        <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8 text-center">
          {/* Envelope icon */}
          <div className="mb-6">
            <svg
              className="w-16 h-16 mx-auto text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Expired link banner */}
          {showExpiredBanner && (
            <div className="mb-6 bg-red-900/30 border border-red-700 rounded-lg p-4 text-left">
              <p className="text-red-300 text-sm font-medium">That confirmation link has expired.</p>
              <p className="text-red-400/70 text-sm mt-1">
                Links expire after 24 hours. Click below to get a fresh one.
              </p>
            </div>
          )}

          {/* Resent success banner */}
          {resendState === "sent" && (
            <div className="mb-6 bg-green-900/30 border border-green-700 rounded-lg p-4 text-left">
              <p className="text-green-300 text-sm font-medium">Email sent!</p>
              <p className="text-green-400/70 text-sm mt-1">
                A fresh confirmation link is on its way.
              </p>
            </div>
          )}

          {/* Resend error banner */}
          {resendState === "error" && resendError && (
            <div className="mb-6 bg-red-900/30 border border-red-700 rounded-lg p-4 text-left">
              <p className="text-red-300 text-sm">{resendError}</p>
            </div>
          )}

          <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>

          {email ? (
            <p className="text-gray-400 mb-2">
              We sent a confirmation link to{" "}
              <span className="text-white font-medium">{email}</span>
            </p>
          ) : (
            <p className="text-gray-400 mb-2">
              We sent a confirmation link to your email address.
            </p>
          )}

          <p className="text-sm text-gray-500 mb-8">
            Click the link to verify your account and access your dashboard.
            {" "}Check your spam folder if you don&apos;t see it.
          </p>

          {/* Resend button — only shown when email is known */}
          {email && resendState !== "sent" && (
            <button
              onClick={handleResend}
              disabled={resendState === "sending"}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {resendState === "sending" ? "Sending..." : "Resend Confirmation Email"}
            </button>
          )}

          {resendState === "sent" && (
            <button
              onClick={handleResend}
              className="w-full px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-semibold rounded-lg transition-colors mb-4"
            >
              Send Again
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500 space-y-2">
          <div>
            Already confirmed?{" "}
            <Link href="/login" className="text-gray-300 hover:text-white transition-colors">
              Sign in
            </Link>
          </div>
          <div>
            <Link href="/" className="hover:text-white transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-neutral-700 border-t-purple-600"></div>
        </main>
      }
    >
      <CheckEmailContent />
    </Suspense>
  );
}
