interface ManifestDetailPanelProps {
  detail: any;
  loading: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-sm">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className="text-white">{value ?? '--'}</span>
    </div>
  );
}

export default function ManifestDetailPanel({ detail, loading }: ManifestDetailPanelProps) {
  if (loading) {
    return (
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-neutral-700 border-t-purple-600"></div>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const { job, time, energy, cost, carbon, hardware, efficiency } = detail;

  return (
    <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8 space-y-6">
      <h2 className="text-xl font-semibold">
        Manifest Detail
        {job?.name && <span className="text-gray-400 ml-2 text-base font-normal">— {job.name}</span>}
      </h2>

      <Section title="Energy">
        <Field label="Total kWh" value={energy?.total_kwh?.toFixed(3)} />
        <Field label="Total Joules" value={energy?.total_joules?.toLocaleString()} />
        <Field label="Peak Power" value={energy?.peak_power_w ? `${energy.peak_power_w} W` : null} />
        <Field label="Avg Power" value={energy?.avg_power_w ? `${energy.avg_power_w} W` : null} />
      </Section>

      <Section title="Cost">
        <Field label="Total" value={cost?.total_usd != null ? `$${cost.total_usd.toFixed(2)}` : null} />
        <Field label="Rate" value={cost?.electricity_rate_per_kwh != null ? `$${cost.electricity_rate_per_kwh}/kWh` : null} />
        <Field label="Per GPU-hour" value={cost?.cost_per_gpu_hour != null ? `$${cost.cost_per_gpu_hour.toFixed(4)}` : null} />
      </Section>

      <Section title="Carbon">
        <Field label="CO2" value={carbon?.total_co2_kg != null ? `${carbon.total_co2_kg.toFixed(3)} kg` : null} />
        <Field label="Grid Intensity" value={carbon?.carbon_intensity_g_per_kwh != null ? `${carbon.carbon_intensity_g_per_kwh} g/kWh` : null} />
        <Field label="Equivalent km" value={carbon?.equivalent_km_driven} />
      </Section>

      <Section title="Hardware">
        <Field label="Architecture" value={hardware?.gpu_arch} />
        <Field label="GPU Count" value={hardware?.gpu_count} />
      </Section>

      <Section title="Efficiency">
        <Field label="Match Score" value={efficiency?.hardware_match_score != null ? `${efficiency.hardware_match_score}%` : null} />
        <Field label="Percentile" value={efficiency?.efficiency_percentile != null ? `${efficiency.efficiency_percentile}%` : null} />
      </Section>

      <Section title="Time">
        <Field label="Duration" value={time?.duration_human} />
        <Field label="Start" value={time?.start ? new Date(time.start).toLocaleString() : null} />
        <Field label="End" value={time?.end ? new Date(time.end).toLocaleString() : null} />
      </Section>
    </div>
  );
}
