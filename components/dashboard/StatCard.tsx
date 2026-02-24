interface StatCardProps {
  label: string;
  value: string;
  accent?: 'green' | 'purple' | 'blue' | 'default';
  loading?: boolean;
}

const accentColors: Record<string, string> = {
  green: 'text-green-400',
  purple: 'text-purple-400',
  blue: 'text-blue-400',
  default: 'text-white',
};

export default function StatCard({ label, value, accent = 'default', loading }: StatCardProps) {
  return (
    <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-5">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      {loading ? (
        <div className="h-8 w-24 bg-neutral-800 rounded animate-pulse mt-1" />
      ) : (
        <div className={`text-2xl font-bold ${accentColors[accent]}`}>{value}</div>
      )}
    </div>
  );
}
