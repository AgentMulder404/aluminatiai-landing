import Link from "next/link";

export const metadata = {
  title: "Agent Reference — AluminatiAi",
  description: "AluminatiAi GPU energy monitoring agent configuration and reference",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4 scroll-mt-8">
      <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-3">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-purple-300 text-sm">{children}</code>;
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="rounded-lg border border-neutral-800 bg-black p-4 overflow-x-auto">
      <code className="text-sm text-gray-300 whitespace-pre">{code}</code>
    </pre>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800 bg-neutral-950">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/50 bg-black">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-gray-300 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900/50 px-4 py-3 text-sm text-gray-400">
      {children}
    </div>
  );
}

export default function AgentDocsPage() {
  const systemdUnit = `[Unit]
Description=AluminatiAi GPU Energy Agent
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/aluminatai/agent
Environment="ALUMINATAI_API_KEY=alum_YOUR_KEY_HERE"
ExecStart=/usr/bin/python3 main.py --quiet
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target`;

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-neutral-800 bg-neutral-950 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold hover:text-gray-300 transition-colors">
            AluminatiAi
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/docs/api" className="text-gray-400 hover:text-white transition-colors">API reference</Link>
            <Link href="/dashboard/setup" className="text-gray-400 hover:text-white transition-colors">Quick setup</Link>
            <Link
              href="/dashboard"
              className="px-4 py-1.5 rounded-lg bg-neutral-800 text-gray-300 hover:bg-neutral-700 hover:text-white transition-colors"
            >
              Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex gap-12">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block w-48 shrink-0">
            <nav className="sticky top-8 space-y-1 text-sm">
              {[
                ["overview",     "Overview"],
                ["installation", "Installation"],
                ["cli-flags",    "CLI flags"],
                ["env-vars",     "Environment variables"],
                ["persistent",   "Running persistently"],
                ["schedulers",   "Scheduler integration"],
                ["troubleshoot", "Troubleshooting"],
              ].map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="block py-1 text-gray-500 hover:text-white transition-colors"
                >
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-12">
            {/* Header */}
            <div>
              <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Agent Reference</span>
              <h1 className="mt-3 text-4xl font-bold">GPU Energy Agent</h1>
              <p className="mt-3 text-gray-400 text-lg">
                A lightweight Python daemon that streams GPU telemetry from your machines to AluminatiAi.
                Runs with &lt;0.1% CPU overhead and batches uploads every 60 seconds.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 rounded-full border border-neutral-700 text-gray-400 font-mono">Python 3.8+</span>
                <span className="px-3 py-1 rounded-full border border-neutral-700 text-gray-400 font-mono">Linux / macOS</span>
                <span className="px-3 py-1 rounded-full border border-neutral-700 text-gray-400 font-mono">NVIDIA GPU required</span>
              </div>
            </div>

            {/* Overview */}
            <Section id="overview" title="Overview">
              <p className="text-gray-400 text-sm">
                The agent uses NVIDIA's NVML library (via <Code>pynvml</Code>) to sample each GPU every 5 seconds.
                Metrics are buffered locally and flushed to the AluminatiAi ingest API every 60 seconds.
                If an upload fails, metrics are persisted to <Code>./data/</Code> and retried on the next run.
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Power draw", "Instantaneous watts per GPU"],
                  ["Energy delta", "Joules consumed since last sample"],
                  ["GPU utilization", "Compute + memory bandwidth %"],
                  ["Temperature", "Junction temperature in °C"],
                  ["Memory usage", "Used / total VRAM in MB"],
                  ["Clock speeds", "SM and memory clocks in MHz"],
                  ["Job attribution", "job_id, team_id, model_tag via scheduler"],
                  ["Local backup", "CSV fallback when upload fails"],
                ].map(([label, desc]) => (
                  <div key={label} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                    <p className="font-medium text-white text-xs">{label}</p>
                    <p className="mt-0.5 text-gray-500 text-xs">{desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Installation */}
            <Section id="installation" title="Installation">
              <p className="text-gray-400 text-sm">
                Requires <Code>nvidia-smi</Code> to be working before you start. Run it to confirm your drivers are installed.
              </p>
              <CodeBlock code={`# Clone the repo
git clone https://github.com/AgentMulder404/AluminatAI.git
cd AluminatAI/agent

# Install dependencies (4 packages)
pip install -r requirements.txt

# Verify GPU detection
python collector.py`} />
              <p className="text-gray-400 text-sm">Dependencies:</p>
              <Table
                headers={["Package", "Version", "Purpose"]}
                rows={[
                  [<Code>pynvml</Code>, "≥ 11.5.0", "NVML bindings for GPU metrics"],
                  [<Code>requests</Code>, "≥ 2.31.0", "HTTP upload to ingest API"],
                  [<Code>python-dotenv</Code>, "≥ 1.0.0", "Load env vars from .env file"],
                  [<Code>rich</Code>, "≥ 13.0.0", "Live terminal table (optional)"],
                ]}
              />
              <Note>
                <strong className="text-gray-300">NVIDIA driver 450.80.02 or newer required.</strong>{" "}
                Run <Code>nvidia-smi</Code> — if it fails, install drivers first (<Code>sudo apt install nvidia-driver-535</Code> on Ubuntu).
              </Note>
            </Section>

            {/* CLI flags */}
            <Section id="cli-flags" title="CLI flags">
              <p className="text-gray-400 text-sm">
                All flags are optional. The most common usage is just setting <Code>ALUMINATAI_API_KEY</Code> and running <Code>python main.py</Code>.
              </p>
              <Table
                headers={["Flag", "Default", "Description"]}
                rows={[
                  [<Code>--interval, -i</Code>, "5.0", "Sampling interval in seconds. Lower = more accurate energy totals, slightly higher CPU overhead. Min: 0.1s."],
                  [<Code>--output, -o</Code>, "none", "Write metrics to a CSV file in addition to uploading. Useful for local analysis or validation."],
                  [<Code>--duration, -d</Code>, "∞", "Stop after this many seconds. Omit to run indefinitely."],
                  [<Code>--quiet, -q</Code>, "off", "Suppress all console output. Recommended for systemd / background use."],
                ]}
              />
              <CodeBlock code={`# Default — upload every 60s, display live table
python main.py

# 1-second sampling for high-accuracy energy profiling
python main.py --interval 1

# Run for 10 minutes, save CSV, no output
python main.py --duration 600 --output data/run.csv --quiet`} />
            </Section>

            {/* Environment variables */}
            <Section id="env-vars" title="Environment variables">
              <p className="text-gray-400 text-sm">
                Set these in your shell, a <Code>.env</Code> file in the agent directory, or your systemd unit.
                Only <Code>ALUMINATAI_API_KEY</Code> is required.
              </p>
              <Table
                headers={["Variable", "Default", "Description"]}
                rows={[
                  [<Code>ALUMINATAI_API_KEY</Code>, "—", <span><strong className="text-white">Required.</strong> Your API key from <Link href="/dashboard/setup" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">Dashboard → Setup</Link>. Starts with <Code>alum_</Code>.</span>],
                  [<Code>ALUMINATAI_API_ENDPOINT</Code>, "Vercel URL", "Override the ingest endpoint. Useful for self-hosted deployments."],
                  [<Code>UPLOAD_INTERVAL</Code>, "60", "Seconds between batch uploads. Lower values increase API request frequency."],
                  [<Code>UPLOAD_BATCH_SIZE</Code>, "100", "Max metrics per upload request. Reduce if you hit request size limits."],
                  [<Code>SAMPLE_INTERVAL</Code>, "5.0", "Default sampling interval in seconds (overridden by --interval flag)."],
                  [<Code>SCHEDULER_POLL_INTERVAL</Code>, "30", "How often (seconds) to query the scheduler for job attribution data."],
                  [<Code>LOG_LEVEL</Code>, "INFO", <span>Python logging level: <Code>DEBUG</Code>, <Code>INFO</Code>, <Code>WARNING</Code>, <Code>ERROR</Code>.</span>],
                  [<Code>LOG_DIR</Code>, "./logs", "Directory for log files."],
                  [<Code>DATA_DIR</Code>, "./data", "Directory for local metric backups when upload fails."],
                ]}
              />
              <CodeBlock code={`# .env file in agent/ directory
ALUMINATAI_API_KEY=alum_YOUR_KEY_HERE
UPLOAD_INTERVAL=60
SAMPLE_INTERVAL=5.0
LOG_LEVEL=INFO`} />
            </Section>

            {/* Running persistently */}
            <Section id="persistent" title="Running persistently">
              <p className="text-gray-400 text-sm">
                For production monitoring, run the agent as a background service so it survives SSH disconnects and reboots.
              </p>

              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Option A — tmux (quick)</h3>
              <CodeBlock code={`# Start in a detached tmux session
tmux new-session -d -s aluminatai \\
  "ALUMINATAI_API_KEY=alum_YOUR_KEY_HERE python main.py --quiet"

# Check logs
tmux attach -t aluminatai

# Or tail the log file if you set --output
tail -f logs/agent.log`} />

              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Option B — systemd (recommended for servers)</h3>
              <p className="text-gray-400 text-sm">
                Create <Code>/etc/systemd/system/aluminatai-agent.service</Code>:
              </p>
              <CodeBlock code={systemdUnit} />
              <CodeBlock code={`# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable aluminatai-agent
sudo systemctl start aluminatai-agent

# Check status
sudo systemctl status aluminatai-agent
sudo journalctl -u aluminatai-agent -f`} />
              <Note>
                Update <Code>User=</Code> and <Code>WorkingDirectory=</Code> to match your setup.
                The agent will automatically restart on failure and start on reboot.
              </Note>
            </Section>

            {/* Scheduler integration */}
            <Section id="schedulers" title="Scheduler integration">
              <p className="text-gray-400 text-sm">
                The agent can enrich metrics with job attribution by polling your workload scheduler.
                When a job is detected on a GPU, the agent tags every metric from that GPU with
                <Code> job_id</Code>, <Code>team_id</Code>, <Code>model_tag</Code>, and <Code>scheduler_source</Code>.
                These appear as columns in the Energy Manifests page.
              </p>
              <Table
                headers={["Scheduler", "scheduler_source value", "How it works"]}
                rows={[
                  ["Kubernetes", <Code>kubernetes</Code>, "Polls local kubelet API to map GPU device IDs to pod names and labels."],
                  ["Slurm", <Code>slurm</Code>, "Reads SLURM_JOB_ID and squeue output to identify running jobs."],
                  ["Run:ai", <Code>runai</Code>, "Queries Run:ai scheduler API for active workloads."],
                  ["Manual", <Code>manual</Code>, "Set JOB_ID, TEAM_ID, MODEL_TAG env vars before running the agent."],
                ]}
              />
              <CodeBlock code={`# Manual attribution — wrap your training script:
JOB_ID=llama3-finetune-v2 \\
TEAM_ID=ml-infra \\
MODEL_TAG=llama3-70b \\
python main.py`} />
              <Note>
                Scheduler integration is optional. Without it, metrics are attributed to your account but not to specific jobs.
                Energy manifests will still be generated when jobs complete.
              </Note>
            </Section>

            {/* Troubleshooting */}
            <Section id="troubleshoot" title="Troubleshooting">
              <div className="space-y-6">
                <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5 space-y-3">
                  <p className="font-semibold text-white">"No NVIDIA GPUs found" or <Code>nvidia-smi</Code> fails</p>
                  <p className="text-sm text-gray-400">NVIDIA driver not installed or not working.</p>
                  <CodeBlock code={`# Ubuntu — install driver
sudo apt install nvidia-driver-535
sudo reboot

# Verify after reboot
nvidia-smi`} />
                </div>

                <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5 space-y-3">
                  <p className="font-semibold text-white">"Failed to initialize NVML"</p>
                  <p className="text-sm text-gray-400">Permission issue or driver version mismatch.</p>
                  <CodeBlock code={`# Check your groups
groups

# Add yourself to the video group
sudo usermod -a -G video $USER
# Log out and back in, then retry`} />
                </div>

                <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5 space-y-3">
                  <p className="font-semibold text-white">"Module 'pynvml' not found"</p>
                  <p className="text-sm text-gray-400">Dependencies not installed in the active Python environment.</p>
                  <CodeBlock code={`pip install -r requirements.txt

# If using a venv, activate it first:
source venv/bin/activate && pip install -r requirements.txt`} />
                </div>

                <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5 space-y-3">
                  <p className="font-semibold text-white">Metrics not appearing in dashboard</p>
                  <p className="text-sm text-gray-400">
                    The agent batches uploads every 60 seconds. Wait one minute then refresh.
                    Check the terminal output for upload errors — look for lines starting with <Code>❌</Code>.
                  </p>
                  <CodeBlock code={`# Run with verbose logging to see upload status
LOG_LEVEL=DEBUG python main.py

# Check saved backup if uploads are failing
ls data/`} />
                </div>
              </div>
            </Section>

            {/* Footer */}
            <div className="border-t border-neutral-800 pt-8 flex items-center justify-between text-sm text-gray-500">
              <span>AluminatiAi Agent · v0.1.0</span>
              <div className="flex items-center gap-6">
                <Link href="/docs/api" className="hover:text-white transition-colors">API reference</Link>
                <Link href="/dashboard/setup" className="hover:text-white transition-colors">Quick setup</Link>
                <Link href="/contact" className="hover:text-white transition-colors">Get help</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
