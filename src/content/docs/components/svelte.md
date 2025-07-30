---
title: Svelte
description: ComputeSDK for Svelte
sidebar:
    order: 3
---

### ComputeSDK + Svelte: Component Integration
ComputeSDK brings multi-cloud, secure sandboxed code execution and filesystem operations to your Svelte apps. By pairing Svelte components with backend endpoints powered by ComputeSDK, you can create dynamic, compute-rich user experiences without exposing secrets or breaking client/server boundaries.

#### Key Principles
Server-only execution: All ComputeSDK usage must remain on the backend (Node.js/SvelteKit endpoints, server routes, or serverless functions). Do not import ComputeSDK or provider modules in Svelte client code.

Component-driven UX: Svelte components interact with backend ComputeSDK endpoints via HTTP (fetch/AJAX) to trigger compute tasks and retrieve results.

Type safety: Full support for TypeScript in both backend and component layers.

#### Install ComputeSDK and Providers
```bash
npm install computesdk
npm install @computesdk/vercel      # For Vercel provider
npm install @computesdk/e2b         # For E2B provider (optional)
2. Environment Variable Setup
Set provider credentials in your .env file (never commit these):

text
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id
VERCEL_PROJECT_ID=your_project_id

# or for E2B
E2B_API_KEY=your_e2b_api_key
```
In SvelteKit, access secrets securely using $env/static/private or $env/dynamic/private.

#### Create a Compute Endpoint (Server Route)
Define a SvelteKit server route (or use Express if not using SvelteKit) for compute operations.

```typescript
// src/routes/api/run-sandbox/+server.ts
import { json } from '@sveltejs/kit';
import { vercel } from '@computesdk/vercel';

export async function POST({ request }) {
  const { code, runtime } = await request.json();
  const sandbox = vercel({ runtime: runtime || 'node' });
  try {
    const result = await sandbox.execute(code);
    return json({ ok: true, stdout: result.stdout, stderr: result.stderr });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  } finally {
    await sandbox.kill();
  }
}
```
#### Svelte Component: Dynamic Code Runner
Your Svelte component interacts exclusively with the backend endpoint.

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  let code = `console.log('Hello from ComputeSDK and Svelte!')`;
  let output = '';
  let loading = false;

  async function runCode() {
    loading = true;
    output = '';
    try {
      const res = await fetch('/api/run-sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, runtime: 'node' })
      });
      const data = await res.json();
      output = data.ok ? data.stdout : 'Error: ' + data.error;
    } finally {
      loading = false;
    }
  }
</script>

<textarea bind:value={code} rows="6" style="width:100%" />
<button on:click={runCode} disabled={loading}>
  {loading ? 'Running…' : 'Run Code in Sandbox'}
</button>
<pre>{output}</pre>
```
#### Filesystem Example with Svelte UI
```typescript
// src/routes/api/fs-demo/+server.ts
import { json } from '@sveltejs/kit';
import { e2b } from '@computesdk/e2b';

export async function POST() {
  const sandbox = e2b();
  try {
    await sandbox.filesystem.writeFile('/sandbox/hello.txt', 'Hello from Svelte!');
    const code = `
with open('/sandbox/hello.txt') as f:
    print(f.read())
`;
    const result = await sandbox.execute(code, 'python');
    const fileContent = await sandbox.filesystem.readFile('/sandbox/hello.txt');
    return json({ output: result.stdout.trim(), fileContent });
  } finally {
    await sandbox.kill();
  }
}
```
#### Svelte component to use this endpoint:
```svelte
<script lang="ts">
  import { ref } from 'svelte';

  let output = '';
  let loading = false;

  async function fetchFileDemo() {
    loading = true;
    output = '';
    const res = await fetch('/api/fs-demo', { method: 'POST' });
    const data = await res.json();
    output = `Printed: ${data.output}\nRead: ${data.fileContent}`;
    loading = false;
  }
</script>

<button on:click={fetchFileDemo} disabled={loading}>
  {loading ? 'Working…' : 'Demo Filesystem'}
</button>
<pre>{output}</pre>
```
#### Provider Auto-detection Pattern
Your server endpoints may let ComputeSDK auto-select the best available provider:
```typescript
// src/routes/api/auto-provider/+server.ts
import { json } from '@sveltejs/kit';
import { ComputeSDK } from 'computesdk';
export async function POST({ request }) {
  const { code, runtime } = await request.json();
  const sandbox = ComputeSDK.createSandbox({ runtime: runtime || 'python' });
  try {
    const result = await sandbox.execute(code, runtime || 'python');
    return json({ out: result.stdout });
  } finally {
    await sandbox.kill();
  }
}
```
#### Security and Best Practices
Never import ComputeSDK in Svelte client code.

Never expose API credentials.

Handle errors and propagate messages for debugging.

Sanitize all user code before executing to prevent resource abuse.

Call await sandbox.kill() after each execution to free resources.

#### Troubleshooting
Errors or missing output: Check server logs and endpoint code; ensure API keys are loaded and correct.

Provider/package not found: Check dependencies and environment.

Does not work in client code: ComputeSDK is server-only; endpoints are the only method of integration.


You now have a secure, best-practice pattern for using ComputeSDK-powered compute and filesystem features in reusable Svelte components—unlocking dynamic workflows, AI, analytics, and much more!