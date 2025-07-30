---
title: Svelte
description: ComputeSDK for Svelte
sidebar:
    order: 3
---
#### ComputeSDK + SvelteKit Integration
Bring secure, sandboxed server-side code execution to your SvelteKit apps with ComputeSDK. Use it to power AI, dynamic analytics, code execution, and more—with cloud-based sandboxes that keep your infrastructure safe.

#### Why Use ComputeSDK in SvelteKit?
Secure Execution: Run dynamic or user-supplied code in isolated cloud sandboxes, never inside your own server.

Provider Flexibility: Swap between E2B, Vercel, Cloudflare, or Fly.io sandboxes with zero code changes.

Cloud Filesystem: Perform file operations within secure sandboxes.

Easy API Calls: Expose compute capabilities via SvelteKit endpoints, and safely invoke from the frontend.

### Installation
Install the ComputeSDK core package and any provider you want (use only providers you’ll need—examples here use Vercel and E2B):

```bash
npm install computesdk
npm install @computesdk/vercel    # For Vercel
npm install @computesdk/e2b       # For E2B
```
Setting Up Environment Variables
Environment variables ensure your API credentials are not leaked to your client bundle.

Set these in your project’s .env:

```text
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id
VERCEL_PROJECT_ID=your_project_id

# OR, for E2B
E2B_API_KEY=your_e2b_api_key
```
In SvelteKit, use $env/static/private or $env/dynamic/private to access these variables on the server.

### Using ComputeSDK in SvelteKit Endpoints
ComputeSDK is server-only—use it in server routes (formerly “endpoints”), actions, or hooks. Below is a simple server function that executes a Node.js script inside a Vercel sandbox.

Example: /src/routes/api/sandbox-example/+server.ts
```typescript
// src/routes/api/sandbox-example/+server.ts
import { json } from '@sveltejs/kit';
import { vercel } from '@computesdk/vercel';

export async function GET() {
  const sandbox = vercel({ runtime: 'node' });
  try {
    const result = await sandbox.execute(`
      console.log('Hello from SvelteKit + ComputeSDK!');
      console.log('Node version:', process.version);
    `);
    return json({
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr
    });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  } finally {
    await sandbox.kill();
  }
}
```
### Filesystem Example
Reading/writing files in the sandbox is easy, and keeps operations isolated:

```typescript
// src/routes/api/fs-demo/+server.ts
import { json } from '@sveltejs/kit';
import { e2b } from '@computesdk/e2b';

export async function POST() {
  const sandbox = e2b();
  try {
    // Write a file
    await sandbox.filesystem.writeFile('/sandbox/hello.txt', 'Hello from SvelteKit!');

    // Execute Python that reads that file
    const code = `
with open('/sandbox/hello.txt') as f:
    print(f.read())
`;
    const result = await sandbox.execute(code, 'python');

    // Or read directly
    const fileContent = await sandbox.filesystem.readFile('/sandbox/hello.txt');

    return json({
      printed: result.stdout.trim(),
      direct: fileContent
    });
  } finally {
    await sandbox.kill();
  }
}
```
### Calling From the Svelte Frontend
Your UI fetches results from these endpoints:

```typescript
<script lang="ts">
  let output = '';

  async function runSandbox() {
    const res = await fetch('/api/sandbox-example');
    const data = await res.json();
    if (data.ok) {
      output = data.stdout;
    } else {
      output = 'Error: ' + data.error;
    }
  }
</script>

<button on:click={runSandbox}>
  Run sandbox code
</button>
<pre>{output}</pre>
```
### Auto-detection (Provider Agnostic)
Optionally, let ComputeSDK automatically choose any available provider (great for universal deployments):

```typescript
// src/routes/api/auto-provider/+server.ts
import { json } from '@sveltejs/kit';
import { ComputeSDK } from 'computesdk';

export async function GET() {
  const sandbox = ComputeSDK.createSandbox({ runtime: 'python' });
  const result = await sandbox.execute('print("Provider auto-detected!")');
  await sandbox.kill();
  return json({ out: result.stdout });
}
```
### Production & Security Notes
Server-only: Do NOT use ComputeSDK in Svelte components or load functions that run in the browser. Use it ONLY in endpoints or “server” code.

Secrets: Always keep API keys in .env or managed through your host’s environment dashboard—never expose to client code.

Resource cleanup: Always call await sandbox.kill() after running jobs.

Providers have quotas and runtime limits—see Provider Status for specifics.

### Troubleshooting
Error: API keys not found: Double-check your .env variables and server restart.

Provider error: Ensure you’ve installed and configured the correct provider package and keys.

Not working on client?: ComputeSDK is not intended for use in browser code, only in server endpoints.

You’re now ready to power up your SvelteKit backend with secure, cloud-based compute sandboxes—perfect for building dynamic, AI-assisted, or compute-intensive features in Svelte!