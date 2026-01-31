// SDK Code Generator - Use MiniMax M2.1 to generate integration code

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "";
const MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2";

/**
 * POST /api/generate-sdk
 * Generate SDK integration code using MiniMax M2.1
 */
export async function POST(request: NextRequest) {
  console.log("\n🔧 POST /api/generate-sdk");

  try {
    const body = await request.json();
    const { language = "python", workload_id } = body;

    // Validate language
    const supportedLanguages = ["python", "javascript", "typescript", "curl"];
    if (!supportedLanguages.includes(language.toLowerCase())) {
      return NextResponse.json(
        {
          error: "Unsupported language",
          supported: supportedLanguages,
        },
        { status: 400 }
      );
    }

    console.log(`📝 Generating ${language} SDK code...`);

    // Check if MiniMax is configured
    if (!MINIMAX_API_KEY) {
      console.warn("⚠️  MINIMAX_API_KEY not set, returning template code");
      return NextResponse.json({
        code: getTemplateCode(language, workload_id),
        language,
        explanation: "Template code (MiniMax not configured)",
        generated_by: "template",
      });
    }

    // Build prompt for MiniMax
    const apiBaseUrl = request.nextUrl.origin;
    const prompt = buildSDKPrompt(language, apiBaseUrl, workload_id);

    // Call MiniMax M2.1
    const minimaxResponse = await fetch(MINIMAX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: "abab6.5s-chat",
        messages: [
          {
            role: "system",
            content: getSystemPrompt(language, apiBaseUrl),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for code generation
        max_tokens: 2048,
      }),
    });

    if (!minimaxResponse.ok) {
      const errorText = await minimaxResponse.text();
      console.error("❌ MiniMax error:", errorText);
      throw new Error(`MiniMax API error: ${minimaxResponse.status}`);
    }

    const minimaxData = await minimaxResponse.json();
    const generatedContent = minimaxData.choices?.[0]?.message?.content || "";

    console.log("✅ Code generated successfully");

    // Extract code from markdown blocks if present
    const codeMatch = generatedContent.match(/```(?:\w+)?\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : generatedContent.trim();

    // Extract explanation (text before first code block)
    const explanation = codeMatch
      ? generatedContent.substring(0, codeMatch.index).trim()
      : "AI-generated integration code for AluminatiAI Energy Tracking API";

    return NextResponse.json({
      code,
      language,
      explanation,
      generated_by: "minimax-m2.1",
      usage_instructions: getUsageInstructions(language),
    });
  } catch (error) {
    console.error("❌ Error generating SDK:", error);

    // Fallback to template code on error
    const { language = "python", workload_id } = await request.json().catch(() => ({}));

    return NextResponse.json(
      {
        code: getTemplateCode(language, workload_id),
        language,
        explanation: "Template code (generation failed)",
        generated_by: "template",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 200 } // Return 200 with template instead of error
    );
  }
}

/**
 * System prompt for SDK generation
 */
function getSystemPrompt(language: string, apiBaseUrl: string): string {
  return `You are an expert code generator helping AI engineers integrate with AluminatiAI Energy Tracking API.

Your task: Generate clean, production-ready ${language} code for submitting workload metadata to track energy consumption.

API Details:
- Base URL: ${apiBaseUrl}
- Endpoint: POST /api/workloads
- Request body (JSON):
  {
    "model_size_gb": number,      // Size of AI model in GB
    "num_gpus": number,            // Number of GPUs used
    "gpu_type": string,            // GPU model (e.g., "H100", "A100")
    "duration_hours": number,      // Expected/actual runtime in hours
    "utilization_pct": number,     // Optional, GPU utilization % (default 80)
    "use_smart_agent": boolean,    // Optional, use AI agent for estimates
    "notes": string                // Optional, additional context
  }
- Response (201 Created):
  {
    "id": "uuid",
    "message": "Workload submitted successfully",
    "estimates": { "kwh": number, "carbon_kg": number, "cost_usd": number }
  }

Requirements:
1. Make code copy-paste ready
2. Include error handling and retries (2-3 attempts)
3. Add helpful comments
4. Use modern ${language} best practices
5. Keep it simple and hackathon-friendly
6. Return ONLY the code, no extra explanations

Generate code that:
- Creates a reusable function/class for submission
- Includes example usage
- Handles network errors gracefully
- Prints/logs the response for visibility`;
}

/**
 * Build user prompt
 */
function buildSDKPrompt(language: string, apiBaseUrl: string, workloadId?: string): string {
  let prompt = `Generate a ${language} code snippet for submitting AI workload metadata to the AluminatiAI Energy Tracking API at ${apiBaseUrl}/api/workloads.

The code should be simple, production-ready, and include:
1. A function to submit workload data
2. Error handling with retries
3. Example usage showing how to call it after starting a training job
4. Comments explaining each part`;

  if (workloadId) {
    prompt += `\n\nAlso include an example of fetching results using GET /api/workloads/${workloadId}`;
  }

  return prompt;
}

/**
 * Template code fallback (when MiniMax not available)
 */
function getTemplateCode(language: string, workloadId?: string): string {
  const templates: Record<string, string> = {
    python: `import requests
import time
from typing import Dict, Any, Optional

class AluminatiEnergyTracker:
    """Track AI workload energy consumption with AluminatiAI"""

    def __init__(self, api_base_url: str = "https://aluminatiai.com"):
        self.api_base_url = api_base_url.rstrip('/')

    def submit_workload(
        self,
        model_size_gb: float,
        num_gpus: int,
        gpu_type: str,
        duration_hours: float,
        utilization_pct: float = 80.0,
        use_smart_agent: bool = False,
        notes: Optional[str] = None,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """Submit workload metadata for energy tracking"""

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

        # Retry logic
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    f"{self.api_base_url}/api/workloads",
                    json=payload,
                    timeout=30
                )
                response.raise_for_status()

                result = response.json()
                print(f"✅ Workload submitted: {result['id']}")
                print(f"📊 Estimates: {result['estimates']['kwh']} kWh, "
                      f"{result['estimates']['carbon_kg']} kg CO₂e, "
                      f"${result['estimates']['cost_usd']}")

                return result

            except requests.exceptions.RequestException as e:
                print(f"⚠️  Attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise

        return {}

    def get_workload(self, workload_id: str) -> Dict[str, Any]:
        """Retrieve workload details by ID"""
        response = requests.get(f"{self.api_base_url}/api/workloads/{workload_id}")
        response.raise_for_status()
        return response.json()


# Example Usage
if __name__ == "__main__":
    tracker = AluminatiEnergyTracker()

    # Submit workload after training starts
    result = tracker.submit_workload(
        model_size_gb=70.0,           # 70B parameter model
        num_gpus=8,                    # Using 8 GPUs
        gpu_type="H100",               # GPU model
        duration_hours=72.0,           # 3 days of training
        utilization_pct=85.0,          # 85% GPU utilization
        use_smart_agent=True,          # Use AI agent for better estimates
        notes="Fine-tuning LLaMA 70B on custom dataset"
    )

    # Optionally retrieve later
    # workload = tracker.get_workload(result['id'])
    # print(f"Status: {workload['status']}")`,

    javascript: `// AluminatiAI Energy Tracker SDK
const axios = require('axios');

class AluminatiEnergyTracker {
  constructor(apiBaseUrl = 'https://aluminatiai.com') {
    this.apiBaseUrl = apiBaseUrl.replace(/\\/$/, '');
  }

  async submitWorkload({
    modelSizeGb,
    numGpus,
    gpuType,
    durationHours,
    utilizationPct = 80,
    useSmartAgent = false,
    notes = null,
    maxRetries = 3
  }) {
    const payload = {
      model_size_gb: modelSizeGb,
      num_gpus: numGpus,
      gpu_type: gpuType,
      duration_hours: durationHours,
      utilization_pct: utilizationPct,
      use_smart_agent: useSmartAgent,
    };

    if (notes) {
      payload.notes = notes;
    }

    // Retry logic
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await axios.post(
          \`\${this.apiBaseUrl}/api/workloads\`,
          payload,
          { timeout: 30000 }
        );

        const result = response.data;
        console.log(\`✅ Workload submitted: \${result.id}\`);
        console.log(\`📊 Estimates: \${result.estimates.kwh} kWh, \${result.estimates.carbon_kg} kg CO₂e, $\${result.estimates.cost_usd}\`);

        return result;

      } catch (error) {
        console.warn(\`⚠️  Attempt \${attempt + 1}/\${maxRetries} failed:\`, error.message);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        } else {
          throw error;
        }
      }
    }
  }

  async getWorkload(workloadId) {
    const response = await axios.get(\`\${this.apiBaseUrl}/api/workloads/\${workloadId}\`);
    return response.data;
  }
}

// Example Usage
(async () => {
  const tracker = new AluminatiEnergyTracker();

  const result = await tracker.submitWorkload({
    modelSizeGb: 70.0,
    numGpus: 8,
    gpuType: 'H100',
    durationHours: 72.0,
    utilizationPct: 85.0,
    useSmartAgent: true,
    notes: 'Fine-tuning LLaMA 70B'
  });

  console.log('Workload ID:', result.id);
})();

module.exports = AluminatiEnergyTracker;`,

    curl: `#!/bin/bash
# AluminatiAI Energy Tracking - Simple curl example

API_URL="https://aluminatiai.com/api/workloads"

# Submit workload
curl -X POST "$API_URL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model_size_gb": 70.0,
    "num_gpus": 8,
    "gpu_type": "H100",
    "duration_hours": 72.0,
    "utilization_pct": 85.0,
    "use_smart_agent": true,
    "notes": "Fine-tuning LLaMA 70B on custom dataset"
  }' \\
  | jq .

# Get workload by ID (replace with actual ID)
# curl "$API_URL/YOUR_WORKLOAD_ID" | jq .`,
  };

  return templates[language] || templates.python;
}

/**
 * Usage instructions per language
 */
function getUsageInstructions(language: string): string {
  const instructions: Record<string, string> = {
    python: "1. Install requests: pip install requests\n2. Copy code to your project\n3. Call submit_workload() after starting your training job\n4. Check console for energy estimates",
    javascript: "1. Install axios: npm install axios\n2. Copy code to your project\n3. Import and use AluminatiEnergyTracker class\n4. Check console for energy estimates",
    typescript: "1. Install axios: npm install axios\n2. Install types: npm install -D @types/node\n3. Copy code and compile with tsc\n4. Run with Node.js",
    curl: "1. Save to script.sh\n2. Make executable: chmod +x script.sh\n3. Run: ./script.sh\n4. Requires jq for JSON formatting (optional)",
  };

  return instructions[language] || "Copy and run the code in your environment";
}

/**
 * GET /api/generate-sdk
 * Health check and supported languages
 */
export async function GET() {
  return NextResponse.json({
    service: "AluminatiAI SDK Generator",
    powered_by: "MiniMax M2.1",
    supported_languages: ["python", "javascript", "typescript", "curl"],
    usage: "POST with { language: 'python', workload_id?: 'uuid' }",
  });
}
