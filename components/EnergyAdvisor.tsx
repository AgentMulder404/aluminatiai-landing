"use client";

import { useState } from "react";
import { EnergyEstimateResponse } from "@/lib/types";

export default function EnergyAdvisor() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnergyEstimateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);

  const handleAnalyze = async () => {
    if (!prompt.trim()) {
      setError("Please describe your AI workload");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze workload");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">AI Energy Advisor</h1>
        <p className="text-xl text-gray-300">
          Describe your AI workload and get instant energy estimates powered by MiniMax M2.1
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-neutral-900 rounded-lg p-6 mb-8 border border-neutral-800">
        <label className="block text-lg font-semibold mb-3">
          Describe Your AI Workload
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: I'm training a 70B parameter LLM on 8 H100 GPUs for 3 days using mixed precision training..."
          className="w-full h-40 px-4 py-3 bg-black text-white rounded-lg border border-neutral-700 focus:border-purple-500 focus:outline-none resize-none"
          disabled={loading}
        />

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {prompt.length} characters
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || !prompt.trim()}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Analyzing..." : "Analyze Energy"}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-red-400 text-xl">⚠️</span>
            <div>
              <div className="font-semibold text-red-400">Error</div>
              <div className="text-red-300">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-neutral-900 rounded-lg p-8 border border-neutral-800 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-neutral-700 border-t-purple-600 mb-4"></div>
          <div className="text-lg text-gray-300">Analyzing your workload with AI...</div>
          <div className="text-sm text-gray-500 mt-2">This may take 10-20 seconds</div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Clarifying Questions (if any) */}
          {result.clarifying_questions && result.clarifying_questions.length > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">
                Need More Information
              </h3>
              <ul className="space-y-2">
                {result.clarifying_questions.map((q, i) => (
                  <li key={i} className="text-yellow-200">• {q}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Metrics Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Energy Consumption */}
            <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-lg p-6 border border-green-700">
              <div className="text-sm text-green-300 mb-2">Energy Consumption</div>
              <div className="text-4xl font-bold text-white mb-2">
                {result.estimated_kwh.toFixed(1)}
                <span className="text-xl text-green-300 ml-2">kWh</span>
              </div>
              <div className="text-xs text-green-400">
                ~${result.estimated_cost_usd.toFixed(2)} electricity cost
              </div>
            </div>

            {/* Carbon Footprint */}
            <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-lg p-6 border border-blue-700">
              <div className="text-sm text-blue-300 mb-2">Carbon Footprint</div>
              <div className="text-4xl font-bold text-white mb-2">
                {result.estimated_carbon_kg.toFixed(1)}
                <span className="text-xl text-blue-300 ml-2">kg CO₂e</span>
              </div>
              <div className="text-xs text-blue-400">
                {(result.estimated_carbon_kg / 1000).toFixed(3)} tonnes
              </div>
            </div>

            {/* Confidence */}
            <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-lg p-6 border border-purple-700">
              <div className="text-sm text-purple-300 mb-2">Confidence</div>
              <div className="text-4xl font-bold text-white mb-2">
                {(result.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-purple-400">
                Based on provided information
              </div>
            </div>
          </div>

          {/* Optimizations */}
          {result.optimizations && result.optimizations.length > 0 && (
            <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
              <h3 className="text-2xl font-semibold mb-4">💡 Optimization Suggestions</h3>
              <ul className="space-y-3">
                {result.optimizations.map((opt, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-green-400 font-bold mt-1">{i + 1}.</span>
                    <span className="text-gray-200">{opt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reasoning Trace */}
          {result.reasoning_trace && result.reasoning_trace.length > 0 && (
            <div className="bg-neutral-900 rounded-lg border border-neutral-800">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="w-full px-6 py-4 flex justify-between items-center hover:bg-neutral-800 transition-colors"
              >
                <h3 className="text-xl font-semibold">🧠 Agent Reasoning Trace</h3>
                <span className="text-2xl">{showReasoning ? "−" : "+"}</span>
              </button>

              {showReasoning && (
                <div className="px-6 pb-6 pt-2 space-y-2">
                  {result.reasoning_trace.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-purple-400 font-mono">{i + 1}</span>
                      <span className="text-gray-300">{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Debug Info */}
          {result.raw_agent_response && (
            <div className="bg-black rounded-lg p-4 border border-neutral-700">
              <div className="text-xs text-gray-500 font-mono">
                Agent: {result.raw_agent_response.iterations} iterations, {result.raw_agent_response.tool_calls_made} tool calls, {result.raw_agent_response.duration_ms}ms
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
