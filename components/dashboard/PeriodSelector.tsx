interface PeriodSelectorProps {
  value: string;
  onChange: (period: string) => void;
}

const periods = ['7d', '30d', '90d'];

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-1 bg-neutral-900 rounded-lg p-1">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value === p
              ? 'bg-neutral-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
