"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SetupPage() {
  const [apiKey, setApiKey] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Fetch user's API key
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        setApiKey(data.profile.api_key);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch API key:', err);
        setLoading(false);
      });
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const installCommand = `curl -fsSL https://aluminatai.com/install.sh | sudo bash`;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to AluminatAI!</h1>
        <p className="text-xl text-gray-400">
          Let's get your GPU monitoring agent installed in 3 simple steps.
        </p>
      </div>

      {/* Step 1 */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl font-bold text-purple-500">1</div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">Copy Your API Key</h2>
            <p className="text-gray-400 mb-4">
              This unique key authenticates your agent with our platform.
            </p>

            {loading ? (
              <div className="flex items-center gap-2 p-4 bg-black border border-neutral-700 rounded-lg">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-neutral-700 border-t-purple-600"></div>
                <span className="text-gray-400">Loading API key...</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKey}
                  readOnly
                  className="flex-1 px-4 py-3 bg-black border border-neutral-700 rounded-lg text-white font-mono text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl font-bold text-purple-500">2</div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">SSH Into Your GPU Server</h2>
            <p className="text-gray-400 mb-4">
              Connect to the machine running your GPUs:
            </p>

            <div className="bg-black border border-neutral-700 rounded-lg p-4">
              <code className="text-gray-300 font-mono text-sm">
                ssh user@your-gpu-server.com
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-8 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl font-bold text-purple-500">3</div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-3">Run the Install Script</h2>
            <p className="text-gray-400 mb-4">
              This will install the agent and set it up as a system service:
            </p>

            <div className="bg-black border border-neutral-700 rounded-lg p-4 mb-3">
              <code className="text-gray-300 font-mono text-sm break-all">
                {installCommand}
              </code>
            </div>

            <p className="text-sm text-gray-500">
              You'll be prompted to enter your API key during installation.
            </p>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="text-center mt-12">
        <p className="text-gray-400 mb-6">
          Once installed, metrics will start flowing to your dashboard within 60 seconds.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
        >
          Go to Dashboard
        </Link>
      </div>

      {/* Troubleshooting */}
      <div className="mt-12 border-t border-neutral-800 pt-8">
        <h3 className="text-lg font-semibold mb-4">Troubleshooting</h3>
        <div className="space-y-3 text-sm text-gray-400">
          <p>
            <strong className="text-white">Installation fails?</strong>
            <br />
            Make sure you have NVIDIA drivers installed:{' '}
            <code className="text-purple-400">nvidia-smi</code>
          </p>
          <p>
            <strong className="text-white">Not seeing metrics?</strong>
            <br />
            Check agent logs:{' '}
            <code className="text-purple-400">
              sudo journalctl -u aluminatai-agent -f
            </code>
          </p>
          <p>
            <strong className="text-white">Need help?</strong>
            <br />
            Email us at support@aluminatai.com or check our documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
