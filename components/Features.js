export default function Features() {
  return (
    <section id="features" className="py-20 bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12">Core Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center hover:scale-105 transition">
            <h3 className="text-2xl font-semibold mb-2">GPU Metrics</h3>
            <p>Real-time utilization, memory, and power metrics for each GPU in your AI workloads.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center hover:scale-105 transition">
            <h3 className="text-2xl font-semibold mb-2">Energy & Cost Tracking</h3>
            <p>Per-job energy consumption, cost estimates, and carbon footprint calculations.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center hover:scale-105 transition">
            <h3 className="text-2xl font-semibold mb-2">Dashboard & Insights</h3>
            <p>Visualize metrics, optimize workloads, and reduce environmental impact.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
