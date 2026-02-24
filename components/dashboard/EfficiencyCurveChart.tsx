"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CurvePoint {
  utilization_pct: number;
  joules_per_tflop: number;
}

interface EfficiencyCurveChartProps {
  archName: string;
  theoretical: CurvePoint[];
  observed: Array<{ utilization_bucket: number; joules_per_tflop?: number; avg_joules_per_tflop?: number }>;
}

export default function EfficiencyCurveChart({
  archName,
  theoretical,
  observed,
}: EfficiencyCurveChartProps) {
  // Merge theoretical and observed into unified data keyed by utilization
  const byUtil: Record<number, { util: number; theoretical?: number; observed?: number }> = {};

  for (const t of theoretical) {
    byUtil[t.utilization_pct] = {
      util: t.utilization_pct,
      theoretical: t.joules_per_tflop,
    };
  }

  for (const o of observed) {
    const util = o.utilization_bucket;
    const jpt = o.joules_per_tflop ?? o.avg_joules_per_tflop;
    if (jpt == null) continue;
    if (!byUtil[util]) {
      byUtil[util] = { util };
    }
    byUtil[util].observed = jpt;
  }

  const chartData = Object.values(byUtil).sort((a, b) => a.util - b.util);

  return (
    <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
      <h2 className="text-xl font-semibold mb-2">Efficiency Curve: {archName}</h2>
      <p className="text-sm text-gray-400 mb-6">
        J/TFLOP across utilization levels — lower is better
      </p>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="util"
            stroke="#666"
            tick={{ fill: '#999', fontSize: 12 }}
            label={{ value: 'Utilization %', position: 'insideBottom', offset: -5, style: { fill: '#888' } }}
          />
          <YAxis
            stroke="#666"
            tick={{ fill: '#999', fontSize: 12 }}
            label={{ value: 'J/TFLOP', angle: -90, position: 'insideLeft', style: { fill: '#888' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111',
              border: '1px solid #333',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#999' }}
            labelFormatter={(val) => `${val}% utilization`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="theoretical"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="Theoretical"
          />
          {observed.length > 0 && (
            <Line
              type="monotone"
              dataKey="observed"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              name="Observed"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
