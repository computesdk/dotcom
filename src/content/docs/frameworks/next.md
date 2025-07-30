---
title: Next
description: ComputeSDK for Next.js
sidebar:
    order: 1
---

### Why Use ComputeSDK with Next.js?
Secure Sandboxed Execution: Safely run untrusted or dynamic code from your API routes.

Consistent API: Develop provider-agnostic features that work across Vercel, E2B, and others.

Filesystem in the Cloud: Perform file operations inside ephemeral sandboxes, not on the server.

Great for LLMs, AI apps, and analytics.

### Installation
Install ComputeSDK and any compute providers you need:

```bash
npm install computesdk
# For Vercel sandbox (best for Next.js on Vercel):
npm install @computesdk/vercel
# Or for E2B, etc:
npm install @computesdk/e2b
```

### Setting Up Environment Variables
For Vercel provider (best match for Vercel/Next.js deployment):

```bash
# In .env.local (never commit secrets)

VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id
VERCEL_PROJECT_ID=your_project_id
```
For local development you can use E2B or any other supported provider—just provide the correct keys.

### Usage in API Routes
Use ComputeSDK in Next.js API routes (pages/api or app/api, both supported). Below is an example for /pages/api/sandbox-example.ts:

```typescript
// pages/api/sandbox-example.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { vercel } from '@computesdk/vercel';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create a Vercel sandbox (auto-loads credentials from env)
  const sandbox = vercel({
    runtime: 'node'
  });

  try {
    const result = await sandbox.execute(`
      console.log('Next.js + ComputeSDK example!');
      console.log('Node version:', process.version);
    `);

    res.status(200).json({
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    await sandbox.kill();
  }
}
```
Tip: This pattern is ideal for running user-provided code or workflows that must not run in your Next.js server environment.

#### Filesystem Example in an API Route
You can work with files in the sandbox, totally isolated from your Next.js server:

```typescript
// pages/api/filesystem-demo.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { vercel } from '@computesdk/vercel';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sandbox = vercel();

  try {
    // Write a file in the sandbox
    await sandbox.filesystem.writeFile('/data/message.txt', 'Hello from Next.js!');
    
    // Read it back using code execution
    const result = await sandbox.execute(`
      const fs = require('fs');
      console.log(fs.readFileSync('/data/message.txt', 'utf8'));
    `);
    
    // Or directly read the file from the exposed API
    const content = await sandbox.filesystem.readFile('/data/message.txt');
    
    res.status(200).json({
      messagePrinted: result.stdout.trim(),
      directFileRead: content
    });
  } finally {
    await sandbox.kill();
  }
}
```

### Recommended Patterns
Execute on the Server: ComputeSDK cannot (and should not) run in the browser—only import and use it in server code.

Use API Routes: Call ComputeSDK from /api endpoints—your frontend talks to the API endpoint, which invokes sandboxes as needed.

Error Handling: Propagate errors clearly to the client; handle e.g. timeouts, authentication errors from ComputeSDK.

Kill sandboxes: Call .kill() after use to free up resources.

### Example: Call from the Frontend
You may call your API route from a React component:

```typescript
// components/RunCodeButton.tsx

export function RunCodeButton() {
  const runSandbox = async () => {
    const resp = await fetch('/api/sandbox-example');
    const data = await resp.json();
    alert('Output:\n' + data.stdout);
  };

  return (
    <button onClick={runSandbox}>
      Run code in sandbox
    </button>
  );
}
```

### Provider Auto-detection
You can also use ComputeSDK's auto-detection in Next.js API routes:

```typescript
import { ComputeSDK } from 'computesdk';

const sandbox = ComputeSDK.createSandbox({ runtime: 'python' });
const result = await sandbox.execute('print("Hello from Python sandbox!")');
```

ComputeSDK will select the first configured/available provider based on environment variables.

### Deployment Notes
If deploying to Vercel, make sure the needed environment variables are set in your Vercel Dashboard.

Use secrets management—never store provider keys in code.

Each provider has its own sandbox compute and storage quotas.

### Troubleshooting
Running in the browser?: Not supported—use on the server (API routes only).

Env variables not loaded?: Use .env.local, and restart dev server after changes.

Permissions/capabilities vary between providers. See Provider Support Matrix.

You’re ready to build secure, scalable LLM-driven or compute-heavy features with ComputeSDK in your Next.js apps!