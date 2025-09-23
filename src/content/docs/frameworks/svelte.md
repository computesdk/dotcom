---
title: SvelteKit
description: Use ComputeSDK in SvelteKit applications
sidebar:
    order: 3
---

# ComputeSDK + SvelteKit

Use ComputeSDK to execute code in secure sandboxes from your SvelteKit server routes.

## Setup

### 1. Install Dependencies

```bash
npm install computesdk

# Provider packages (install what you need)
npm install @computesdk/blaxel     # Blaxel provider
npm install @computesdk/e2b        # E2B provider
npm install @computesdk/vercel     # Vercel provider  
npm install @computesdk/daytona    # Daytona provider
```

### 2. Configure Environment Variables

Create a `.env` file and add your provider credentials:

```bash
# Blaxel (get from app.blaxel.ai)
BLAXEL_API_KEY=blaxel_your_api_key_here
BLAXEL_WORKSPACE=your_workspace_here

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

Navigate to [http://localhost:5173](http://localhost:5173)

## Implementation

### API Route with Request Handler

The simplest way to use ComputeSDK in SvelteKit is with the built-in request handler:

```typescript
// src/routes/api/compute/+server.ts
import { json, error } from '@sveltejs/kit';
import { handleComputeRequest } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export const POST = async ({ request }: { request: Request }) => {
  const computeRequest = await request.json();
  
  const response = await handleComputeRequest({
    request: computeRequest,
    provider: e2b({ apiKey: process.env.E2B_API_KEY! })
  });

  if (!response.success) {
    throw error(500, response.error || 'Unknown error occurred');
  }

  return json(response);
};
```

### Custom API Route

For more control, create a custom API route:

```typescript
// src/routes/api/sandbox/+server.ts
import { json, error } from '@sveltejs/kit';
import { compute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export const POST = async ({ request }) => {
  try {
    const { code, runtime } = await request.json();
    
    // Set provider
    compute.setConfig({ 
      defaultProvider: e2b({ apiKey: process.env.E2B_API_KEY! }) 
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
  } catch (err: any) {
    throw error(500, err.message || 'Unknown error');
  }
};
```

### Frontend Integration

Call your API from Svelte components:

```svelte
<!-- src/routes/playground/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  
  let code = 'print("Hello World!")';
  let output = '';
  let loading = false;
  let runtime: 'python' | 'node' = 'python';

  const executeCode = async () => {
    loading = true;
    try {
      const response = await fetch('/api/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compute.sandbox.runCode',
          code,
          runtime
        })
      });
      
      const data = await response.json();
      if (data.success) {
        output = data.result.stdout;
      } else {
        output = `Error: ${data.error}`;
      }
    } catch (err: any) {
      output = `Error: ${err.message}`;
    } finally {
      loading = false;
    }
  };
</script>

<div class="container">
  <h1>Code Executor</h1>
  
  <div class="controls">
    <select bind:value={runtime}>
      <option value="python">Python</option>
      <option value="node">Node.js</option>
    </select>
  </div>
  
  <textarea
    bind:value={code}
    placeholder="Enter your code here..."
    rows="10"
    cols="80"
  ></textarea>
  
  <button on:click={executeCode} disabled={loading}>
    {loading ? 'Executing...' : 'Execute Code'}
  </button>
  
  {#if output}
    <pre class="output">{output}</pre>
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .controls {
    margin-bottom: 1rem;
  }
  
  textarea {
    width: 100%;
    font-family: 'Courier New', monospace;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
  
  button {
    background: #007bff;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .output {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    margin-top: 1rem;
    overflow-x: auto;
  }
</style>
```

### Using Form Actions

SvelteKit form actions provide another way to handle server-side execution:

```typescript
// src/routes/form-demo/+page.server.ts
import { fail } from '@sveltejs/kit';
import { compute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export const actions = {
  execute: async ({ request }) => {
    const formData = await request.formData();
    const code = formData.get('code') as string;
    const runtime = formData.get('runtime') as string;

    if (!code) {
      return fail(400, { error: 'Code is required' });
    }

    try {
      compute.setConfig({ 
        defaultProvider: e2b({ apiKey: process.env.E2B_API_KEY! }) 
      });
      
      const sandbox = await compute.sandbox.create({});
      const result = await sandbox.runCode(code, runtime);
      
      await compute.sandbox.destroy(sandbox.sandboxId);
      
      return {
        success: true,
        output: result.stdout,
        stderr: result.stderr
      };
    } catch (error: any) {
      return fail(500, { error: error.message });
    }
  }
};
```

```svelte
<!-- src/routes/form-demo/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  
  export let form;
  
  let loading = false;
</script>

<form method="POST" action="?/execute" use:enhance={({ formElement, formData, action, cancel, submitter }) => {
  loading = true;
  return async ({ result, update }) => {
    loading = false;
    await update();
  };
}}>
  <textarea name="code" rows="10" placeholder="Enter your code here..." required></textarea>
  
  <select name="runtime">
    <option value="python">Python</option>
    <option value="node">Node.js</option>
  </select>
  
  <button type="submit" disabled={loading}>
    {loading ? 'Executing...' : 'Execute Code'}
  </button>
</form>

{#if form?.success}
  <pre class="output">{form.output}</pre>
{:else if form?.error}
  <div class="error">Error: {form.error}</div>
{/if}
```

## Advanced Examples

### Data Analysis Route

```typescript
// src/routes/api/analyze/+server.ts
import { json, error } from '@sveltejs/kit';
import { compute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export const POST = async ({ request }) => {
  try {
    const { csvData } = await request.json();
    
    compute.setConfig({ 
      deafultProvider: e2b({ apiKey: process.env.E2B_API_KEY! }) 
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
    
    return json({
      success: true,
      analysis: JSON.parse(result.stdout)
    });
  } catch (err: any) {
    throw error(500, err.message);
  }
};
```

### File Upload and Processing

```typescript
// src/routes/api/upload/+server.ts
import { json, error } from '@sveltejs/kit';
import { compute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export const POST = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw error(400, 'No file provided');
    }
    
    const fileContent = await file.text();
    
    const sandbox = await compute.sandbox.create({
      provider: e2b({ apiKey: process.env.E2B_API_KEY! })
    });
    
    // Save uploaded file
    await sandbox.filesystem.writeFile(`/uploads/${file.name}`, fileContent);
    
    // Process file
    const result = await sandbox.runCode(`
import os

# Get file info
file_path = '/uploads/${file.name}'
file_size = os.path.getsize(file_path)

with open(file_path, 'r') as f:
    content = f.read()
    lines = len(content.split('\\n'))
    chars = len(content)

print(f"File: {file.name}")
print(f"Size: {file_size} bytes")
print(f"Lines: {lines}")
print(f"Characters: {chars}")
    `);
    
    await compute.sandbox.destroy(sandbox.sandboxId);
    
    return json({
      success: true,
      info: result.stdout
    });
  } catch (err: any) {
    throw error(500, err.message);
  }
};
```

### Multi-Step Workflow

```typescript
// src/routes/api/workflow/+server.ts
import { json, error } from '@sveltejs/kit';
import { compute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export const POST = async ({ request }) => {
  const sandbox = await compute.sandbox.create({
    provider: e2b({ apiKey: process.env.E2B_API_KEY! })
  });
  
  try {
    const steps: any[] = [];
    
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
  } catch (err: any) {
    throw error(500, err.message);
  } finally {
    await compute.sandbox.destroy(sandbox.sandboxId);
  }
};
```

## Best Practices

### 1. Environment Variable Access

```typescript
// src/lib/env.ts
import { env } from '$env/dynamic/private';
import { E2B_API_KEY, VERCEL_TOKEN } from '$env/static/private';

export const getProvider = () => {
  if (E2B_API_KEY) {
    return e2b({ apiKey: E2B_API_KEY });
  }
  if (VERCEL_TOKEN) {
    return vercel({ token: VERCEL_TOKEN });
  }
  throw new Error('No compute provider configured');
};
```

### 2. Error Handling

```typescript
// src/routes/api/safe/+server.ts
import { json, error } from '@sveltejs/kit';

export const POST = async ({ request }) => {
  try {
    // ComputeSDK operations
  } catch (err: any) {
    console.error('Sandbox error:', err);
    
    // Don't expose sensitive error details in production
    const message = import.meta.env.DEV ? err.message : 'Internal server error';
    throw error(500, message);
  }
};
```

### 3. Input Validation

```typescript
// src/lib/validation.ts
import { z } from 'zod';

export const executeSchema = z.object({
  code: z.string().min(1).max(10000),
  runtime: z.enum(['python', 'node']),
  timeout: z.number().optional().default(30000)
});

// In your route
export const POST = async ({ request }) => {
  const body = await request.json();
  const validation = executeSchema.safeParse(body);
  
  if (!validation.success) {
    throw error(400, 'Invalid request data');
  }
  
  const { code, runtime, timeout } = validation.data;
  // Use validated data
};
```

### 4. Resource Management

```typescript
// src/routes/api/managed/+server.ts
export const POST = async ({ request }) => {
  let sandbox = null;
  
  try {
    sandbox = await compute.sandbox.create({});
    // Use sandbox
  } catch (err: any) {
    throw error(500, err.message);
  } finally {
    // Always clean up
    if (sandbox) {
      await compute.sandbox.destroy(sandbox.sandboxId);
    }
  }
};
```

## Layout and Stores

### Global Error Handling

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  let showError = false;
  let errorMessage = '';
  
  $: if ($page.error) {
    showError = true;
    errorMessage = $page.error.message || 'An error occurred';
  }
</script>

{#if showError}
  <div class="error-banner">
    <p>{errorMessage}</p>
    <button on:click={() => showError = false}>×</button>
  </div>
{/if}

<main>
  <slot />
</main>

<style>
  .error-banner {
    background: #fee;
    color: #c33;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>
```

### Compute Store

```typescript
// src/lib/stores/compute.ts
import { writable } from 'svelte/store';

interface ExecutionState {
  loading: boolean;
  output: string;
  error: string | null;
}

function createComputeStore() {
  const { subscribe, set, update } = writable<ExecutionState>({
    loading: false,
    output: '',
    error: null
  });

  return {
    subscribe,
    execute: async (code: string, runtime: 'python' | 'node' = 'python') => {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const response = await fetch('/api/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'compute.sandbox.runCode',
            code,
            runtime
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          update(state => ({
            ...state,
            loading: false,
            output: data.result.stdout,
            error: null
          }));
        } else {
          update(state => ({
            ...state,
            loading: false,
            error: data.error
          }));
        }
      } catch (error: any) {
        update(state => ({
          ...state,
          loading: false,
          error: error.message
        }));
      }
    },
    clear: () => set({ loading: false, output: '', error: null })
  };
}

export const computeStore = createComputeStore();
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

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    // Ensure environment variables are properly handled
    'process.env': process.env
  }
});
```

## Troubleshooting

**Environment variables not loading?**
- Check `.env` file exists and has correct format
- Restart dev server after changes
- Use `$env/static/private` for build-time variables
- Use `$env/dynamic/private` for runtime variables

**Sandbox creation fails?**
- Verify API keys are correct and have proper format
- Check provider-specific setup requirements
- Monitor rate limits and quotas

**Server-side only errors?**
- ComputeSDK must run on server-side only
- Use server routes (`+server.ts`) or form actions
- Don't import ComputeSDK in client-side components

**Build errors?**
- Ensure all ComputeSDK imports are in server-side code only
- Check that environment variables are properly typed
- Verify provider packages are correctly installed

**CORS issues?**
- All ComputeSDK operations happen server-side
- Frontend calls your API routes, not ComputeSDK directly
- Check that your API routes are properly configured