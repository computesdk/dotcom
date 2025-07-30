---
title: Astro
description: ComputeSDK for Astro
sidebar:
    order: 4
---

### ComputeSDK + Astro Integration
Easily add secure, cloud-sandboxed code execution and filesystem operations to your Astro site backends using ComputeSDK. This is perfect for building AI, analytics, data-processing tools, and dynamic features while keeping your infrastructure secure.

#### Why Use ComputeSDK with Astro?
Isolated Cloud Execution: Run untrusted or dynamic code in secure sandboxes, never directly on your Astro server.

Multi-provider Support: Swap between E2B, Vercel, Cloudflare, etc., with minimal code changes.

Virtual Filesystem: Perform file read/write in the sandbox; data never touches your website host.

Server-first Model: Leverage Astro’s API endpoints for all compute and file tasks.

#### Installation
Install the core SDK and whichever providers you’ll use:

```bash
npm install computesdk
npm install @computesdk/vercel    # For Vercel
npm install @computesdk/e2b       # For E2B
```

#### Environment Setup
Set your provider API credentials in an .env file at your project root:

```text
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id
VERCEL_PROJECT_ID=your_project_id

# Or for E2B
E2B_API_KEY=your_e2b_api_key
```
Important: Never commit or expose these secrets—Astro server endpoints access them via import.meta.env.

#### Using ComputeSDK in Astro Endpoints
Astro endpoints (in src/pages/api/) are used for all server-side logic. Here’s how to build a basic endpoint:

Example: /src/pages/api/sandbox-example.ts
```typescript
// src/pages/api/sandbox-example.ts
import type { APIRoute } from 'astro';
import { vercel } from '@computesdk/vercel';

export const GET: APIRoute = async () => {
  const sandbox = vercel({ runtime: 'node' });
  try {
    const result = await sandbox.execute(`
      console.log('Hello from Astro + ComputeSDK!');
      console.log('Node version:', process.version);
    `);
    return new Response(JSON.stringify({
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
    }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }), { status: 500 });
  } finally {
    await sandbox.kill();
  }
};
```

#### Filesystem Example
Read and write files entirely in the sandbox filesystem, isolated from your deployment:

```typescript
// src/pages/api/fs-demo.ts
import type { APIRoute } from 'astro';
import { e2b } from '@computesdk/e2b';

export const POST: APIRoute = async () => {
  const sandbox = e2b();
  try {
    await sandbox.filesystem.writeFile('/sandbox/greet.txt', 'Hello from Astro!');
    const code = `
with open('/sandbox/greet.txt') as f:
    print(f.read())
`;
    const result = await sandbox.execute(code, 'python');
    const direct = await sandbox.filesystem.readFile('/sandbox/greet.txt');
    return new Response(JSON.stringify({
      printed: result.stdout.trim(),
      direct
    }), { status: 200 });
  } finally {
    await sandbox.kill();
  }
};
```
#### Calling Compute Endpoints from Astro UI
Call your API endpoints from your Astro or integrated UI components (React, Svelte, Vue, Solid, etc.)—here’s a plain Astro example:

```text
---
let output = "";

async function runSandbox() {
  const res = await fetch('/api/sandbox-example');
  const data = await res.json();
  output = data.ok ? data.stdout : ('Error: ' + data.error);
}
---

<button onClick={runSandbox}>
  Run sandbox code
</button>
<pre>{output}</pre>
```

#### Auto-detecting Provider
You may let ComputeSDK auto-select a configured provider:

```typescript
// src/pages/api/auto-provider.ts
import type { APIRoute } from 'astro';
import { ComputeSDK } from 'computesdk';

export const GET: APIRoute = async () => {
  const sandbox = ComputeSDK.createSandbox({ runtime: 'python' });
  const result = await sandbox.execute('print("Astro - Provider auto-detected!")');
  await sandbox.kill();
  return new Response(JSON.stringify({ out: result.stdout }));
};
```

#### Deployment & Security
Do NOT use ComputeSDK in browser/client code—only in server-only API endpoints.

Secrets should be managed through Astro’s environment variables and NEVER exposed publicly.

Always call .kill() to clean up sandbox resources.

Each provider has its own limits—see the provider status in the ComputeSDK docs.

#### Troubleshooting
Cannot import in Astro components? Only use in /api/ endpoints or SSR code.

Secrets not loaded? Check .env values and rebuild/restart your server.

Provider errors? Install the right provider package and check credentials.


You’re now ready to build secure, compute-powered features in Astro with ComputeSDK sandboxes!