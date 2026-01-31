# AluminatiAI Workload Tracking API

Production-grade API for passively tracking AI workload energy consumption without infrastructure access.

## Overview

The Workload Tracking API allows AI teams to submit workload metadata and receive instant energy consumption estimates, carbon footprint calculations, and cost projections.

**Key Features:**
- 📊 Instant energy estimates (kWh, CO₂e, cost)
- 🤖 Optional AI-powered analysis with MiniMax M2.1
- 🔌 Non-intrusive passive monitoring
- 📈 Historical tracking and status updates
- 🛠️ AI-generated SDK code snippets

## Quick Start

### 1. Submit a Workload

```bash
curl -X POST https://aluminatiai.com/api/workloads \
  -H "Content-Type: application/json" \
  -d '{
    "model_size_gb": 70.0,
    "num_gpus": 8,
    "gpu_type": "H100",
    "duration_hours": 72.0,
    "utilization_pct": 85.0,
    "use_smart_agent": true,
    "notes": "Fine-tuning LLaMA 70B"
  }'
```

### 2. Get Workload Details

```bash
curl https://aluminatiai.com/api/workloads/YOUR_WORKLOAD_ID
```

## API Endpoints

### POST /api/workloads

Submit AI workload metadata for energy tracking.

**Request Body:**
```typescript
{
  model_size_gb: number;      // Model size in GB
  num_gpus: number;            // Number of GPUs
  gpu_type: string;            // GPU model (H100, A100, H200, L40S, RTX_4090)
  duration_hours: number;      // Runtime in hours
  utilization_pct?: number;    // GPU utilization (0-100, default: 80)
  use_smart_agent?: boolean;   // Use AI agent (default: false)
  notes?: string;              // Optional context
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "message": "Workload submitted successfully",
  "estimates": {
    "kwh": 1234.56,
    "carbon_kg": 493.82,
    "cost_usd": 185.18,
    "calculation_method": "agent" // or "fallback"
  },
  "workload": { ... },
  "agent_insights": {
    "optimizations": [...],
    "confidence": 0.85
  }
}
```

### GET /api/workloads/:id

Retrieve workload details by ID.

**Query Parameters:**
- `history=true` - Include historical snapshots (future feature)

**Response (200):**
```json
{
  "id": "uuid",
  "created_at": "2024-01-31T...",
  "updated_at": "2024-01-31T...",
  "workload": {
    "model_size_gb": 70.0,
    "num_gpus": 8,
    "gpu_type": "H100",
    "duration_hours": 72.0,
    "utilization_pct": 85.0
  },
  "estimates": {
    "kwh": 1234.56,
    "carbon_kg": 493.82,
    "cost_usd": 185.18
  },
  "status": "completed",
  "notes": "...",
  "agent_insights": { ... }
}
```

### PATCH /api/workloads/:id

Update workload status (for monitoring).

**Request Body:**
```json
{
  "status": "running" // submitted | running | completed | failed
}
```

### GET /api/workloads

List all workloads (paginated).

**Query Parameters:**
- `limit=10` - Results per page (default: 10)
- `offset=0` - Pagination offset (default: 0)

### POST /api/generate-sdk

Generate integration code using MiniMax M2.1.

**Request Body:**
```json
{
  "language": "python", // python | javascript | typescript | curl
  "workload_id": "uuid" // optional, for GET examples
}
```

**Response:**
```json
{
  "code": "import requests\n...",
  "language": "python",
  "explanation": "...",
  "generated_by": "minimax-m2.1",
  "usage_instructions": "..."
}
```

## Energy Calculation Methods

### Fallback Calculation

Simple, fast formula based on GPU specs:

```
kWh = (GPU_watts × num_gpus × hours × utilization_pct / 100 × PUE) / 1000
carbon_kg = kWh × 0.4  // US grid average
cost_usd = kWh × 0.15  // $0.15/kWh
```

**GPU Power Database:**
- H100: 700W
- A100: 400W
- H200: 700W
- L40S: 300W
- RTX 4090: 450W
- Other: 500W (default)

**Defaults:**
- PUE (Power Usage Effectiveness): 1.3
- Grid carbon intensity: 0.4 kg CO₂e/kWh
- Electricity cost: $0.15/kWh

### AI Agent Calculation

When `use_smart_agent: true`:
1. Workload description sent to MiniMax M2.1 agent
2. Agent uses tool calling to:
   - Look up GPU specs
   - Calculate energy with context
   - Estimate carbon emissions
   - Generate optimization suggestions
3. Returns detailed estimates with reasoning trace

## Integration Examples

### Python

```python
import requests

def track_workload(model_size_gb, num_gpus, gpu_type, duration_hours):
    response = requests.post(
        "https://aluminatiai.com/api/workloads",
        json={
            "model_size_gb": model_size_gb,
            "num_gpus": num_gpus,
            "gpu_type": gpu_type,
            "duration_hours": duration_hours,
            "use_smart_agent": True
        }
    )
    result = response.json()
    print(f"Energy: {result['estimates']['kwh']} kWh")
    return result['id']

# Example usage
workload_id = track_workload(
    model_size_gb=70.0,
    num_gpus=8,
    gpu_type="H100",
    duration_hours=72.0
)
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

async function trackWorkload(modelSizeGb, numGpus, gpuType, durationHours) {
  const response = await axios.post('https://aluminatiai.com/api/workloads', {
    model_size_gb: modelSizeGb,
    num_gpus: numGpus,
    gpu_type: gpuType,
    duration_hours: durationHours,
    use_smart_agent: true
  });

  console.log(`Energy: ${response.data.estimates.kwh} kWh`);
  return response.data.id;
}

// Example usage
trackWorkload(70.0, 8, 'H100', 72.0);
```

## Database Schema

```sql
CREATE TABLE workloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID,

  -- Workload specs
  model_size_gb FLOAT8 NOT NULL,
  num_gpus INTEGER NOT NULL,
  gpu_type TEXT NOT NULL,
  duration_hours FLOAT8 NOT NULL,
  utilization_pct FLOAT8 DEFAULT 80,

  -- Energy estimates
  estimated_kwh FLOAT8 NOT NULL,
  estimated_carbon_kg FLOAT8 NOT NULL,
  estimated_cost_usd FLOAT8 NOT NULL,

  -- Metadata
  status TEXT DEFAULT 'submitted',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Agent data
  used_smart_agent BOOLEAN DEFAULT FALSE,
  agent_confidence FLOAT8,
  agent_reasoning JSONB
);
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": [...] // For validation errors
}
```

**Status Codes:**
- `200` - Success (GET)
- `201` - Created (POST)
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Server Error

## Rate Limiting

Currently no rate limits for hackathon demo. Production will implement:
- 100 requests/minute per IP
- 1000 requests/day per API key (future)

## Support

- Documentation: https://aluminatiai.com/docs
- GitHub: https://github.com/AgentMulder404/aluminatiai-landing
- Email: support@aluminatiai.com

---

Built with Next.js, Supabase, and MiniMax M2.1 for AgI House Hackathon 2024
