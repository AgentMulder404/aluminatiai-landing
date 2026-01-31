#!/usr/bin/env python3
"""
AluminatiAI Energy Tracking - Example Python Client

This script demonstrates how to integrate AluminatiAI energy tracking
into your AI training/inference pipeline.

Usage:
    python python_client.py
"""

import requests
import time
from typing import Dict, Any, Optional


class AluminatiEnergyTracker:
    """Simple SDK for AluminatiAI Energy Tracking API"""

    def __init__(self, api_base_url: str = "https://aluminatiai.com"):
        self.api_base_url = api_base_url.rstrip("/")
        self.session = requests.Session()

    def submit_workload(
        self,
        model_size_gb: float,
        num_gpus: int,
        gpu_type: str,
        duration_hours: float,
        utilization_pct: float = 80.0,
        use_smart_agent: bool = False,
        notes: Optional[str] = None,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """
        Submit AI workload metadata for energy tracking.

        Args:
            model_size_gb: Size of AI model in gigabytes
            num_gpus: Number of GPUs used
            gpu_type: GPU model (e.g., "H100", "A100", "H200")
            duration_hours: Expected or actual runtime in hours
            utilization_pct: GPU utilization percentage (0-100, default 80)
            use_smart_agent: Use AI agent for smarter estimates (default False)
            notes: Optional additional context
            max_retries: Maximum retry attempts on failure

        Returns:
            Dict with workload ID and energy estimates

        Raises:
            requests.exceptions.RequestException: On persistent API failure
        """
        payload = {
            "model_size_gb": model_size_gb,
            "num_gpus": num_gpus,
            "gpu_type": gpu_type,
            "duration_hours": duration_hours,
            "utilization_pct": utilization_pct,
            "use_smart_agent": use_smart_agent,
        }

        if notes:
            payload["notes"] = notes

        # Retry with exponential backoff
        for attempt in range(max_retries):
            try:
                response = self.session.post(
                    f"{self.api_base_url}/api/workloads",
                    json=payload,
                    timeout=30,
                )
                response.raise_for_status()

                result = response.json()

                # Print results
                print(f"\n✅ Workload submitted successfully!")
                print(f"   ID: {result['id']}")
                print(f"\n📊 Energy Estimates:")
                print(f"   • Energy: {result['estimates']['kwh']:.2f} kWh")
                print(
                    f"   • Carbon: {result['estimates']['carbon_kg']:.2f} kg CO₂e"
                )
                print(f"   • Cost: ${result['estimates']['cost_usd']:.2f}")
                print(
                    f"   • Method: {result['estimates'].get('calculation_method', 'N/A')}"
                )

                if result.get("agent_insights"):
                    print(f"\n💡 AI Optimizations:")
                    for i, opt in enumerate(
                        result["agent_insights"]["optimizations"][:3], 1
                    ):
                        print(f"   {i}. {opt}")

                return result

            except requests.exceptions.RequestException as e:
                print(f"⚠️  Attempt {attempt + 1}/{max_retries} failed: {e}")

                if attempt < max_retries - 1:
                    wait_time = 2**attempt
                    print(f"   Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    print("❌ All retry attempts failed")
                    raise

        return {}

    def get_workload(self, workload_id: str) -> Dict[str, Any]:
        """
        Retrieve workload details by ID.

        Args:
            workload_id: UUID of the workload

        Returns:
            Dict with workload details and estimates
        """
        response = self.session.get(
            f"{self.api_base_url}/api/workloads/{workload_id}"
        )
        response.raise_for_status()
        return response.json()

    def update_status(self, workload_id: str, status: str) -> Dict[str, Any]:
        """
        Update workload status (for monitoring).

        Args:
            workload_id: UUID of the workload
            status: New status ("submitted", "running", "completed", "failed")

        Returns:
            Dict with updated workload info
        """
        response = self.session.patch(
            f"{self.api_base_url}/api/workloads/{workload_id}",
            json={"status": status},
        )
        response.raise_for_status()
        return response.json()


# ============================================================================
# Example Usage
# ============================================================================

if __name__ == "__main__":
    print("🚀 AluminatiAI Energy Tracking - Example Client\n")

    # Initialize tracker
    tracker = AluminatiEnergyTracker(api_base_url="https://aluminatiai.com")

    # Example 1: Large LLM training
    print("=" * 60)
    print("Example 1: Large LLM Training (70B parameters)")
    print("=" * 60)

    result1 = tracker.submit_workload(
        model_size_gb=70.0,  # 70B parameter model
        num_gpus=8,  # Using 8 GPUs
        gpu_type="H100",  # NVIDIA H100
        duration_hours=72.0,  # 3 days of training
        utilization_pct=85.0,  # 85% GPU utilization
        use_smart_agent=True,  # Use AI agent for better estimates
        notes="Fine-tuning LLaMA 70B on proprietary dataset",
    )

    # Example 2: Inference serving
    print("\n" + "=" * 60)
    print("Example 2: Inference Serving")
    print("=" * 60)

    result2 = tracker.submit_workload(
        model_size_gb=13.0,  # 13B parameter model
        num_gpus=2,  # Using 2 GPUs
        gpu_type="A100",  # NVIDIA A100
        duration_hours=24.0,  # 1 day of serving
        utilization_pct=60.0,  # 60% utilization (bursty traffic)
        use_smart_agent=False,  # Use fast fallback calculation
        notes="Production inference server for chat API",
    )

    # Example 3: Retrieve workload details
    print("\n" + "=" * 60)
    print("Example 3: Retrieve Workload Details")
    print("=" * 60)

    workload_details = tracker.get_workload(result1["id"])
    print(f"Workload ID: {workload_details['id']}")
    print(f"Status: {workload_details['status']}")
    print(f"Created: {workload_details['created_at']}")

    # Example 4: Update status (simulating monitoring)
    print("\n" + "=" * 60)
    print("Example 4: Update Status (Monitoring)")
    print("=" * 60)

    tracker.update_status(result1["id"], "running")
    print(f"✅ Status updated to 'running'")

    time.sleep(1)

    tracker.update_status(result1["id"], "completed")
    print(f"✅ Status updated to 'completed'")

    print("\n" + "=" * 60)
    print("✨ All examples completed successfully!")
    print("=" * 60)
