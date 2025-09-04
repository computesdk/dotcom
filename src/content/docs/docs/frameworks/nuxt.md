---
title: Nuxt
description: Use ComputeSDK in Nuxt applications
sidebar:
    order: 2
---

# ComputeSDK + Nuxt

Use ComputeSDK to execute code in secure sandboxes from your Nuxt server routes.

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

### API Route with Request Handler

The simplest way to use ComputeSDK in Nuxt is with the built-in request handler:

```typescript
// server/api/compute.post.ts
import { handleComputeRequest } from 'computesdk'
import { e2b } from '@computesdk/e2b'

export default defineEventHandler(async (event) => {
  const computeRequest = await readBody(event)
  
  const response = await handleComputeRequest({
    request: computeRequest,
    provider: e2b({ apiKey: process.env.E2B_API_KEY! })
  })
  
  if (!response.success) {
    throw createError({
      statusCode: 500,
      statusMessage: response.error || 'Unknown error occurred'
    })
  }
  
  return response
})
```

### Custom API Route

For more control, create a custom API route:

```typescript
// server/api/sandbox.post.ts
import { compute } from 'computesdk'
import { e2b } from '@computesdk/e2b'

export default defineEventHandler(async (event) => {
  try {
    const { code, runtime } = await readBody(event)
    
    // Set provider
    compute.setConfig({ 
      defaultProvider: e2b({ apiKey: process.env.E2B_API_KEY! }) 
    })
    
    // Create sandbox and execute code
    const sandbox = await compute.sandbox.create({})
    const result = await sandbox.runCode(code, runtime)
    
    // Clean up
    await compute.sandbox.destroy(sandbox.sandboxId)
    
    return {
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      executionTime: result.executionTime
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Unknown error'
    })
  }
})
```

### Frontend Integration

Call your API from Vue components:

```vue
<!-- components/CodeExecutor.vue -->
<script setup lang="ts">
const code = ref('print("Hello World!")')
const output = ref('')
const loading = ref(false)

const executeCode = async () => {
  loading.value = true
  try {
    const response = await $fetch('/api/compute', {
      method: 'POST',
      body: {
        action: 'compute.sandbox.runCode',
        code: code.value,
        runtime: 'python'
      }
    })
    
    if (response.success) {
      output.value = response.result.stdout
    } else {
      output.value = `Error: ${response.error}`
    }
  } catch (error: any) {
    output.value = `Error: ${error.message}`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">Code Executor</h2>
    
    <textarea
      v-model="code"
      class="w-full h-32 p-2 border rounded mb-4"
      placeholder="Enter your code here..."
    />
    
    <button
      @click="executeCode"
      :disabled="loading"
      class="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
    >
      {{ loading ? 'Executing...' : 'Execute Code' }}
    </button>
    
    <pre v-if="output" class="mt-4 p-4 bg-gray-100 rounded overflow-auto">
      {{ output }}
    </pre>
  </div>
</template>
```

### Composables

Create reusable composables for ComputeSDK logic:

```typescript
// composables/useCompute.ts
export const useComputeProvider = () => {
  const config = useRuntimeConfig()
  
  const getProvider = () => {
    if (config.E2B_API_KEY) {
      return e2b({ apiKey: config.E2B_API_KEY })
    }
    if (config.VERCEL_TOKEN) {
      return vercel({ 
        token: config.VERCEL_TOKEN,
        teamId: config.VERCEL_TEAM_ID,
        projectId: config.VERCEL_PROJECT_ID
      })
    }
    if (config.DAYTONA_API_KEY) {
      return daytona({ apiKey: config.DAYTONA_API_KEY })
    }
    throw new Error('No compute provider configured')
  }
  
  return { getProvider }
}
```

Use in your API routes:

```typescript
// server/api/execute.post.ts
export default defineEventHandler(async (event) => {
  const { getProvider } = useComputeProvider()
  const { code, runtime } = await readBody(event)
  
  compute.setConfig({ defaultProvider: getProvider() })
  
  const sandbox = await compute.sandbox.create({})
  try {
    const result = await sandbox.runCode(code, runtime)
    return { success: true, result }
  } finally {
    await compute.sandbox.destroy(sandbox.sandboxId)
  }
})
```

## Advanced Examples

### Data Processing Pipeline

```typescript
// server/api/analyze.post.ts
export default defineEventHandler(async (event) => {
  const { csvData } = await readBody(event)
  
  compute.setConfig({ 
    defaultProvider: e2b({ apiKey: process.env.E2B_API_KEY! }) 
  })
  
  const sandbox = await compute.sandbox.create({})
  
  try {
    // Save CSV data
    await sandbox.filesystem.writeFile('/data/input.csv', csvData)
    
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
    `)
    
    return {
      success: true,
      analysis: JSON.parse(result.stdout)
    }
  } finally {
    await compute.sandbox.destroy(sandbox.sandboxId)
  }
})
```

### File Operations

```typescript
// server/api/workspace.post.ts
export default defineEventHandler(async (event) => {
  const { files } = await readBody(event)
  
  const sandbox = await compute.sandbox.create({
    provider: e2b({ apiKey: process.env.E2B_API_KEY! })
  })
  
  try {
    // Create workspace
    await sandbox.filesystem.mkdir('/workspace')
    
    // Write multiple files
    for (const [filename, content] of Object.entries(files)) {
      await sandbox.filesystem.writeFile(`/workspace/${filename}`, content as string)
    }
    
    // Process files
    const result = await sandbox.runCode(`
import os
import json

# List all files
files = []
for root, dirs, filenames in os.walk('/workspace'):
    for filename in filenames:
        filepath = os.path.join(root, filename)
        with open(filepath, 'r') as f:
            files.append({
                'name': filename,
                'size': os.path.getsize(filepath),
                'content': f.read()
            })

print(json.dumps(files, indent=2))
    `)
    
    return {
      success: true,
      files: JSON.parse(result.stdout)
    }
  } finally {
    await compute.sandbox.destroy(sandbox.sandboxId)
  }
})
```

### Multi-Provider Support

```typescript
// server/api/multi-provider.post.ts
export default defineEventHandler(async (event) => {
  const { provider: providerName, code } = await readBody(event)
  
  let provider
  switch (providerName) {
    case 'e2b':
      provider = e2b({ apiKey: process.env.E2B_API_KEY! })
      break
    case 'vercel':
      provider = vercel({ token: process.env.VERCEL_TOKEN! })
      break
    case 'daytona':
      provider = daytona({ apiKey: process.env.DAYTONA_API_KEY! })
      break
    default:
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid provider specified'
      })
  }
  
  const sandbox = await compute.sandbox.create({ provider })
  
  try {
    const result = await sandbox.runCode(code)
    return {
      success: true,
      provider: providerName,
      result: result.stdout
    }
  } finally {
    await compute.sandbox.destroy(sandbox.sandboxId)
  }
})
```

## Pages and Components

### Interactive Code Playground

```vue
<!-- pages/playground.vue -->
<script setup lang="ts">
const code = ref(`
import pandas as pd
import numpy as np

# Create sample data
data = {'A': [1, 2, 3], 'B': [4, 5, 6]}
df = pd.DataFrame(data)

print("DataFrame:")
print(df)
print(f"Sum: {df.sum().sum()}")
`)

const runtime = ref<'python' | 'node'>('python')
const provider = ref('e2b')
const output = ref('')
const loading = ref(false)

const executeCode = async () => {
  loading.value = true
  try {
    const response = await $fetch('/api/multi-provider', {
      method: 'POST',
      body: {
        provider: provider.value,
        code: code.value,
        runtime: runtime.value
      }
    })
    
    output.value = response.result
  } catch (error: any) {
    output.value = `Error: ${error.message}`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">ComputeSDK Playground</h1>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div class="mb-4 flex gap-4">
          <select v-model="provider" class="px-3 py-2 border rounded">
            <option value="e2b">E2B</option>
            <option value="vercel">Vercel</option>
            <option value="daytona">Daytona</option>
          </select>
          
          <select v-model="runtime" class="px-3 py-2 border rounded">
            <option value="python">Python</option>
            <option value="node">Node.js</option>
          </select>
        </div>
        
        <textarea
          v-model="code"
          class="w-full h-96 p-4 font-mono text-sm border rounded"
          placeholder="Enter your code here..."
        />
        
        <button
          @click="executeCode"
          :disabled="loading"
          class="mt-4 bg-blue-500 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {{ loading ? 'Executing...' : 'Execute Code' }}
        </button>
      </div>
      
      <div>
        <h3 class="text-lg font-semibold mb-4">Output</h3>
        <pre class="w-full h-96 p-4 bg-gray-100 rounded overflow-auto font-mono text-sm">{{ output || 'Output will appear here...' }}</pre>
      </div>
    </div>
  </div>
</template>
```

## Best Practices

### 1. Error Handling

```typescript
// server/api/safe-execute.post.ts
export default defineEventHandler(async (event) => {
  try {
    // ComputeSDK operations
  } catch (error: any) {
    console.error('Sandbox error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: process.dev ? error.message : 'Internal server error'
    })
  }
})
```

### 2. Input Validation

```typescript
// server/api/validate.post.ts
import Joi from 'joi'

const schema = Joi.object({
  code: Joi.string().required().max(10000),
  runtime: Joi.string().valid('python', 'node').required(),
  timeout: Joi.number().optional().min(1000).max(300000)
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { error, value } = schema.validate(body)
  
  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.details[0].message
    })
  }
  
  // Use validated data
  const { code, runtime, timeout } = value
})
```

### 3. Resource Management

```typescript
// server/api/managed.post.ts
export default defineEventHandler(async (event) => {
  let sandbox = null
  
  try {
    sandbox = await compute.sandbox.create({})
    // Use sandbox
  } finally {
    // Always clean up
    if (sandbox) {
      await compute.sandbox.destroy(sandbox.sandboxId)
    }
  }
})
```

### 4. Runtime Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // Server-side environment variables
    E2B_API_KEY: process.env.E2B_API_KEY,
    VERCEL_TOKEN: process.env.VERCEL_TOKEN,
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
    DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
    
    // Public keys (exposed to client-side)
    public: {
      // Add any public config here
    }
  }
})
```

## Deployment

### Environment Variables

Make sure to set your environment variables in your deployment platform:

```bash
# Production environment variables
E2B_API_KEY=your_production_e2b_key
VERCEL_TOKEN=your_production_vercel_token
VERCEL_TEAM_ID=your_team_id
VERCEL_PROJECT_ID=your_project_id
DAYTONA_API_KEY=your_production_daytona_key
```

### Platform-Specific Notes

**Vercel:**
- Use environment variables in Vercel Dashboard
- OIDC token is automatically available in production

**Netlify:**
- Set variables in site settings
- Use build hooks for redeployment

**Generic Node.js hosting:**
- Ensure all environment variables are properly set
- Check provider availability in your deployment region

## Troubleshooting

**Environment variables not loading?**
- Check `.env` file exists and has correct format
- Restart dev server after changes
- Verify runtime config in `nuxt.config.ts`

**Sandbox creation fails?**
- Verify API keys are correct
- Check provider-specific setup requirements
- Monitor rate limits and quotas

**Server-side only errors?**
- ComputeSDK must run on server-side only
- Use server routes (`server/api/`) not client composables
- Check import paths are correct

**CORS issues?**
- All ComputeSDK operations happen server-side
- Frontend calls your API routes, not ComputeSDK directly