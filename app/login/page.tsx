"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-helpers";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user just confirmed their email
    const confirmed = searchParams.get('confirmed');
    if (confirmed === 'true') {
      setSuccessMessage('Email confirmed! Please sign in to continue.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(signInError.message || "Failed to sign in. Please try again.");
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Successfully signed in, redirect to dashboard
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Error signing in:", err);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold mb-8 inline-block">
            AluminatiAI
          </Link>
          <h1 className="text-3xl font-bold mt-6">Welcome Back</h1>
          <p className="text-gray-400 mt-2">
            Sign in to access your GPU monitoring dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 transition-colors"
              />
            </div>

            {successMessage && (
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                <p className="text-green-300 text-sm">{successMessage}</p>
              </div>
            )}

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
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-neutral-950 text-gray-500">Don't have an account?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white text-center font-semibold rounded-lg transition-colors"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Footer Links */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-neutral-700 border-t-purple-600"></div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
