export default function Benefits() {
  return (
    <section className="py-20 bg-white text-gray-900">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12">Why Choose AluminatAI?</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6 rounded-xl shadow-lg hover:shadow-2xl transition">
            <h3 className="text-2xl font-semibold mb-2">Reduce Costs</h3>
            <p>Optimize GPU usage and cloud spending efficiently with actionable insights.</p>
          </div>
          <div className="p-6 rounded-xl shadow-lg hover:shadow-2xl transition">
            <h3 className="text-2xl font-semibold mb-2">Sustainability</h3>
            <p>Track and lower the carbon footprint of your AI workloads across every job.</p>
          </div>
          <div className="p-6 rounded-xl shadow-lg hover:shadow-2xl transition">
            <h3 className="text-2xl font-semibold mb-2">Smarter AI Operations</h3>
            <p>Make data-driven decisions to improve efficiency, scalability, and impact.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
