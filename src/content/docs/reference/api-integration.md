---
title: API Integration
description: Use ComputeSDK with web frameworks via request handlers
sidebar:
    order: 6
---

ComputeSDK provides a built-in request handler for seamless integration with web frameworks.

## Request Handler

### `handleComputeRequest(options)`

Process compute requests from web clients.

```typescript
import { handleComputeRequest } from 'computesdk';
import { e2b } from '@computesdk/e2b';

// Next.js API route
export async function POST(request: Request) {
  return handleComputeRequest({
    request,
    provider: e2b({ apiKey: process.env.E2B_API_KEY })
  });
}
```

**Parameters:**
- `options` - Request handling options
  - `request` - Request object containing action and parameters
  - `provider` - Provider instance to use

**Returns:** Response with execution results

## Supported Actions

All ComputeSDK operations are available via the request handler:

### Sandbox Management
- `compute.sandbox.create` - Create new sandbox
- `compute.sandbox.destroy` - Destroy sandbox  
- `compute.sandbox.getInfo` - Get sandbox information
- `compute.sandbox.list` - List all sandboxes

### Code Execution
- `compute.sandbox.runCode` - Execute code
- `compute.sandbox.runCommand` - Run shell command

### Filesystem Operations
- `compute.sandbox.filesystem.readFile` - Read file
- `compute.sandbox.filesystem.writeFile` - Write file
- `compute.sandbox.filesystem.mkdir` - Create directory
- `compute.sandbox.filesystem.readdir` - List directory
- `compute.sandbox.filesystem.exists` - Check if path exists
- `compute.sandbox.filesystem.remove` - Remove file/directory

### Terminal Operations
- `compute.sandbox.terminal.create` - Create terminal
- `compute.sandbox.terminal.list` - List terminals
- `compute.sandbox.terminal.getById` - Get terminal by ID
- `compute.sandbox.terminal.destroy` - Destroy terminal
- `compute.sandbox.terminal.write` - Write to terminal
- `compute.sandbox.terminal.resize` - Resize terminal
- `compute.sandbox.terminal.kill` - Kill terminal

## Client Usage

### Execute Code

```typescript
const response = await fetch('/api/compute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'compute.sandbox.runCode',
    code: 'print("Hello from web!")',
    runtime: 'python'
  })
});

const result = await response.json();
if (result.success) {
  console.log(result.result.stdout); // "Hello from web!"
}
```

### Filesystem Operations

```typescript
// Write file
await fetch('/api/compute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'compute.sandbox.filesystem.writeFile',
    sandboxId: 'sandbox-123',
    path: '/tmp/data.json',
    content: JSON.stringify({ message: 'Hello' })
  })
});

// Read file
const response = await fetch('/api/compute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'compute.sandbox.filesystem.readFile',
    sandboxId: 'sandbox-123',
    path: '/tmp/data.json'
  })
});

const result = await response.json();
if (result.success) {
  const data = JSON.parse(result.result);
  console.log(data.message); // "Hello"
}
```

### Sandbox Management

```typescript
// Create sandbox
const createResponse = await fetch('/api/compute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'compute.sandbox.create',
    options: { runtime: 'python', timeout: 300000 }
  })
});

const { result: sandbox } = await createResponse.json();
console.log('Created sandbox:', sandbox.sandboxId);

// Use sandbox...

// Destroy sandbox
await fetch('/api/compute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'compute.sandbox.destroy',
    sandboxId: sandbox.sandboxId
  })
});
```

## Framework Examples

### Next.js App Router

```typescript
// app/api/compute/route.ts
import { handleComputeRequest } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export async function POST(request: Request) {
  return handleComputeRequest({
    request,
    provider: e2b({ apiKey: process.env.E2B_API_KEY })
  });
}
```

### Next.js Pages Router

```typescript
// pages/api/compute.ts
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

### Nuxt

```typescript
// server/api/compute.post.ts
import { handleComputeRequest } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export default defineEventHandler(async (event) => {
  const computeRequest = await readBody(event);
  
  const response = await handleComputeRequest({
    request: computeRequest,
    provider: e2b({ apiKey: process.env.E2B_API_KEY })
  });
  
  if (!response.success) {
    throw createError({
      statusCode: 500,
      statusMessage: response.error || 'Unknown error occurred'
    });
  }
  
  return response;
});
```

### SvelteKit

```typescript
// src/routes/api/compute/+server.ts
import { json, error } from '@sveltejs/kit';
import { handleComputeRequest } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export const POST = async ({ request }) => {
  const computeRequest = await request.json();
  
  const response = await handleComputeRequest({
    request: computeRequest,
    provider: e2b({ apiKey: process.env.E2B_API_KEY })
  });

  if (!response.success) {
    throw error(500, response.error || 'Unknown error occurred');
  }

  return json(response);
};
```

### Remix

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
    provider: e2b({ apiKey: process.env.E2B_API_KEY })
  });

  if (!response.success) {
    throw json({ error: response.error || 'Unknown error' }, { status: 500 });
  }

  return json(response);
};
```

### Astro

```typescript
// src/pages/api/compute.ts
import type { APIRoute } from 'astro';
import { handleComputeRequest } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export const POST: APIRoute = async ({ request }) => {
  const computeRequest = await request.json();
  
  const response = await handleComputeRequest({
    request: computeRequest,
    provider: e2b({ apiKey: import.meta.env.E2B_API_KEY })
  });

  return new Response(
    JSON.stringify(response),
    {
      status: response.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
```

## Response Format

All web integration responses follow a consistent format:

```typescript
interface ComputeResponse {
  success: boolean;
  result?: any;      // Operation result
  error?: string;    // Error message if success is false
}
```

**Success Response:**
```json
{
  "success": true,
  "result": {
    "stdout": "Hello World!",
    "stderr": "",
    "exitCode": 0,
    "executionTime": 127,
    "sandboxId": "sb_123",
    "provider": "e2b"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Sandbox not found"
}
```