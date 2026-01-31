"use client";

import { useState } from "react";

export default function APIDemo() {
  const [activeTab, setActiveTab] = useState<"test" | "docs" | "sdk">("test");

  // Test API form state
  const [formData, setFormData] = useState({
    model_size_gb: 70,
    num_gpus: 8,
    gpu_type: "H100",
    duration_hours: 72,
    utilization_pct: 85,
    use_smart_agent: false,
    notes: ""
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // SDK Generator state
  const [sdkLanguage, setSdkLanguage] = useState("python");
  const [sdkCode, setSdkCode] = useState("");
  const [sdkLoading, setSdkLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/workloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit workload");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const generateSDK = async () => {
    setSdkLoading(true);
    try {
      const response = await fetch("/api/generate-sdk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: sdkLanguage })
      });

      const data = await response.json();
      setSdkCode(data.code || "");
    } catch (err) {
      console.error("Failed to generate SDK:", err);
    } finally {
      setSdkLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold mb-4">Workload Tracking API</h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Passive energy monitoring for AI workloads. Submit metadata, get instant energy estimates.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("test")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "test"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Live Test
        </button>
        <button
          onClick={() => setActiveTab("docs")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "docs"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Documentation
        </button>
        <button
          onClick={() => setActiveTab("sdk")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "sdk"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          SDK Generator
        </button>
      </div>

      {/* Live Test Tab */}
      {activeTab === "test" && (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
            <h2 className="text-2xl font-semibold mb-6">Submit Workload</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Model Size (GB)</label>
                <input
                  type="number"
                  value={formData.model_size_gb}
                  onChange={(e) => setFormData({ ...formData, model_size_gb: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-black border border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Number of GPUs</label>
                <input
                  type="number"
                  value={formData.num_gpus}
                  onChange={(e) => setFormData({ ...formData, num_gpus: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-black border border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">GPU Type</label>
                <select
                  value={formData.gpu_type}
                  onChange={(e) => setFormData({ ...formData, gpu_type: e.target.value })}
                  className="w-full px-4 py-2 bg-black border border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none"
                >
                  <option value="H100">H100</option>
                  <option value="A100">A100</option>
                  <option value="H200">H200</option>
                  <option value="L40S">L40S</option>
                  <option value="RTX_4090">RTX 4090</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration (hours)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.duration_hours}
                  onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-black border border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">GPU Utilization (%)</label>
                <input
                  type="number"
                  value={formData.utilization_pct}
                  onChange={(e) => setFormData({ ...formData, utilization_pct: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-black border border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  min="0"
                  max="100"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="smart_agent"
                  checked={formData.use_smart_agent}
                  onChange={(e) => setFormData({ ...formData, use_smart_agent: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="smart_agent" className="text-sm">
                  Use AI Agent (MiniMax M2.1) for smarter estimates
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-black border border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                  rows={2}
                  placeholder="e.g., Fine-tuning LLaMA 70B..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Workload"}
              </button>
            </form>
          </div>

          {/* Results */}
          <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
            <h2 className="text-2xl font-semibold mb-6">Response</h2>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="bg-black rounded-lg p-4 border border-neutral-700">
                  <div className="text-xs text-gray-500 mb-1">Workload ID</div>
                  <div className="font-mono text-sm text-purple-400">{result.id}</div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                    <div className="text-xs text-green-400 mb-1">Energy</div>
                    <div className="text-lg font-bold">{result.estimates.kwh} kWh</div>
                  </div>

                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                    <div className="text-xs text-blue-400 mb-1">Carbon</div>
                    <div className="text-lg font-bold">{result.estimates.carbon_kg} kg</div>
                  </div>

                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                    <div className="text-xs text-yellow-400 mb-1">Cost</div>
                    <div className="text-lg font-bold">${result.estimates.cost_usd}</div>
                  </div>
                </div>

                {result.agent_insights && (
                  <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                    <div className="text-sm font-semibold text-purple-400 mb-2">
                      AI Optimizations (Confidence: {(result.agent_insights.confidence * 100).toFixed(0)}%)
                    </div>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {result.agent_insights.optimizations.slice(0, 3).map((opt: string, i: number) => (
                        <li key={i}>• {opt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-black rounded-lg p-4 border border-neutral-700">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs text-gray-500">JSON Response</div>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="text-xs text-gray-400 overflow-auto max-h-60">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {!result && !error && (
              <div className="text-center text-gray-500 py-12">
                Submit a workload to see results
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documentation Tab */}
      {activeTab === "docs" && (
        <div className="bg-neutral-900 rounded-lg p-8 border border-neutral-800">
          <h2 className="text-3xl font-semibold mb-6">API Documentation</h2>

          <div className="space-y-8">
            {/* Endpoint */}
            <div>
              <h3 className="text-xl font-semibold mb-3">POST /api/workloads</h3>
              <p className="text-gray-400 mb-4">Submit AI workload metadata for energy tracking</p>

              <div className="bg-black rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-500 mb-2">Request Body</div>
                <pre className="text-sm text-green-400">
{`{
  "model_size_gb": 70.0,
  "num_gpus": 8,
  "gpu_type": "H100",
  "duration_hours": 72.0,
  "utilization_pct": 85.0,
  "use_smart_agent": false,
  "notes": "Optional description"
}`}
                </pre>
              </div>

              <div className="bg-black rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-2">Response (201 Created)</div>
                <pre className="text-sm text-blue-400">
{`{
  "id": "uuid",
  "message": "Workload submitted successfully",
  "estimates": {
    "kwh": 1234.56,
    "carbon_kg": 493.82,
    "cost_usd": 185.18,
    "calculation_method": "fallback"
  },
  "workload": { ... }
}`}
                </pre>
              </div>
            </div>

            {/* cURL Example */}
            <div>
              <h3 className="text-xl font-semibold mb-3">cURL Example</h3>
              <div className="bg-black rounded-lg p-4 relative">
                <button
                  onClick={() => copyToClipboard(`curl -X POST https://aluminatiai.com/api/workloads \\
  -H "Content-Type: application/json" \\
  -d '{
    "model_size_gb": 70.0,
    "num_gpus": 8,
    "gpu_type": "H100",
    "duration_hours": 72.0,
    "use_smart_agent": true
  }'`)}
                  className="absolute top-2 right-2 text-xs text-purple-400 hover:text-purple-300"
                >
                  Copy
                </button>
                <pre className="text-sm text-gray-300">
{`curl -X POST https://aluminatiai.com/api/workloads \\
  -H "Content-Type: application/json" \\
  -d '{
    "model_size_gb": 70.0,
    "num_gpus": 8,
    "gpu_type": "H100",
    "duration_hours": 72.0,
    "use_smart_agent": true
  }'`}
                </pre>
              </div>
            </div>

            {/* GPU Types */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Supported GPU Types</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {["H100 (700W)", "A100 (400W)", "H200 (700W)", "L40S (300W)", "RTX 4090 (450W)"].map((gpu) => (
                  <div key={gpu} className="bg-black rounded-lg p-3 border border-neutral-700 text-center">
                    <div className="text-sm font-semibold">{gpu}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SDK Generator Tab */}
      {activeTab === "sdk" && (
        <div className="bg-neutral-900 rounded-lg p-8 border border-neutral-800">
          <h2 className="text-3xl font-semibold mb-6">SDK Code Generator</h2>
          <p className="text-gray-400 mb-6">Generate integration code powered by MiniMax M2.1</p>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">Select Language</label>
            <div className="flex gap-3">
              {["python", "javascript", "typescript", "curl"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSdkLanguage(lang)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    sdkLanguage === lang
                      ? "bg-purple-600 text-white"
                      : "bg-neutral-800 text-gray-400 hover:bg-neutral-700"
                  }`}
                >
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateSDK}
            disabled={sdkLoading}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 mb-6"
          >
            {sdkLoading ? "Generating..." : "Generate SDK Code"}
          </button>

          {sdkCode && (
            <div className="bg-black rounded-lg p-4 border border-neutral-700 relative">
              <button
                onClick={() => copyToClipboard(sdkCode)}
                className="absolute top-2 right-2 px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
              >
                Copy Code
              </button>
              <pre className="text-sm text-green-400 overflow-auto max-h-96 mt-6">
                {sdkCode}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
