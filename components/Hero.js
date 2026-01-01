 export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-purple-900 to-blue-700 text-white h-screen flex flex-col justify-center items-center text-center px-4">
      <h1 className="text-5xl font-bold mb-4">Empowering Sustainable AI</h1>
      <p className="text-xl mb-8 max-w-xl">
        Measure, optimize, and report the energy, cost, and carbon footprint of your AI workloads.
      </p>
      <a
        href="#features"
        className="px-6 py-3 bg-white text-blue-700 rounded-lg font-semibold hover:bg-gray-100 transition"
      >
        Learn More
      </a>
    </section>
  )
}
