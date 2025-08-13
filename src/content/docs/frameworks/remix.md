---
title: Remix
description: Use ComputeSDK in Remix applications
sidebar:
    order: 5
---

# ComputeSDK + Remix

Use ComputeSDK to execute code in secure sandboxes from your Remix loaders and actions.

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

Create a `.env` file and add your provider credentials:

```bash
# E2B (get from e2b.dev)
E2B_API_KEY=e2b_your_api_key_here

# Vercel
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

### Action Route with Request Handler

The simplest way to use ComputeSDK in Remix is with the built-in request handler:

```typescript
// app/routes/api.compute.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { handleComputeRequest } from "computesdk";
import { e2b } from "@computesdk/e2b";

export const action = async ({ request }: ActionFunctionArgs) => {
  const computeRequest = await request.json();
  
  const response = await handleComputeRequest({
    request: computeRequest,
    provider: e2b({ apiKey: process.env.E2B_API_KEY! })
  });

  if (!response.success) {
    throw json({ error: response.error || 'Unknown error' }, { status: 500 });
  }

  return json(response);
};
```

### Custom Action

For more control, create a custom action:

```typescript
// app/routes/sandbox.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { compute } from "computesdk";
import { e2b } from "@computesdk/e2b";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { code, runtime } = await request.json();
    
    // Set provider
    compute.setConfig({ 
      provider: e2b({ apiKey: process.env.E2B_API_KEY! }) 
    });
    
    // Create sandbox and execute code
    const sandbox = await compute.sandbox.create({});
    const result = await sandbox.runCode(code, runtime);
    
    // Clean up
    await compute.sandbox.destroy(sandbox.sandboxId);
    
    return json({
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      executionTime: result.executionTime
    });
  } catch (error: any) {
    throw json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
};
```

### Frontend Integration

Use Remix's built-in data loading and forms:

```tsx
// app/routes/playground.tsx
import { useState } from "react";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { compute } from "computesdk";
import { e2b } from "@computesdk/e2b";

// Server action
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const code = formData.get("code") as string;
  const runtime = formData.get("runtime") as string;

  if (!code) {
    return json({ error: "Code is required" }, { status: 400 });
  }

  try {
    compute.setConfig({ 
      provider: e2b({ apiKey: process.env.E2B_API_KEY! }) 
    });
    
    const sandbox = await compute.sandbox.create({});
    const result = await sandbox.runCode(code, runtime);
    
    await compute.sandbox.destroy(sandbox.sandboxId);
    
    return json({
      success: true,
      output: result.stdout,
      stderr: result.stderr
    });
  } catch (error: any) {
    return json({ error: error.message }, { status: 500 });
  }
};

// React component
export default function Playground() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [code, setCode] = useState('print("Hello World!")');

  const isExecuting = navigation.state === "submitting";

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Code Executor</h1>
      
      <Form method="post" className="space-y-4">
        <div>
          <label htmlFor="runtime" className="block text-sm font-medium mb-2">
            Runtime
          </label>
          <select name="runtime" id="runtime" className="border rounded px-3 py-2">
            <option value="python">Python</option>
            <option value="node">Node.js</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="code" className="block text-sm font-medium mb-2">
            Code
          </label>
          <textarea
            name="code"
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-32 p-3 font-mono text-sm border rounded"
            placeholder="Enter your code here..."
          />
        </div>
        
        <button
          type="submit"
          disabled={isExecuting}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isExecuting ? "Executing..." : "Execute Code"}
        </button>
      </Form>
      
      {actionData && (
        <div className="mt-6">
          {actionData.success ? (
            <div>
              <h3 className="text-lg font-semibold mb-2">Output</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-auto">
                {actionData.output}
              </pre>
              {actionData.stderr && (
                <>
                  <h3 className="text-lg font-semibold mb-2 mt-4">Errors</h3>
                  <pre className="bg-red-100 p-4 rounded overflow-auto">
                    {actionData.stderr}
                  </pre>
                </>
              )}
            </div>
          ) : (
            <div className="bg-red-100 p-4 rounded">
              <h3 className="text-lg font-semibold text-red-800">Error</h3>
              <p className="text-red-700">{actionData.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Using Loaders

You can also use loaders for read-only operations:

```tsx
// app/routes/status.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { compute } from "computesdk";
import { e2b } from "@computesdk/e2b";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const sandbox = await compute.sandbox.create({
      provider: e2b({ apiKey: process.env.E2B_API_KEY! })
    });
    
    const result = await sandbox.runCode(`
import sys
import platform

print(f"Python version: {sys.version}")
print(f"Platform: {platform.platform()}")
print("System ready!")
    `);
    
    await compute.sandbox.destroy(sandbox.sandboxId);
    
    return json({
      status: "ready",
      info: result.stdout
    });
  } catch (error: any) {
    return json({
      status: "error",
      error: error.message
    });
  }
};

export default function Status() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">System Status</h1>
      
      <div className={`p-4 rounded ${
        data.status === "ready" ? "bg-green-100" : "bg-red-100"
      }`}>
        <p className="font-semibold">
          Status: <span className={
            data.status === "ready" ? "text-green-700" : "text-red-700"
          }>
            {data.status}
          </span>
        </p>
        
        {data.status === "ready" ? (
          <pre className="mt-2 text-sm">{data.info}</pre>
        ) : (
          <p className="mt-2 text-red-700">{data.error}</p>
        )}
      </div>
    </div>
  );
}
```

## Advanced Examples

### File Upload Processing

```tsx
// app/routes/upload.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { json, unstable_parseMultipartFormData, unstable_createMemoryUploadHandler } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { compute } from "computesdk";
import { e2b } from "@computesdk/e2b";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const uploadHandler = unstable_createMemoryUploadHandler({
      maxPartSize: 500_000, // 500kb
    });

    const formData = await unstable_parseMultipartFormData(
      request,
      uploadHandler
    );

    const file = formData.get("file") as File;
    if (!file) {
      return json({ error: "No file uploaded" }, { status: 400 });
    }

    const content = await file.text();

    const sandbox = await compute.sandbox.create({
      provider: e2b({ apiKey: process.env.E2B_API_KEY! })
    });

    // Save file and process
    await sandbox.filesystem.writeFile(`/uploads/${file.name}`, content);
    
    const result = await sandbox.runCode(`
import os

file_path = '/uploads/${file.name}'
file_size = os.path.getsize(file_path)

with open(file_path, 'r') as f:
    content = f.read()
    lines = len(content.split('\\n'))
    chars = len(content)

print(f"File: ${file.name}")
print(f"Size: {file_size} bytes")
print(f"Lines: {lines}")
print(f"Characters: {chars}")
    `);

    await compute.sandbox.destroy(sandbox.sandboxId);

    return json({
      success: true,
      info: result.stdout
    });
  } catch (error: any) {
    return json({ error: error.message }, { status: 500 });
  }
};

export default function Upload() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isUploading = navigation.state === "submitting";

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">File Upload & Analysis</h1>
      
      <Form method="post" encType="multipart/form-data">
        <div className="mb-4">
          <label htmlFor="file" className="block text-sm font-medium mb-2">
            Choose file to analyze
          </label>
          <input
            type="file"
            name="file"
            id="file"
            required
            className="border rounded px-3 py-2"
          />
        </div>
        
        <button
          type="submit"
          disabled={isUploading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isUploading ? "Analyzing..." : "Upload & Analyze"}
        </button>
      </Form>
      
      {actionData && (
        <div className="mt-6">
          {actionData.success ? (
            <div>
              <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
              <pre className="bg-gray-100 p-4 rounded">
                {actionData.info}
              </pre>
            </div>
          ) : (
            <div className="bg-red-100 p-4 rounded">
              <p className="text-red-700">{actionData.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Data Analysis with CSV

```tsx
// app/routes/analyze.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { compute } from "computesdk";
import { e2b } from "@computesdk/e2b";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const csvData = formData.get("csvData") as string;

    if (!csvData) {
      return json({ error: "CSV data is required" }, { status: 400 });
    }

    const sandbox = await compute.sandbox.create({
      provider: e2b({ apiKey: process.env.E2B_API_KEY! })
    });

    // Save CSV and analyze
    await sandbox.filesystem.writeFile('/data/input.csv', csvData);
    
    const result = await sandbox.runCode(`
import pandas as pd
import json

# Read and analyze data
df = pd.read_csv('/data/input.csv')
analysis = {
    'rows': len(df),
    'columns': len(df.columns),
    'column_names': df.columns.tolist(),
    'summary': df.describe().to_dict(),
    'missing_values': df.isnull().sum().to_dict(),
    'dtypes': df.dtypes.astype(str).to_dict()
}

print(json.dumps(analysis, indent=2))
    `);

    await compute.sandbox.destroy(sandbox.sandboxId);

    return json({
      success: true,
      analysis: JSON.parse(result.stdout)
    });
  } catch (error: any) {
    return json({ error: error.message }, { status: 500 });
  }
};

export default function Analyze() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isAnalyzing = navigation.state === "submitting";

  const sampleData = `name,age,city
Alice,25,New York
Bob,30,San Francisco
Charlie,35,Chicago
Diana,28,Boston`;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">CSV Data Analysis</h1>
      
      <Form method="post">
        <div className="mb-4">
          <label htmlFor="csvData" className="block text-sm font-medium mb-2">
            CSV Data
          </label>
          <textarea
            name="csvData"
            id="csvData"
            defaultValue={sampleData}
            className="w-full h-32 p-3 font-mono text-sm border rounded"
            placeholder="Paste your CSV data here..."
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isAnalyzing}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Data"}
        </button>
      </Form>
      
      {actionData && (
        <div className="mt-6">
          {actionData.success ? (
            <div>
              <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-semibold mb-2">Dataset Info</h4>
                  <p>Rows: {actionData.analysis.rows}</p>
                  <p>Columns: {actionData.analysis.columns}</p>
                  <p>Column Names: {actionData.analysis.column_names.join(', ')}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded">
                  <h4 className="font-semibold mb-2">Missing Values</h4>
                  <pre className="text-sm">
                    {JSON.stringify(actionData.analysis.missing_values, null, 2)}
                  </pre>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Statistical Summary</h4>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                  {JSON.stringify(actionData.analysis.summary, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-red-100 p-4 rounded">
              <p className="text-red-700">{actionData.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Multi-Step Workflow

```tsx
// app/routes/workflow.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { compute } from "computesdk";
import { e2b } from "@computesdk/e2b";

interface WorkflowStep {
  step: number;
  action: string;
  output?: string;
  result?: any;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const sandbox = await compute.sandbox.create({
    provider: e2b({ apiKey: process.env.E2B_API_KEY! })
  });
  
  try {
    const steps: WorkflowStep[] = [];
    
    // Step 1: Setup environment
    await sandbox.filesystem.mkdir('/workspace');
    const setupResult = await sandbox.runCommand('pip', ['install', 'requests', 'beautifulsoup4']);
    steps.push({ step: 1, action: 'setup', output: setupResult.stdout });
    
    // Step 2: Fetch data
    const fetchResult = await sandbox.runCode(`
import requests
import json

# Simulate data fetch
data = {"message": "Hello World", "timestamp": "2024-01-01"}

# Save to file
with open('/workspace/data.json', 'w') as f:
    json.dump(data, f)
    
print("Data fetched and saved")
    `);
    steps.push({ step: 2, action: 'fetch', output: fetchResult.stdout });
    
    // Step 3: Process data
    const processResult = await sandbox.runCode(`
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
    steps.push({ 
      step: 3, 
      action: 'process', 
      result: JSON.parse(processResult.stdout) 
    });
    
    return json({
      success: true,
      steps
    });
  } catch (error: any) {
    return json({ error: error.message }, { status: 500 });
  } finally {
    await compute.sandbox.destroy(sandbox.sandboxId);
  }
};

export default function Workflow() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isRunning = navigation.state === "submitting";

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Multi-Step Workflow</h1>
      
      <Form method="post">
        <button
          type="submit"
          disabled={isRunning}
          className="bg-green-500 text-white px-6 py-3 rounded disabled:opacity-50"
        >
          {isRunning ? "Running Workflow..." : "Start Workflow"}
        </button>
      </Form>
      
      {actionData && (
        <div className="mt-6">
          {actionData.success ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Workflow Results</h3>
              
              {actionData.steps.map((step: WorkflowStep) => (
                <div key={step.step} className="mb-4 p-4 border rounded">
                  <h4 className="font-semibold mb-2">
                    Step {step.step}: {step.action}
                  </h4>
                  
                  {step.output && (
                    <pre className="bg-gray-100 p-2 rounded text-sm mb-2">
                      {step.output}
                    </pre>
                  )}
                  
                  {step.result && (
                    <pre className="bg-green-50 p-2 rounded text-sm">
                      {JSON.stringify(step.result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-red-100 p-4 rounded">
              <p className="text-red-700">{actionData.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Error Handling

```tsx
// app/utils/compute-error-handler.ts
import { json } from "@remix-run/node";

export const handleComputeError = (error: any) => {
  console.error('Sandbox error:', error);
  
  // Don't expose sensitive error details in production
  const message = process.env.NODE_ENV === 'development' 
    ? error.message 
    : 'Internal server error';
  
  return json({ error: message }, { status: 500 });
};
```

### 2. Input Validation

```tsx
// app/utils/validation.ts
import { json } from "@remix-run/node";

export const validateCode = (code: string) => {
  if (!code) {
    throw json({ error: "Code is required" }, { status: 400 });
  }
  
  if (code.length > 10000) {
    throw json({ error: "Code too long (max 10,000 characters)" }, { status: 400 });
  }
  
  return code;
};

export const validateRuntime = (runtime: string) => {
  if (!['python', 'node'].includes(runtime)) {
    throw json({ error: "Invalid runtime" }, { status: 400 });
  }
  
  return runtime as 'python' | 'node';
};
```

### 3. Resource Management

```tsx
// app/utils/sandbox-manager.ts
import { compute } from "computesdk";

export const withSandbox = async <T>(
  provider: any,
  callback: (sandbox: any) => Promise<T>
): Promise<T> => {
  const sandbox = await compute.sandbox.create({ provider });
  
  try {
    return await callback(sandbox);
  } finally {
    await compute.sandbox.destroy(sandbox.sandboxId);
  }
};
```

### 4. Provider Configuration

```tsx
// app/utils/providers.ts
import { e2b } from "@computesdk/e2b";
import { vercel } from "@computesdk/vercel";
import { daytona } from "@computesdk/daytona";

export const getProvider = () => {
  if (process.env.E2B_API_KEY) {
    return e2b({ apiKey: process.env.E2B_API_KEY });
  }
  
  if (process.env.VERCEL_TOKEN) {
    return vercel({ 
      token: process.env.VERCEL_TOKEN,
      teamId: process.env.VERCEL_TEAM_ID!,
      projectId: process.env.VERCEL_PROJECT_ID!
    });
  }
  
  if (process.env.DAYTONA_API_KEY) {
    return daytona({ apiKey: process.env.DAYTONA_API_KEY });
  }
  
  throw new Error('No compute provider configured');
};
```

## Deployment

### Environment Variables

Set your environment variables in your deployment platform:

```bash
# Production environment variables
E2B_API_KEY=your_production_e2b_key
VERCEL_TOKEN=your_production_vercel_token
VERCEL_TEAM_ID=your_team_id
VERCEL_PROJECT_ID=your_project_id
DAYTONA_API_KEY=your_production_daytona_key
```

### Build Configuration

Ensure your Remix build is properly configured:

```typescript
// remix.config.js
export default {
  ignoredRouteFiles: ["**/.*"],
  serverModuleFormat: "cjs",
  serverPlatform: "node",
  serverMinify: false,
  // Add any other configuration specific to your deployment
};
```

## Troubleshooting

**Environment variables not loading?**
- Check `.env` file exists and has correct format
- Restart dev server after changes
- Verify environment variables are set in production

**Sandbox creation fails?**
- Verify API keys are correct and have proper format
- Check provider-specific setup requirements
- Monitor rate limits and quotas

**Form submission issues?**
- Ensure proper CSRF protection if enabled
- Check request body parsing (JSON vs FormData)
- Verify action routes are properly defined

**Loader vs Action confusion?**
- Use loaders for read-only operations (GET requests)
- Use actions for mutations and code execution (POST/PUT/DELETE)
- Remember loaders run on page load, actions run on form submission

**Client hydration issues?**
- ComputeSDK should only run server-side (loaders/actions)
- Don't import ComputeSDK in client-side components
- Use Remix's data loading patterns for client-server communication