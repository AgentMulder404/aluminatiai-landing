"use client";

import { useState } from "react";
import Link from "next/link";
import EmailSignupModal from "@/components/EmailSignupModal";
import TrialSignupModal from "@/components/TrialSignupModal";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* DEMO BANNER */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-center">
        <p className="text-sm md:text-base font-medium">
          <span className="mr-2">🌳</span>
          <span className="font-semibold">New:</span> Interactive optimization decision tree powered by MiniMax AI
          <Link
            href="/demo/tree"
            className="ml-3 underline underline-offset-2 hover:text-white/90 transition-colors font-semibold"
          >
            Explore Optimizations →
          </Link>
        </p>
      </div>

      {/* NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            AluminatiAI
          </Link>
          <div className="flex gap-6 items-center">
            <Link
              href="/scheduler"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Live Demo
            </Link>
            <Link
              href="/demo/tree"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Decision Tree
            </Link>
            <Link
              href="/api-demo"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              API
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Get Access
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="px-6 py-32 md:py-40 text-center max-w-6xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
          Energy Intelligence for AI Infrastructure
        </h1>
        <p className="mt-8 text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          GPU-level power monitoring mapped to jobs, models, and teams.
        </p>
        <p className="mt-6 text-base md:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          AluminatiAI makes AI energy usage transparent, attributable, and optimizable—so you can reduce waste, control costs, and build energy-aware infrastructure without slowing innovation.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/scheduler"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-lg shadow-lg hover:shadow-xl"
          >
            Try Interactive Demo
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors text-lg"
          >
            Request Early Access
          </button>
        </div>
      </section>

      {/* MISSION */}
      <section className="px-6 py-20 bg-neutral-950 border-y border-neutral-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-8">
            Our Mission
          </h2>
          <p className="text-gray-300 text-lg md:text-xl leading-relaxed">
            AluminatiAI's mission is to make AI energy usage transparent, attributable, and optimizable.
            As AI workloads scale, energy becomes a hidden constraint on cost, performance, and sustainability.
            We give AI teams precise visibility into GPU-level power consumption—mapped to jobs, models, and teams—so they can reduce waste, control costs, and build energy-aware AI infrastructure without slowing innovation.
          </p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">
            The Problem
          </h2>

          <div className="grid md:grid-cols-2 gap-12 md:gap-16">
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-200">
                AI Energy Usage Is Opaque
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Most AI teams have no visibility into how much energy their workloads consume.
                GPUs draw hundreds of watts per card, but this data is rarely collected,
                let alone attributed to specific jobs or models.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-200">
                Cloud Bills Don't Tell the Story
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Utilization metrics show when GPUs are busy, but not how much power they consume.
                Cloud invoices show instance costs, but hide the energy footprint.
                Without attribution, optimization is guesswork.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-200">
                Scale Amplifies the Gap
              </h3>
              <p className="text-gray-400 leading-relaxed">
                As teams move from a few GPUs to hundreds or thousands,
                energy becomes a real constraint—on budgets, on datacenter capacity,
                and on sustainability commitments.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-200">
                Compliance Lacks Technical Depth
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Sustainability reporting requires accurate energy data.
                Generic carbon calculators don't understand AI workloads.
                You need metrics that map to real infrastructure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="px-6 py-24 md:py-32 bg-neutral-950">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">
            How AluminatiAI Solves This
          </h2>

          <div className="space-y-12">
            <div className="border-l-2 border-white pl-8">
              <h3 className="text-2xl font-semibold mb-4">
                GPU-Level Power Monitoring
              </h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                We capture real-time power draw, utilization, and thermal data
                directly from GPUs using lightweight agents that don't disrupt your workloads.
              </p>
            </div>

            <div className="border-l-2 border-white pl-8">
              <h3 className="text-2xl font-semibold mb-4">
                Job-, Model-, and Team-Level Attribution
              </h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Energy usage is mapped to the jobs that consumed it—not just the instance or cluster.
                See which models, experiments, or teams are driving your energy footprint.
              </p>
            </div>

            <div className="border-l-2 border-white pl-8">
              <h3 className="text-2xl font-semibold mb-4">
                Optimization Insights That Matter
              </h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Compare training runs. Identify inefficient jobs.
                Make energy-aware scheduling decisions.
                Reduce waste without sacrificing performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-6">01</div>
              <h4 className="text-2xl font-semibold mb-4">Collect</h4>
              <p className="text-gray-400 leading-relaxed">
                Lightweight agents deployed on your infrastructure capture
                GPU power consumption, utilization, temperature, and clock speed—without
                interfering with training or inference workloads.
              </p>
            </div>

            <div>
              <div className="text-4xl font-bold text-white mb-6">02</div>
              <h4 className="text-2xl font-semibold mb-4">Attribute</h4>
              <p className="text-gray-400 leading-relaxed">
                Energy metrics are mapped to specific jobs, models, users, and teams.
                Not just "this GPU used 300W"—but "this training run consumed 15 kWh
                over 6 hours."
              </p>
            </div>

            <div>
              <div className="text-4xl font-bold text-white mb-6">03</div>
              <h4 className="text-2xl font-semibold mb-4">Optimize</h4>
              <p className="text-gray-400 leading-relaxed">
                Identify inefficient jobs, compare experiment energy costs,
                and make data-driven decisions about scheduling, hardware selection,
                and infrastructure capacity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FREE TRIAL */}
      <section className="px-6 py-24 md:py-32 bg-gradient-to-br from-purple-900/20 via-neutral-950 to-blue-900/20 border-y border-neutral-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold mb-6">
              Start Monitoring Your GPUs Today
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Try our lightweight GPU monitoring agent free for 30 days.
              Track energy costs, identify waste, and optimize your infrastructure—all from a real-time dashboard.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="border border-neutral-800 bg-neutral-950/50 rounded-lg p-6 text-center">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold mb-3">Lightweight</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Less than 1% CPU overhead and 100MB RAM. Deploy in seconds with a single install script.
              </p>
            </div>

            <div className="border border-neutral-800 bg-neutral-950/50 rounded-lg p-6 text-center">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-3">Real-Time Dashboard</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                See your GPU energy costs live. Track power draw, utilization, and identify inefficient jobs instantly.
              </p>
            </div>

            <div className="border border-neutral-800 bg-neutral-950/50 rounded-lg p-6 text-center">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="text-lg font-semibold mb-3">Your Data</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Metrics stay in your infrastructure. Full control over retention, access, and privacy.
              </p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setIsTrialModalOpen(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-lg shadow-lg hover:shadow-xl"
            >
              Start Free Trial
            </button>
            <p className="mt-4 text-sm text-gray-500">
              No credit card required • 30-day free trial • Install in under 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* WHY DIFFERENT */}
      <section className="px-6 py-24 md:py-32 bg-neutral-950 border-y border-neutral-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-12">
            Built Specifically for AI Workloads
          </h2>

          <div className="space-y-8 text-left max-w-3xl mx-auto">
            <div className="flex gap-4">
              <div className="text-white text-xl font-bold">→</div>
              <div>
                <p className="text-gray-300 text-lg leading-relaxed">
                  <span className="font-semibold text-white">Energy-first monitoring.</span> Traditional tools focus on utilization or throughput.
                  We start with power consumption and work backwards to attribution and optimization.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-white text-xl font-bold">→</div>
              <div>
                <p className="text-gray-300 text-lg leading-relaxed">
                  <span className="font-semibold text-white">Designed for ML infrastructure.</span> Not generic compute monitoring adapted for AI.
                  Built from the ground up to understand training runs, inference workloads, and multi-GPU jobs.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-white text-xl font-bold">→</div>
              <div>
                <p className="text-gray-300 text-lg leading-relaxed">
                  <span className="font-semibold text-white">Attribution at every layer.</span> From the GPU to the model to the team.
                  Energy usage becomes a first-class metric alongside accuracy, latency, and cost.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="px-6 py-32 md:py-40">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
            The Future of AI Is Energy-Aware
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            As AI scales, teams that understand and optimize their energy footprint
            will build faster, cheaper, and more sustainable infrastructure.
          </p>

          <div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-10 py-5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors text-lg"
            >
              Get Early Access
            </button>
          </div>

          <p className="mt-8 text-gray-500 text-sm">
            Join ML platform teams and AI infrastructure engineers building the next generation of energy-aware systems.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-12 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} AluminatiAI. All rights reserved.</p>
          <p className="mt-2">AluminatiAI.com</p>
        </div>
      </footer>

      {/* EMAIL SIGNUP MODAL */}
      <EmailSignupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* TRIAL SIGNUP MODAL */}
      <TrialSignupModal isOpen={isTrialModalOpen} onClose={() => setIsTrialModalOpen(false)} />
    </main>
  );
}
