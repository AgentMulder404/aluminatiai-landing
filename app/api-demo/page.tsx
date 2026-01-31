import APIDemo from "@/components/APIDemo";
import Link from "next/link";

export default function APIDemoPage() {
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
              className="text-sm font-medium text-white"
            >
              API
            </Link>
            <button
              className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Get Access
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <APIDemo />

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-8 py-12 text-center border-t border-neutral-800 mt-12">
        <p className="text-gray-400 mb-4">
          Passive energy monitoring API for AI workloads
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
