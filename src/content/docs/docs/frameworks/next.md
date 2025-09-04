---
title: Next.js
description: Use ComputeSDK in Next.js applications
sidebar:
    order: 1
---

# ComputeSDK + Next.js

Use ComputeSDK to execute code in secure sandboxes from your Next.js API routes.

## Setup

### 1. Install Dependencies

```bash
npm install computesdk

# Provider packages (install what you need)
npm install @computesdk/e2b        # E2B provider
npm install @computesdk/vercel     # Vercel provider  
npm install @computesdk/daytona    # Daytona provider
```

### 2. Configure Environment Variables

Create a `.env.local` file and add your provider credentials:

```bash
# E2B (get from e2b.dev)
E2B_API_KEY=e2b_your_api_key_here

# Vercel (recommended for Next.js apps deployed on Vercel)
# Method 1: OIDC Token (recommended)
vercel env pull  # Downloads VERCEL_OIDC_TOKEN

# Method 2: Traditional
VERCEL_TOKEN=your_vercel_token_here
VERCEL_TEAM_ID=your_team_id_here
VERCEL_PROJECT_ID=your_project_id_here

# Daytona (get from your Daytona instance)
DAYTONA_API_KEY=your_daytona_api_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000)

## Implementation

### API Route with Request Handler

The simplest way to use ComputeSDK in Next.js is with the built-in request handler:

```typescript
// app/api/compute/route.ts (App Router)
import { handleComputeRequest } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export async function POST(request: Request) {
  return handleComputeRequest({
    request,
    provider: e2b({ apiKey: process.env.E2B_API_KEY })
  });
}
```

```typescript
// pages/api/compute.ts (Pages Router)
import { handleComputeRequest } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export default async function handler(req: any, res: any) {
  const request = new Request(`http://localhost:3000${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(req.body),
  });
  
  const response = await handleComputeRequest({
    request,
    provider: e2b({ apiKey: process.env.E2B_API_KEY })
  });
  
  const data = await response.json();
  res.status(response.status).json(data);
}
```

### Custom API Route

For more control, create a custom API route:

```typescript
// app/api/sandbox/route.ts
import { compute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export async function POST(request: Request) {
  try {
    const { code, runtime } = await request.json();
    
    // Set provider
    compute.setConfig({ 
      defaultProvider: e2b({ apiKey: process.env.E2B_API_KEY }) 
    });
    
    // Create sandbox and execute code
    const sandbox = await compute.sandbox.create({});
    const result = await sandbox.runCode(code, runtime);
    
    // Clean up
    await compute.sandbox.destroy(sandbox.sandboxId);
    
    return Response.json({
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      executionTime: result.executionTime
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### Frontend Integration

Call your API from React components:

```typescript
// components/CodeExecutor.tsx
'use client';

import { useState } from 'react';

export default function CodeExecutor() {
  const [code, setCode] = useState('print("Hello World!")');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const executeCode = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compute.sandbox.runCode',
          code,
          runtime: 'python'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setOutput(data.result.stdout);
      } else {
        setOutput(`Error: ${data.error}`);
      }
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Code Executor</h2>
      
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full h-32 p-2 border rounded mb-4"
        placeholder="Enter your code here..."
      />
      
      <button
        onClick={executeCode}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Executing...' : 'Execute Code'}
      </button>
      
      {output && (
        <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto">
          {output}
        </pre>
      )}
    </div>
  );
}
```

### With Client-side Method

Use the `@computesdk/ui` package for client-side methods:

```bash
npm install @computesdk/ui
```

```typescript
// components/HookExample.tsx
'use client';

import { useCompute } from '@computesdk/ui';

export default function HookExample() {
  const compute = useCompute({
    apiEndpoint: '/api/compute',
    defaultRuntime: 'python'
  });
  
  const executeCode = async () => {
    try {
      const sandbox = await compute.sandbox.create();
      const result = await sandbox.runCode('print("Hello from hook!")');
      console.log(result.result?.stdout);
      await sandbox.destroy();
    } catch (error) {
      console.error('Execution failed:', error);
    }
  };
  
  return (
    <button onClick={executeCode}>
      Execute Code with Hook
    </button>
  );
}
```

## Advanced Examples

### Data Processing Pipeline

```typescript
// app/api/data-analysis/route.ts
import { compute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export async function POST(request: Request) {
  try {
    const { csvData } = await request.json();
    
    compute.setConfig({ 
      defaultProvider: e2b({ apiKey: process.env.E2B_API_KEY }) 
    });
    
    const sandbox = await compute.sandbox.create({});
    
    // Save CSV data
    await sandbox.filesystem.writeFile('/data/input.csv', csvData);
    
    // Process data
    const result = await sandbox.runCode(`
import pandas as pd
import json

# Read and analyze data
df = pd.read_csv('/data/input.csv')
analysis = {
    'rows': len(df),
    'columns': len(df.columns),
    'summary': df.describe().to_dict(),
    'missing_values': df.isnull().sum().to_dict()
}

print(json.dumps(analysis, indent=2))
    `);
    
    await compute.sandbox.destroy(sandbox.sandboxId);
    
    return Response.json({
      success: true,
      analysis: JSON.parse(result.stdout)
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

### Multi-Step Workflow

```typescript
// app/api/workflow/route.ts
import { compute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export async function POST(request: Request) {
  const sandbox = await compute.sandbox.create({
    provider: e2b({ apiKey: process.env.E2B_API_KEY })
  });
  
  try {
    // Step 1: Setup environment
    await sandbox.filesystem.mkdir('/workspace');
    await sandbox.runCommand('pip', ['install', 'requests', 'beautifulsoup4']);
    
    // Step 2: Fetch and process data
    const fetchResult = await sandbox.runCode(`
import requests
import json
from bs4 import BeautifulSoup

# Fetch data (example)
data = {"message": "Hello World", "timestamp": "2024-01-01"}

# Save to file
with open('/workspace/data.json', 'w') as f:
    json.dump(data, f)
    
print("Data fetched and saved")
    `);
    
    // Step 3: Process and analyze
    const analysisResult = await sandbox.runCode(`
import json

with open('/workspace/data.json', 'r') as f:
    data = json.load(f)

# Process data
result = {
    'original': data,
    'processed': data['message'].upper(),
    'length': len(data['message'])
}

print(json.dumps(result))
    `);
    
    return Response.json({
      success: true,
      steps: [
        { step: 1, output: fetchResult.stdout },
        { step: 2, result: JSON.parse(analysisResult.stdout) }
      ]
    });
  } finally {
    await compute.sandbox.destroy(sandbox.sandboxId);
  }
}
```

## Best Practices

### 1. Error Handling

```typescript
export async function POST(request: Request) {
  try {
    // ComputeSDK operations
  } catch (error) {
    console.error('Sandbox error:', error);
    
    return Response.json({
      success: false,
      error: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Internal server error'
    }, { status: 500 });
  }
}
```

### 2. Input Validation

```typescript
import { z } from 'zod';

const schema = z.object({
  code: z.string().min(1).max(10000),
  runtime: z.enum(['python', 'node']),
  timeout: z.number().optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, runtime, timeout } = schema.parse(body);
    
    // Use validated inputs
  } catch (error) {
    return Response.json({
      success: false,
      error: 'Invalid request data'
    }, { status: 400 });
  }
}
```

### 3. Resource Management

```typescript
export async function POST(request: Request) {
  let sandbox = null;
  
  try {
    sandbox = await compute.sandbox.create({});
    // Use sandbox
  } finally {
    // Always clean up
    if (sandbox) {
      await compute.sandbox.destroy(sandbox.sandboxId);
    }
  }
}
```

## Deployment

### Vercel Deployment

1. **Set environment variables** in Vercel Dashboard
2. **Use OIDC token** for Vercel provider (automatically available)
3. **Configure build settings** if needed

### Other Platforms

1. **Ensure environment variables** are properly set
2. **Check provider availability** in your deployment environment
3. **Monitor resource usage** and sandbox quotas

### Troubleshooting
Running in the browser?: Not supported—use on the server (API routes only).

Env variables not loaded?: Use .env.local, and restart dev server after changes.

Permissions/capabilities vary between providers. See Provider Support Matrix.

You’re ready to build secure, scalable LLM-driven or compute-heavy features with ComputeSDK in your Next.js apps!