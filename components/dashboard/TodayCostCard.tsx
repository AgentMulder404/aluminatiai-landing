interface TodayCostCardProps {
  data: {
    cost_usd: number;
    energy_kwh: number;
    rate_per_kwh: number;
    sample_count: number;
  } | null;
  loading?: boolean;
}

export default function TodayCostCard({ data, loading }: TodayCostCardProps) {
  if (loading) {
    return (
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
        <h2 className="text-xl font-semibold mb-6">Your GPU Energy Cost Today</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-neutral-700 border-t-purple-600"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
        <h2 className="text-xl font-semibold mb-6">Your GPU Energy Cost Today</h2>
        <p className="text-gray-400">No data available. Install the agent to start tracking.</p>
      </div>
    );
  }

  return (
    <div className="border border-neutral-800 bg-gradient-to-br from-neutral-950 to-neutral-900 rounded-lg p-8">
      <h2 className="text-xl font-semibold mb-6">Your GPU Energy Cost Today</h2>

      <div className="flex items-baseline gap-2 mb-8">
        <span className="text-6xl font-bold text-green-400">
          ${data.cost_usd.toFixed(2)}
        </span>
        <span className="text-gray-400 text-lg">USD</span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500 mb-1">Energy Consumed</div>
          <div className="text-white font-medium">
            {data.energy_kwh.toFixed(3)} kWh
          </div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Your Rate</div>
          <div className="text-white font-medium">
            ${data.rate_per_kwh.toFixed(2)}/kWh
          </div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Samples</div>
          <div className="text-white font-medium">
            {data.sample_count.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
