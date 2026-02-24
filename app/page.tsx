"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import EmailSignupModal from "@/components/EmailSignupModal";
import TrialSignupModal from "@/components/TrialSignupModal";
import { NeuralPathProvider } from "@/components/neural-path/NeuralPathProvider";
import NeuralPathOverlay from "@/components/neural-path/NeuralPathOverlay";
import { TerrainProvider, useTerrainContext } from "@/components/terrain/TerrainProvider";
import TerrainCanvas from "@/components/terrain/TerrainCanvas";

// Ghost Ledger: dynamically imported, no SSR — canvas APIs require browser
const GhostLedger = dynamic(
  () => import("@/components/ghost-ledger/GhostLedger"),
  { ssr: false }
);

const gpuLabels = ["A100", "H100", "L40S", "RTX 4090", "V100", "T4"];

export default function Home() {
  return (
    <TerrainProvider>
      <HomeInner />
    </TerrainProvider>
  );
}

function HomeInner() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const { fireCTA } = useTerrainContext();

  return (
    <NeuralPathProvider>
    <main className="relative min-h-screen bg-black text-white">
      {/* z-0: 3-D terrain landscape */}
      <TerrainCanvas />
      {/* z-5: Ghost Ledger — Latin mantras etched into the hills */}
      <GhostLedger />
      {/* z-10+: all marketing copy */}
      {/* DEMO BANNER */}
      <div className="relative z-10 bg-gradient-to-r from-forest to-blue-600 px-4 py-3 text-center">
        <p className="text-sm md:text-base font-medium">
          <span className="font-semibold">New:</span> Interactive optimization
          decision tree powered by MiniMax AI
          <Link
            href="/demo/tree"
            className="ml-3 underline underline-offset-2 hover:text-white/90 transition-colors font-semibold"
          >
            Explore Optimizations →
          </Link>
        </p>
      </div>

      {/* NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-forest/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Aluminati<span className="text-glow">Ai</span>
          </Link>
          <div className="flex gap-6 items-center">
            <Link
              href="/scheduler"
              className="text-sm font-medium text-gray-300 hover:text-glow transition-colors"
            >
              Live Demo
            </Link>
            <Link
              href="/demo/tree"
              className="text-sm font-medium text-gray-300 hover:text-glow transition-colors"
            >
              Decision Tree
            </Link>
            <Link
              href="/api-demo"
              className="text-sm font-medium text-gray-300 hover:text-glow transition-colors"
            >
              API
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-300 hover:text-glow transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-forest to-glow text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Access
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" className="relative z-10 px-6 py-28 md:py-40 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-forest/20 to-blue-900/20 pointer-events-none" />
        {/* Watermark */}
        <div className="watermark">AluminatAi</div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              AI Energy Usage is a{" "}
              <span className="bg-gradient-to-r from-glow to-blue-400 bg-clip-text text-transparent">
                Black Box
              </span>
            </h1>
            <p className="mt-4 text-2xl md:text-3xl font-semibold text-glow">
              We open it.
            </p>
            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              See every watt your AI consumes. Know exactly where it goes. Cut
              waste without cutting speed.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/scheduler"
                className="px-8 py-4 bg-gradient-to-r from-forest to-glow text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg shadow-lg shadow-glow/20"
              >
                Try Interactive Demo
              </Link>
              <button
                onClick={() => { fireCTA(); setIsModalOpen(true); }}
                className="px-8 py-4 border border-white/30 text-white font-semibold rounded-lg hover:border-glow hover:text-glow transition-colors text-lg"
              >
                Request Early Access
              </button>
            </div>
          </div>

          {/* GPU Card Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {gpuLabels.map((label, i) => (
              <div
                key={label}
                className="gpu-card p-5 text-center"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div
                  className="animate-float"
                  style={{ animationDelay: `${i * 0.5}s` }}
                >
                  <div className="text-xs text-glow/70 font-mono uppercase tracking-widest mb-2">
                    GPU {String(i).padStart(2, "0")}
                  </div>
                  <div className="text-lg font-semibold">{label}</div>
                  <div className="mt-2 h-1 rounded-full bg-gradient-to-r from-glow/60 to-blue-500/60 w-full" />
                  <div className="mt-2 text-xs text-gray-500 font-mono">
                    {Math.floor(180 + Math.random() * 120)}W
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section id="problem" className="relative z-10 px-6 py-24 md:py-32 bg-neutral-950/80">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-center">
            What You Can&apos;t See Is{" "}
            <span className="text-glow">Costing You</span>
          </h2>
          <p className="text-gray-400 text-center mb-14 max-w-2xl mx-auto">
            AI infrastructure hides its biggest inefficiency in plain sight.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Invisible Consumption",
                body: "Your GPUs are running. But where's the power going?",
              },
              {
                title: "Cost Without Cause",
                body: "Cloud bills show cost. Not cause.",
              },
              {
                title: "Scale Amplifies Waste",
                body: "What wastes pennies on 10 GPUs burns thousands on 1,000.",
              },
              {
                title: "Guesswork Compliance",
                body: "Regulators want numbers. You have guesses.",
              },
            ].map((card) => (
              <div key={card.title} className="glass-card p-8">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {card.title}
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative z-10 px-6 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">
            How It Works
          </h2>

          {/* Desktop: horizontal flow */}
          <div className="hidden md:flex items-stretch gap-0">
            {[
              {
                step: "01",
                title: "Install",
                body: "A lightweight agent. 60 seconds. Zero disruption.",
              },
              {
                step: "02",
                title: "See",
                body: "Every watt, mapped to every job, model, and team.",
              },
              {
                step: "03",
                title: "Save",
                body: "Cut waste. Hit targets. Ship faster.",
              },
            ].map((item, i) => (
              <div key={item.step} className="contents">
                <div className="glass-card p-8 flex-1 text-center">
                  <div className="text-3xl font-bold text-glow mb-4">
                    {item.step}
                  </div>
                  <h4 className="text-xl font-semibold mb-3">{item.title}</h4>
                  <p className="text-gray-400 leading-relaxed">{item.body}</p>
                </div>
                {i < 2 && <div className="energy-line" />}
              </div>
            ))}
          </div>

          {/* Mobile: vertical stack */}
          <div className="md:hidden space-y-6">
            {[
              {
                step: "01",
                title: "Install",
                body: "A lightweight agent. 60 seconds. Zero disruption.",
              },
              {
                step: "02",
                title: "See",
                body: "Every watt, mapped to every job, model, and team.",
              },
              {
                step: "03",
                title: "Save",
                body: "Cut waste. Hit targets. Ship faster.",
              },
            ].map((item) => (
              <div key={item.step} className="glass-card p-8 text-center">
                <div className="text-3xl font-bold text-glow mb-4">
                  {item.step}
                </div>
                <h4 className="text-xl font-semibold mb-3">{item.title}</h4>
                <p className="text-gray-400 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 px-6 py-24 md:py-32 bg-neutral-950/80">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-center">
            Energy Intelligence, Not Just Monitoring
          </h2>
          <p className="text-gray-400 text-center mb-14 max-w-2xl mx-auto">
            Go beyond dashboards. Get actionable insight into every watt.
          </p>

          <div className="space-y-10">
            <div className="feature-block">
              <h3 className="text-2xl font-semibold mb-3">
                See exactly where your power goes
              </h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                GPU-level power monitoring captures real-time consumption from
                every card. No sampling, no estimates — actual watts, attributed
                to actual work.
              </p>
            </div>

            <div className="feature-block">
              <h3 className="text-2xl font-semibold mb-3">
                Know who used what — down to the training run
              </h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Energy gets mapped to jobs, models, users, and teams. Not just
                &quot;this GPU drew 300W&quot; — but &quot;this fine-tuning run
                consumed 15 kWh over 6 hours.&quot;
              </p>
            </div>

            <div className="feature-block">
              <h3 className="text-2xl font-semibold mb-3">
                Make smarter decisions with real data
              </h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Compare training runs, identify inefficient jobs, and make
                energy-aware scheduling decisions. Reduce waste without
                sacrificing performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BUILT FOR AI */}
      <section id="built-for-ai" className="relative z-10 px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-14">
            Built Specifically for AI Workloads
          </h2>

          <div className="space-y-8 text-left max-w-3xl mx-auto">
            {[
              {
                highlight: "Energy-first monitoring.",
                body: "Traditional tools focus on utilization or throughput. We start with power consumption and work backwards to attribution and optimization.",
              },
              {
                highlight: "Designed for ML infrastructure.",
                body: "Not generic compute monitoring adapted for AI. Built from the ground up to understand training runs, inference workloads, and multi-GPU jobs.",
              },
              {
                highlight: "Attribution at every layer.",
                body: "From the GPU to the model to the team. Energy usage becomes a first-class metric alongside accuracy, latency, and cost.",
              },
            ].map((item) => (
              <div key={item.highlight} className="flex gap-4 items-start">
                <div className="text-glow text-xl font-bold mt-0.5">→</div>
                <p className="text-gray-300 text-lg leading-relaxed">
                  <span className="font-semibold text-white">
                    {item.highlight}
                  </span>{" "}
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FREE TRIAL */}
      <section id="free-trial" className="relative z-10 px-6 py-24 md:py-32 bg-gradient-to-br from-forest/15 via-neutral-950/80 to-blue-900/15 border-y border-forest/20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card p-10 md:p-14">
            <h2 className="text-3xl md:text-4xl font-semibold mb-6">
              Start Monitoring Your GPUs Today
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto leading-relaxed">
              Try our lightweight GPU monitoring agent free for 30 days. Track
              energy costs, identify waste, and optimize your
              infrastructure — all from a real-time dashboard.
            </p>
            <button
              onClick={() => setIsTrialModalOpen(true)}
              className="px-8 py-4 bg-gradient-to-r from-forest to-glow text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg shadow-lg shadow-glow/20"
            >
              Start Free Trial
            </button>
            <p className="mt-5 text-sm text-gray-500">
              No credit card required &middot; 30-day free trial &middot;
              Install in under 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section id="closing-cta" className="relative z-10 px-6 py-32 md:py-40 green-wave-bg">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
            The Future of AI Is{" "}
            <span className="bg-gradient-to-r from-glow to-blue-400 bg-clip-text text-transparent">
              Energy-Aware
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            As AI scales, teams that understand and optimize their energy
            footprint will build faster, cheaper, and more sustainable
            infrastructure.
          </p>

          <button
            onClick={() => { fireCTA(); setIsModalOpen(true); }}
            className="px-10 py-5 bg-gradient-to-r from-forest to-glow text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg shadow-lg shadow-glow/20"
          >
            Get Early Access
          </button>

          <p className="mt-8 text-gray-500 text-sm">
            Join ML platform teams and AI infrastructure engineers building the
            next generation of energy-aware systems.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 px-6 py-12 border-t border-forest/30">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>
            &copy; {new Date().getFullYear()} AluminatiAi. All rights reserved.
          </p>
          <p className="mt-2">AluminatiAi.com</p>
        </div>
      </footer>

      {/* NEURAL PATH OVERLAY */}
      <NeuralPathOverlay />

      {/* MODALS (z-60 to render above neural path overlay) */}
      <div className="relative z-[60]">
        <EmailSignupModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
        <TrialSignupModal
          isOpen={isTrialModalOpen}
          onClose={() => setIsTrialModalOpen(false)}
        />
      </div>
    </main>
    </NeuralPathProvider>
  );
}
