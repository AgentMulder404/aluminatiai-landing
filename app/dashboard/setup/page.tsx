"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="shrink-0 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm text-gray-300 hover:text-white transition-colors font-mono"
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

// ── Code block with copy ──────────────────────────────────────────────────────

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-black px-4 py-3">
      <code className="flex-1 font-mono text-sm text-gray-300 break-all">{code}</code>
      <CopyButton text={code} label={label} />
    </div>
  );
}

// ── Connection poller ─────────────────────────────────────────────────────────

type ConnectionStatus = "idle" | "polling" | "connected" | "error";

function ConnectionPoller({ onConnected }: { onConnected: () => void }) {
  const [status, setStatus]   = useState<ConnectionStatus>("idle");
  const [dots, setDots]       = useState(".");
  const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotsRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    setStatus("polling");

    // Animate dots
    dotsRef.current = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);

    // Poll for first job/metric every 5s
    intervalRef.current = setInterval(async () => {
      try {
        const res  = await fetch("/api/dashboard/jobs?limit=1");
        const data = await res.json();
        if (res.ok && data.jobs?.length > 0) {
          clearInterval(intervalRef.current!);
          clearInterval(dotsRef.current!);
          setStatus("connected");
          setTimeout(onConnected, 1500);
        }
      } catch {
        // network blip — keep polling
      }
    }, 5000);
  }, [onConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (dotsRef.current)    clearInterval(dotsRef.current);
    };
  }, []);

  if (status === "idle") {
    return (
      <button
        onClick={startPolling}
        className="w-full rounded-lg border border-forest/40 bg-forest/10 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-forest/20"
      >
        I've started the agent — verify connection
      </button>
    );
  }

  if (status === "polling") {
    return (
      <div className="flex items-center gap-4 rounded-lg border border-neutral-700 bg-neutral-950 px-6 py-4">
        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
        <span className="text-sm text-gray-300">
          Waiting for first metric{dots}
        </span>
        <span className="ml-auto text-xs text-gray-600">checking every 5s</span>
      </div>
    );
  }

  if (status === "connected") {
    return (
      <div className="flex items-center gap-4 rounded-lg border border-forest/40 bg-forest/10 px-6 py-4">
        <div className="h-2 w-2 rounded-full bg-green-400" />
        <span className="text-sm font-semibold text-green-400">
          Connected! Redirecting to dashboard…
        </span>
      </div>
    );
  }

  return null;
}

// ── Step wrapper ──────────────────────────────────────────────────────────────

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-8">
      <div className="flex items-start gap-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-glow/30 bg-glow/10 text-sm font-bold text-glow">
          {n}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();

  const [apiKey,    setApiKey]    = useState<string>("");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [rotating,  setRotating]  = useState(false);

  // ── Fetch profile ───────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/user/profile");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setApiKey(data.profile.api_key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API key");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Rotate key ──────────────────────────────────────────────────────────
  async function rotateKey() {
    setRotating(true);
    try {
      const res  = await fetch("/api/user/profile", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "rotate_api_key" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rotation failed");
      setApiKey(data.api_key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Key rotation failed");
    } finally {
      setRotating(false);
    }
  }

  // Commands with live key substitution
  const runCmd  = apiKey
    ? `ALUMINATAI_API_KEY=${apiKey} python main.py`
    : "ALUMINATAI_API_KEY=<your-key> python main.py";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Connect your GPU agent</h1>
        <p className="mt-2 text-gray-400">
          Three steps. Under two minutes. Metrics start flowing immediately.
        </p>
      </div>

      {/* Step 1 — API Key */}
      <Step n={1} title="Copy your API key">
        <p className="mb-4 text-sm text-gray-400">
          This key authenticates your agent. Keep it secret.
        </p>

        {loading ? (
          <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-black px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-700 border-t-purple-500" />
            <span className="text-sm text-gray-500">Loading…</span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-4">
            <p className="mb-3 text-sm text-red-400">{error}</p>
            <button
              onClick={fetchProfile}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-black px-4 py-3">
              <code className="flex-1 truncate font-mono text-sm text-white">
                {apiKey}
              </code>
              <CopyButton text={apiKey} />
              <button
                onClick={rotateKey}
                disabled={rotating}
                className="shrink-0 rounded-lg border border-neutral-700 px-3 py-2 text-xs text-gray-400 hover:border-red-700 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {rotating ? "Rotating…" : "Rotate"}
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Rotating generates a new key — your old key stops working immediately.
            </p>
          </div>
        )}
      </Step>

      {/* Step 2 — Install */}
      <Step n={2} title="Install the agent">
        <p className="mb-4 text-sm text-gray-400">
          On the machine with your GPUs, run:
        </p>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs text-gray-500 uppercase tracking-wide">Install dependencies</p>
            <CodeBlock code="pip install nvidia-ml-py3 requests" />
          </div>
          <div>
            <p className="mb-2 text-xs text-gray-500 uppercase tracking-wide">Download agent</p>
            <CodeBlock code="git clone https://github.com/AgentMulder404/AluminatAI.git && cd AluminatAI/agent" />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-xs text-gray-500">
          <strong className="text-gray-400">Requires:</strong> Python 3.8+, NVIDIA GPU with drivers installed.
          Verify with <code className="text-purple-400">nvidia-smi</code> before proceeding.
        </div>
      </Step>

      {/* Step 3 — Run */}
      <Step n={3} title="Run the agent">
        <p className="mb-4 text-sm text-gray-400">
          Your API key is pre-filled — just copy and run:
        </p>

        <CodeBlock code={runCmd} label="Copy command" />

        <p className="mt-3 text-xs text-gray-600">
          Metrics are uploaded every 60 seconds. Leave it running in a tmux session or
          configure it as a systemd service for persistent monitoring.
        </p>
      </Step>

      {/* Step 4 — Verify */}
      <Step n={4} title="Verify connection">
        <p className="mb-4 text-sm text-gray-400">
          Once the agent is running, confirm it's sending data:
        </p>
        <ConnectionPoller onConnected={() => router.push("/dashboard")} />
      </Step>

      {/* Troubleshooting */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Troubleshooting
        </h3>
        <div className="space-y-4 text-sm text-gray-400">
          <div>
            <p className="font-medium text-white">No NVIDIA GPU detected</p>
            <p className="mt-1">
              Run <code className="text-purple-400">nvidia-smi</code> — if it fails,
              install NVIDIA drivers first.
            </p>
          </div>
          <div>
            <p className="font-medium text-white">Authentication error</p>
            <p className="mt-1">
              Check your key starts with <code className="text-purple-400">alum_</code>.
              If you rotated it, update <code className="text-purple-400">ALUMINATAI_API_KEY</code> in
              your running shell.
            </p>
          </div>
          <div>
            <p className="font-medium text-white">Metrics not appearing</p>
            <p className="mt-1">
              The agent uploads every 60s. Wait one minute then click verify above.
              Check the agent terminal output for upload errors.
            </p>
          </div>
          <div>
            <p className="font-medium text-white">Windows</p>
            <p className="mt-1">
              Run in PowerShell or Command Prompt — not WSL. Set the key then start the agent:
            </p>
            <p className="mt-2 font-mono text-xs text-gray-500 bg-black border border-neutral-800 rounded px-3 py-2 leading-relaxed">
              <span className="text-purple-400">$env:ALUMINATAI_API_KEY</span> = &quot;{apiKey || "alum_YOUR_KEY_HERE"}&quot;<br />
              <span className="text-purple-400">python main.py</span>
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Or use <code className="text-purple-400">start.bat {apiKey || "alum_YOUR_KEY_HERE"}</code> from the agent directory.
            </p>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-neutral-800">
          <Link
            href="/docs/agent"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-2"
          >
            Full agent docs: CLI flags, env vars, systemd setup, scheduler integration →
          </Link>
        </div>
      </div>
    </div>
  );
}
