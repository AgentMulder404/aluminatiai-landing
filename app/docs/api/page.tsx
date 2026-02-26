import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-3">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  name,
  type,
  required,
  description,
  constraints,
}: {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  constraints?: string;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 py-3 border-b border-neutral-800/50 last:border-0">
      <div className="space-y-1">
        <code className="text-sm text-purple-300 font-mono">{name}</code>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">{type}</span>
          {required ? (
            <span className="text-xs text-red-400">required</span>
          ) : (
            <span className="text-xs text-gray-600">optional</span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-300">{description}</p>
        {constraints && (
          <p className="text-xs text-gray-500">{constraints}</p>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <pre className="rounded-lg border border-neutral-800 bg-black p-4 overflow-x-auto">
      <code className={`text-sm text-gray-300 language-${language} whitespace-pre`}>{code}</code>
    </pre>
  );
}

function Badge({ label, color }: { label: string; color: "green" | "red" | "yellow" | "blue" | "gray" }) {
  const colors = {
    green:  "bg-green-900/40 text-green-300 border-green-800",
    red:    "bg-red-900/40 text-red-300 border-red-800",
    yellow: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
    blue:   "bg-blue-900/40 text-blue-300 border-blue-800",
    gray:   "bg-neutral-800 text-gray-400 border-neutral-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-mono ${colors[color]}`}>
      {label}
    </span>
  );
}

export const metadata = {
  title: "API Reference — AluminatiAi",
  description: "AluminatiAi GPU metrics ingestion API reference",
};

export default function ApiDocsPage() {
  const examplePayload = `[
  {
    "timestamp": "2026-02-25T12:00:00Z",
    "gpu_index": 0,
    "gpu_uuid": "GPU-abc123",
    "gpu_name": "NVIDIA A100 80GB",
    "power_draw_w": 312.5,
    "power_limit_w": 400,
    "energy_delta_j": 18750,
    "utilization_gpu_pct": 87,
    "utilization_memory_pct": 62,
    "temperature_c": 71,
    "memory_used_mb": 51200,
    "memory_total_mb": 81920,
    "job_id": "job_train_llama3",
    "team_id": "ml-infra",
    "model_tag": "llama3-70b-finetune",
    "scheduler_source": "kubernetes"
  }
]`;

  const curlExample = `curl -X POST https://aluminatiai-landing.vercel.app/api/metrics/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: alum_YOUR_KEY_HERE" \\
  -d '[{
    "timestamp": "2026-02-25T12:00:00Z",
    "gpu_index": 0,
    "gpu_uuid": "GPU-abc123",
    "power_draw_w": 312.5,
    "utilization_gpu_pct": 87,
    "utilization_memory_pct": 62,
    "temperature_c": 71,
    "memory_used_mb": 51200
  }]'`;

  const successResponse = `{
  "success": true,
  "inserted": 1,
  "message": "Successfully ingested 1 metric"
}`;

  const errorResponse = `{
  "error": "Metric at index 0 missing required fields: gpu_uuid, power_draw_w"
}`;

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-neutral-800 bg-neutral-950 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold hover:text-gray-300 transition-colors">
            AluminatiAi
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/dashboard/setup" className="text-gray-400 hover:text-white transition-colors">
              Setup guide
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-1.5 rounded-lg bg-neutral-800 text-gray-300 hover:bg-neutral-700 hover:text-white transition-colors"
            >
              Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">API Reference</span>
          </div>
          <h1 className="text-4xl font-bold">GPU Metrics Ingestion API</h1>
          <p className="mt-3 text-gray-400 text-lg max-w-2xl">
            Stream GPU telemetry from your agent to AluminatiAi for real-time energy monitoring,
            cost attribution, and efficiency analysis.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Badge label="Base URL: https://aluminatiai-landing.vercel.app" color="gray" />
          </div>
        </div>

        {/* Authentication */}
        <Section title="Authentication">
          <p className="text-gray-400 text-sm">
            All requests must include your API key in the <code className="text-purple-300">X-API-Key</code> header.
            Keys are prefixed with <code className="text-purple-300">alum_</code>.
          </p>
          <CodeBlock code={`X-API-Key: alum_YOUR_KEY_HERE`} language="http" />
          <p className="text-sm text-gray-500">
            Find your key in{" "}
            <Link href="/dashboard/setup" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
              Dashboard → Setup
            </Link>
            . You can rotate it at any time (old key is immediately invalidated).
          </p>
        </Section>

        {/* POST endpoint */}
        <Section title="POST /api/metrics/ingest">
          <p className="text-gray-400 text-sm">
            Ingest one or more GPU metric samples. Send an array of metric objects.
            The agent should call this endpoint approximately every 60 seconds per GPU.
          </p>

          <div className="flex items-center gap-3 text-sm">
            <Badge label="Rate limit: 100 req / min" color="yellow" />
            <Badge label="Max 1 000 metrics per request" color="gray" />
          </div>

          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mt-2">Required fields</h3>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 divide-y divide-neutral-800/50">
            <Field name="timestamp"              type="string (ISO 8601)" required description="UTC timestamp of the reading." constraints="Must not be more than 5 minutes in the future." />
            <Field name="gpu_index"              type="integer"           required description="Zero-based index of the GPU on the host." constraints="Must be ≥ 0." />
            <Field name="gpu_uuid"               type="string"            required description="Unique device identifier from nvidia-smi (e.g. GPU-abc123)." />
            <Field name="power_draw_w"           type="float"             required description="Instantaneous power draw in watts." constraints="Range: 0 – 1 500 W." />
            <Field name="utilization_gpu_pct"    type="integer"           required description="GPU compute utilization (0 – 100)." />
            <Field name="utilization_memory_pct" type="integer"           required description="GPU memory bandwidth utilization (0 – 100)." />
            <Field name="temperature_c"          type="float"             required description="GPU temperature in degrees Celsius." constraints="Range: 0 – 120 °C." />
            <Field name="memory_used_mb"         type="integer"           required description="GPU memory currently in use, in megabytes." constraints="Must be ≥ 0." />
          </div>

          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mt-2">Optional fields</h3>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 divide-y divide-neutral-800/50">
            <Field name="gpu_name"          type="string"  description="Human-readable GPU model (e.g. NVIDIA A100 80GB)." />
            <Field name="power_limit_w"     type="float"   description="Configured TDP cap in watts." />
            <Field name="energy_delta_j"    type="float"   description="Energy consumed since last sample, in joules. Must be ≥ 0." />
            <Field name="fan_speed_pct"     type="integer" description="Fan speed 0 – 100." />
            <Field name="memory_total_mb"   type="integer" description="Total installed GPU memory in megabytes." />
            <Field name="sm_clock_mhz"      type="integer" description="Current SM (CUDA core) clock in MHz." />
            <Field name="memory_clock_mhz"  type="integer" description="Current memory clock in MHz." />
            <Field name="job_id"            type="string"  description="Identifier for the workload currently running on this GPU." />
            <Field name="team_id"           type="string"  description="Team or cost-center tag for attribution. Max 128 chars." />
            <Field name="model_tag"         type="string"  description="Model name or experiment label. Max 128 chars." />
            <Field name="scheduler_source"  type="string"  description="Scheduler that placed this workload." constraints={'One of: "kubernetes", "slurm", "runai", "manual"'} />
          </div>

          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mt-2">Example request</h3>
          <CodeBlock code={curlExample} />

          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mt-2">Example payload</h3>
          <CodeBlock code={examplePayload} language="json" />

          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mt-2">Responses</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge label="200 OK" color="green" />
                <span className="text-xs text-gray-500">Metrics accepted</span>
              </div>
              <CodeBlock code={successResponse} language="json" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge label="400 Bad Request" color="red" />
                <span className="text-xs text-gray-500">Validation failure</span>
              </div>
              <CodeBlock code={errorResponse} language="json" />
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-sm">
              <table className="w-full">
                <tbody className="divide-y divide-neutral-800">
                  {[
                    ["401", "red",    "Missing or invalid API key."],
                    ["429", "yellow", "Rate limit exceeded. Check X-RateLimit-Reset header."],
                    ["500", "gray",   "Internal server error. Retry with exponential back-off."],
                  ].map(([code, color, desc]) => (
                    <tr key={code} className="py-2">
                      <td className="py-2 pr-4 w-20"><Badge label={code} color={color as "red" | "yellow" | "gray"} /></td>
                      <td className="py-2 text-gray-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* GET health check */}
        <Section title="GET /api/metrics/ingest">
          <p className="text-gray-400 text-sm">
            Health check. No authentication required. Returns endpoint metadata.
          </p>
          <CodeBlock code={`curl https://aluminatiai-landing.vercel.app/api/metrics/ingest`} />
          <CodeBlock
            code={`{
  "status": "ok",
  "endpoint": "GPU Metrics Ingestion API",
  "methods": ["POST"],
  "documentation": "https://aluminatiai-landing.vercel.app/docs/api"
}`}
            language="json"
          />
        </Section>

        {/* Rate limits */}
        <Section title="Rate limits">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-sm">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-neutral-800">
                  <th className="pb-2 pr-4">Endpoint</th>
                  <th className="pb-2 pr-4">Limit</th>
                  <th className="pb-2">Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50 text-gray-400">
                <tr><td className="py-2 pr-4 font-mono text-purple-300">POST /api/metrics/ingest</td><td className="py-2 pr-4">100 requests</td><td className="py-2">per minute</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-purple-300">GET /api/user/profile</td><td className="py-2 pr-4">60 requests</td><td className="py-2">per minute</td></tr>
                <tr><td className="py-2 pr-4 font-mono text-purple-300">POST /api/user/profile (key rotation)</td><td className="py-2 pr-4">5 requests</td><td className="py-2">per hour</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500">
            Rate limit headers (<code className="text-purple-300">X-RateLimit-Remaining</code>,{" "}
            <code className="text-purple-300">X-RateLimit-Reset</code>) are included on every ingest response.
          </p>
        </Section>

        {/* Footer */}
        <div className="border-t border-neutral-800 pt-8 flex items-center justify-between text-sm text-gray-500">
          <span>AluminatiAi API · v1</span>
          <div className="flex items-center gap-6">
            <Link href="/dashboard/setup" className="hover:text-white transition-colors">Setup guide</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact us</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
