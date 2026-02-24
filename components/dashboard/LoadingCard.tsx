interface LoadingCardProps {
  title?: string;
}

export default function LoadingCard({ title }: LoadingCardProps) {
  return (
    <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8">
      {title && <h2 className="text-xl font-semibold mb-6">{title}</h2>}
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-neutral-700 border-t-purple-600"></div>
      </div>
    </div>
  );
}
