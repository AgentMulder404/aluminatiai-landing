"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const DecisionTreeVisual = dynamic(
  () => import("@/components/DecisionTreeVisual"),
  { ssr: false }
);

export default function TreeDemoPage() {
  const [workloadDescription, setWorkloadDescription] = useState(
    "Fine-tuning Llama-3 70B on 8x A100 GPUs for 10 epochs with full precision training"
  );
  const [agentResponse, setAgentResponse] = useState<any>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTree, setShowTree] = useState(false);

  /**
   * Call agent API to get workload analysis
   */
  const analyzeWithAgent = async () => {
    setLoadingAgent(true);
    setError(null);
    setAgentResponse(null);
    setShowTree(false);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: workloadDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze workload");
      }

      setAgentResponse(data);
      setShowTree(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingAgent(false);
    }
  };

  /**
   * Generate tree without agent (direct generation)
   */
  const generateTreeDirect = () => {
    setAgentResponse(null);
    setShowTree(true);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold hover:text-gray-300 transition-colors">
            ← AluminatiAI
          </Link>
          <div className="flex gap-6 items-center">
            <Link
              href="/scheduler"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Live Demo
            </Link>
            <Link
              href="/api-demo"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              API
            </Link>
            <span className="text-sm text-white">Decision Tree</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold mb-4">Optimization Decision Tree</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            AI-powered decision tree showing energy optimization paths with savings, tradeoffs, and actionable steps
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-neutral-900 rounded-lg p-6 mb-8 border border-neutral-800">
          <label className="block text-lg font-semibold mb-3">
            Describe Your AI Workload
          </label>
          <textarea
            value={workloadDescription}
            onChange={(e) => setWorkloadDescription(e.target.value)}
            placeholder="Example: Training GPT-3 175B on 128 H100 GPUs for 2 weeks..."
            className="w-full h-32 px-4 py-3 bg-black text-white rounded-lg border border-neutral-700 focus:border-purple-500 focus:outline-none resize-none"
            disabled={loadingAgent}
          />

          <div className="mt-4 flex gap-4">
            <button
              onClick={analyzeWithAgent}
              disabled={loadingAgent || !workloadDescription.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingAgent ? "Analyzing with AI Agent..." : "Analyze with AI Agent"}
            </button>

            <button
              onClick={generateTreeDirect}
              disabled={loadingAgent || !workloadDescription.trim()}
              className="px-6 py-3 bg-neutral-800 text-white font-semibold rounded-lg hover:bg-neutral-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Tree Only
            </button>
          </div>

          <div className="mt-3 text-sm text-gray-400">
            <span className="font-semibold text-purple-400">AI Agent:</span> Full analysis with energy estimates + decision tree
            {" • "}
            <span className="font-semibold text-blue-400">Tree Only:</span> Skip agent, generate optimization paths directly
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-8">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loadingAgent && (
          <div className="bg-neutral-900 rounded-lg p-12 border border-neutral-800 text-center mb-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-neutral-700 border-t-purple-600 mb-4"></div>
            <div className="text-lg text-gray-300">Analyzing workload with AI agent...</div>
            <div className="text-sm text-gray-500 mt-2">This may take 15-30 seconds</div>
          </div>
        )}

        {/* Agent Response Summary */}
        {agentResponse && !loadingAgent && (
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg p-6 mb-8 border border-purple-700/50">
            <h3 className="text-2xl font-bold mb-4">Agent Analysis</h3>

            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bg-black/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Energy</div>
                <div className="text-2xl font-bold text-green-400">
                  {agentResponse.estimated_kwh} kWh
                </div>
              </div>

              <div className="bg-black/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Carbon</div>
                <div className="text-2xl font-bold text-blue-400">
                  {agentResponse.estimated_carbon_kg} kg CO₂e
                </div>
              </div>

              <div className="bg-black/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Cost</div>
                <div className="text-2xl font-bold text-yellow-400">
                  ${agentResponse.estimated_cost_usd}
                </div>
              </div>
            </div>

            {agentResponse.optimizations && agentResponse.optimizations.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-purple-400 mb-2">
                  Top Optimizations
                </div>
                <ul className="text-sm text-gray-300 space-y-1">
                  {agentResponse.optimizations.slice(0, 3).map((opt: string, i: number) => (
                    <li key={i}>• {opt}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Decision Tree */}
        {showTree && (
          <div className="bg-black rounded-lg p-8 border border-neutral-800">
            <DecisionTreeVisual
              workloadDescription={workloadDescription}
              agentResponse={agentResponse}
            />
          </div>
        )}

        {/* Instructions */}
        {!showTree && !loadingAgent && (
          <div className="bg-neutral-900 rounded-lg p-8 border border-neutral-800 text-center">
            <h3 className="text-2xl font-semibold mb-4">How It Works</h3>
            <div className="max-w-2xl mx-auto space-y-4 text-gray-300">
              <p>
                <span className="font-semibold text-white">1.</span> Describe your AI workload (training, inference, model size, GPUs, duration)
              </p>
              <p>
                <span className="font-semibold text-white">2.</span> Choose AI Agent for full analysis or generate tree directly
              </p>
              <p>
                <span className="font-semibold text-white">3.</span> Explore interactive decision tree with optimization paths
              </p>
              <p>
                <span className="font-semibold text-white">4.</span> Click nodes to see savings, tradeoffs, and cumulative impact
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-8 py-12 text-center border-t border-neutral-800 mt-12">
        <p className="text-gray-400 mb-4">
          Powered by MiniMax M2.1 for intelligent optimization tree generation
        </p>
        <Link
          href="/"
          className="text-white hover:text-gray-300 transition-colors font-semibold"
        >
          ← Back to Main Site
        </Link>
      </div>
    </div>
  );
}
