"use client";

import { useState, useEffect } from "react";

interface DecisionNode {
  depth: number;
  action: {
    job_id: string;
    gpu_ids: string[];
    start_time: number;
  };
  score: number;
  nodes_explored_for_decision: number;
}

interface DecisionTreeProps {
  decisionTree: DecisionNode[];
  searchStats: {
    total_nodes_explored: number;
    nodes_pruned: number;
    max_depth_reached: number;
  };
}

export default function DecisionTreeVisualization({ decisionTree, searchStats }: DecisionTreeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000); // ms per step

  // Auto-advance animation
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= decisionTree.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, animationSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, animationSpeed, decisionTree.length]);

  const handlePlayPause = () => {
    if (currentStep >= decisionTree.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const currentDecision = decisionTree[currentStep];
  const visibleDecisions = decisionTree.slice(0, currentStep + 1);

  return (
    <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-semibold">Minimax Decision Tree</h3>
        <div className="text-sm text-gray-400">
          Decision {currentStep + 1} of {decisionTree.length}
        </div>
      </div>

      {/* Current Decision Highlight */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-6 mb-6 border border-purple-700/50">
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Current Decision</div>
            <div className="text-2xl font-bold text-white">{currentDecision.action.job_id}</div>
            <div className="text-xs text-gray-300 mt-1">
              GPUs: {currentDecision.action.gpu_ids.join(", ")}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-400 mb-1">Minimax Score</div>
            <div className="text-2xl font-bold text-green-400">
              {currentDecision.score.toFixed(2)}
            </div>
            <div className="text-xs text-gray-300 mt-1">
              Start: {currentDecision.action.start_time} min
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-400 mb-1">Nodes Explored</div>
            <div className="text-2xl font-bold text-blue-400">
              {currentDecision.nodes_explored_for_decision}
            </div>
            <div className="text-xs text-gray-300 mt-1">
              Pruned: {searchStats.nodes_pruned}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Timeline */}
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-300 mb-3">Decision Sequence</div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {decisionTree.map((decision, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all ${
                idx === currentStep
                  ? "bg-purple-600 border-purple-400 text-white shadow-lg scale-105"
                  : idx < currentStep
                  ? "bg-neutral-800 border-neutral-600 text-gray-300"
                  : "bg-neutral-950 border-neutral-700 text-gray-500"
              }`}
            >
              <div className="text-xs font-semibold">{decision.action.job_id}</div>
              <div className="text-xs opacity-75 mt-1">
                {decision.score.toFixed(1)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Decision Tree Visualization */}
      <div className="bg-black rounded-lg p-6 mb-6 border border-neutral-700">
        <div className="space-y-3">
          {visibleDecisions.map((decision, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-4 transition-all duration-500 ${
                idx === currentStep ? "scale-105" : "opacity-60"
              }`}
            >
              {/* Depth Indicator */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${
                    idx === currentStep
                      ? "bg-purple-600 border-purple-400 text-white"
                      : "bg-neutral-800 border-neutral-600 text-gray-400"
                  }`}
                >
                  {idx + 1}
                </div>

                {/* Connecting Line */}
                {idx < visibleDecisions.length - 1 && (
                  <div className="h-12 w-0.5 bg-neutral-700 ml-5" />
                )}
              </div>

              {/* Decision Info */}
              <div className="flex-1 bg-neutral-800 rounded-lg p-4 border border-neutral-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg text-white">
                      {decision.action.job_id}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      GPUs: {decision.action.gpu_ids.join(", ")} • Start: {decision.action.start_time}m
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Score</div>
                    <div className="text-xl font-bold text-green-400">
                      {decision.score.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-neutral-800 rounded-lg p-4 border border-neutral-700">
        <div className="flex gap-3">
          <button
            onClick={handlePlayPause}
            className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-neutral-700 text-white font-semibold rounded-lg hover:bg-neutral-600 transition-colors"
          >
            ↺ Reset
          </button>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Speed:</label>
          <select
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(Number(e.target.value))}
            className="px-3 py-1 bg-neutral-700 text-white rounded border border-neutral-600"
          >
            <option value={2000}>0.5x</option>
            <option value={1000}>1x</option>
            <option value={500}>2x</option>
            <option value={250}>4x</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <button
            onClick={() => setCurrentStep(Math.min(decisionTree.length - 1, currentStep + 1))}
            disabled={currentStep === decisionTree.length - 1}
            className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div className="text-sm text-gray-400 mb-1">Total Nodes</div>
          <div className="text-2xl font-bold text-white">{searchStats.total_nodes_explored}</div>
        </div>
        <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div className="text-sm text-gray-400 mb-1">Nodes Pruned</div>
          <div className="text-2xl font-bold text-orange-400">{searchStats.nodes_pruned}</div>
        </div>
        <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div className="text-sm text-gray-400 mb-1">Max Depth</div>
          <div className="text-2xl font-bold text-purple-400">{searchStats.max_depth_reached}</div>
        </div>
      </div>
    </div>
  );
}
