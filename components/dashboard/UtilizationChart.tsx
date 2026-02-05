"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  time: string;
  power_w: number;
  utilization_pct: number;
}

interface UtilizationChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
}

export default function UtilizationChart({ data, loading }: UtilizationChartProps) {
  if (loading) {
    return (
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
        <h2 className="text-xl font-semibold mb-2">Utilization vs Power (Last 24h)</h2>
        <p className="text-sm text-gray-400 mb-6">
          Low utilization with high power indicates wasted energy
        </p>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-neutral-700 border-t-purple-600"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
        <h2 className="text-xl font-semibold mb-2">Utilization vs Power (Last 24h)</h2>
        <p className="text-sm text-gray-400 mb-6">
          Low utilization with high power indicates wasted energy
        </p>
        <div className="text-center py-24">
          <p className="text-gray-400 mb-4">No data available yet</p>
          <p className="text-sm text-gray-500">
            Chart will populate once your agent starts sending metrics.
          </p>
        </div>
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.map((d) => ({
    time: new Date(d.time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    power: d.power_w,
    utilization: d.utilization_pct,
  }));

  return (
    <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
      <h2 className="text-xl font-semibold mb-2">Utilization vs Power (Last 24h)</h2>
      <p className="text-sm text-gray-400 mb-6">
        Low utilization with high power indicates wasted energy
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="time"
            stroke="#666"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#999' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#666"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#999' }}
            label={{
              value: 'Power (W)',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#888' },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#666"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#999' }}
            label={{
              value: 'Utilization (%)',
              angle: 90,
              position: 'insideRight',
              style: { fill: '#888' },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111',
              border: '1px solid #333',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#999' }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="power"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            name="Power (W)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="utilization"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Utilization (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
