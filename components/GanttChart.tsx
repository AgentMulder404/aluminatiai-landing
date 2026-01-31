"use client";

interface Job {
  id: string;
  duration: number;
  gpu_count: number;
  priority: string;
  estimated_power_per_gpu: number;
}

interface ScheduleAction {
  job_id: string;
  gpu_ids: string[];
  start_time: number;
}

interface GanttChartProps {
  schedule: ScheduleAction[];
  jobs: Job[];
  gpus: { id: string; model: string }[];
  title: string;
  totalTime: number;
  maxTime?: number;
}

const JOB_COLORS: Record<string, string> = {
  training_1: "bg-blue-500",
  training_2: "bg-purple-500",
  training_3: "bg-pink-500",
  inference_1: "bg-green-500",
  inference_2: "bg-yellow-500",
  test: "bg-cyan-500",
};

const getJobColor = (jobId: string): string => {
  // Check for exact match first
  if (JOB_COLORS[jobId]) return JOB_COLORS[jobId];

  // Check for partial matches
  if (jobId.includes('training')) return JOB_COLORS.training_1 || "bg-blue-500";
  if (jobId.includes('inference')) return JOB_COLORS.inference_1 || "bg-green-500";

  // Default colors based on hash
  const colors = ["bg-red-500", "bg-orange-500", "bg-teal-500", "bg-indigo-500"];
  const hash = jobId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export default function GanttChart({ schedule, jobs, gpus, title, totalTime, maxTime }: GanttChartProps) {
  // Use maxTime if provided, otherwise use totalTime with some padding
  const timelineMax = maxTime || Math.max(totalTime, 300);
  const pixelsPerMinute = 800 / timelineMax; // 800px width for timeline

  // Build GPU timeline data
  const gpuTimelines = gpus.map(gpu => {
    const tasks = schedule
      .filter(action => action.gpu_ids.includes(gpu.id))
      .map(action => {
        const job = jobs.find(j => j.id === action.job_id);
        return {
          jobId: action.job_id,
          startTime: action.start_time,
          duration: job?.duration || 0,
          color: getJobColor(action.job_id),
        };
      });
    return { gpu, tasks };
  });

  // Calculate utilization
  const totalGpuMinutes = gpus.length * timelineMax;
  const usedGpuMinutes = schedule.reduce((acc, action) => {
    const job = jobs.find(j => j.id === action.job_id);
    return acc + (job?.duration || 0) * action.gpu_ids.length;
  }, 0);
  const utilization = ((usedGpuMinutes / totalGpuMinutes) * 100).toFixed(1);

  return (
    <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        <div className="text-sm text-gray-400">
          Total Time: <span className="font-semibold text-white">{totalTime} min</span>
          {" • "}
          Utilization: <span className="font-semibold text-white">{utilization}%</span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Time axis */}
        <div className="flex items-center">
          <div className="w-32 text-sm font-medium text-gray-400">Time (min)</div>
          <div className="flex-1 relative h-6">
            {[0, Math.floor(timelineMax / 4), Math.floor(timelineMax / 2), Math.floor(3 * timelineMax / 4), timelineMax].map((time, i) => (
              <div
                key={i}
                className="absolute text-xs text-gray-500"
                style={{ left: `${(time / timelineMax) * 100}%` }}
              >
                {time}
              </div>
            ))}
          </div>
        </div>

        {/* GPU rows */}
        {gpuTimelines.map(({ gpu, tasks }) => (
          <div key={gpu.id} className="flex items-center">
            {/* GPU label */}
            <div className="w-32 pr-4">
              <div className="text-sm font-medium truncate">{gpu.id}</div>
              <div className="text-xs text-gray-500">{gpu.model}</div>
            </div>

            {/* Timeline */}
            <div className="flex-1 relative h-16 bg-black rounded border border-neutral-700">
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((fraction, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-neutral-800"
                  style={{ left: `${fraction * 100}%` }}
                />
              ))}

              {/* Tasks */}
              {tasks.map((task, idx) => {
                const left = (task.startTime / timelineMax) * 100;
                const width = (task.duration / timelineMax) * 100;

                return (
                  <div
                    key={idx}
                    className={`absolute top-2 bottom-2 ${task.color} rounded px-3 flex items-center justify-center text-sm font-semibold text-white truncate shadow-lg hover:z-10 hover:scale-105 transition-transform cursor-pointer group`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                    title={`${task.jobId}: ${task.startTime}-${task.startTime + task.duration} min (${task.duration} min)`}
                  >
                    <span className="truncate">{task.jobId}</span>
                    <div className="absolute hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap shadow-xl border border-neutral-700 z-20">
                      {task.jobId}<br />
                      {task.startTime}→{task.startTime + task.duration} min ({task.duration}m)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-neutral-800">
        <div className="text-xs text-gray-400 mb-2">Jobs:</div>
        <div className="flex flex-wrap gap-3">
          {Array.from(new Set(schedule.map(s => s.job_id))).map(jobId => (
            <div key={jobId} className="flex items-center gap-2">
              <div className={`w-4 h-4 ${getJobColor(jobId)} rounded`} />
              <span className="text-xs text-gray-300">{jobId}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
