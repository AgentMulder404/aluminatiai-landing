import Link from "next/link";

interface EmptyStateProps {
  title: string;
  message: string;
  action?: { href: string; label: string };
}

export default function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="border border-neutral-800 bg-neutral-950 rounded-xl p-8">
      <div className="flex flex-col items-center text-center py-10">
        {/* Icon */}
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900">
          <svg
            className="h-6 w-6 text-neutral-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>

        <p className="text-base font-semibold text-white mb-2">{title}</p>
        <p className="text-sm text-gray-500 max-w-sm">{message}</p>

        {action && (
          <Link
            href={action.href}
            className="mt-6 px-5 py-2.5 rounded-lg border border-neutral-700 text-sm font-semibold text-gray-300 hover:border-purple-600 hover:text-white transition-colors"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
