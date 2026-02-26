"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { signOut } from '@/lib/auth-helpers';
import TrialBanner from '@/components/TrialBanner';
import TrialGate from '@/components/TrialGate';
import { TrialProvider } from '@/contexts/TrialContext';

const navLinks = [
  { href: '/dashboard', label: 'Overview', exact: true },
  { href: '/dashboard/manifests', label: 'Manifests', exact: false },
  { href: '/dashboard/hardware', label: 'Hardware', exact: false },
  { href: '/dashboard/fleet', label: 'Fleet', exact: false },
  { href: '/dashboard/advisor', label: 'Advisor', exact: false },
  { href: '/dashboard/setup', label: 'Setup', exact: false },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  function isActive(link: typeof navLinks[number]) {
    if (link.exact) return pathname === link.href;
    return pathname.startsWith(link.href);
  }

  return (
    <TrialProvider>
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-neutral-800 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold hover:text-gray-300 transition-colors">
              AluminatiAi
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors ${
                  isActive(link)
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Trial status banner */}
      <TrialBanner />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <TrialGate>{children}</TrialGate>
      </main>
    </div>
    </TrialProvider>
  );
}
