interface EmptyStateProps {
  title: string;
  message: string;
}

export default function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
      <div className="text-center py-12">
        <p className="text-gray-400 mb-2">{title}</p>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}
