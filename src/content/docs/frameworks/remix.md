---
title: Remix
description: ComputeSDK for Remix
sidebar:
    order: 5
---

### ComputeSDK + Remix Integration
Use ComputeSDK in your Remix apps to run secure, isolated code execution and filesystem operations within cloud sandboxes. This is ideal for dynamic backend workflows such as AI-powered compute, user code execution, or data processing—all abstracted via a consistent API that supports multiple cloud providers.

#### Why Use ComputeSDK in Remix?
Secure sandboxed execution: Run untrusted or complex code away from your Remix server environment.

Multi-provider support: Easily switch between E2B, Vercel, Cloudflare, Fly.io sandboxes.

Filesystem isolation: Perform file operations inside cloud sandboxes, avoiding server contamination.

Type-safe and modular: Use with TypeScript and install only providers you need.

Fits Remix's server-centric architecture: Integrates cleanly into Remix loaders, actions, or API routes.

#### Installation
Install the ComputeSDK core and relevant provider packages:

```bash
npm install computesdk

# For example, Vercel provider (works well if hosting Remix on Vercel)
npm install @computesdk/vercel

# Or E2B provider for general-purpose sandboxing
npm install @computesdk/e2b
```

#### Environment Variables Setup
Configure your provider API credentials in environment variables. Add them to .env (or your platform's environment settings):

Vercel Provider
```text
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id
VERCEL_PROJECT_ID=your_project_id
```
E2B Provider
```text
E2B_API_KEY=your_e2b_api_key
```
Restart your Remix server after adding or changing environment variables to ensure they are properly loaded.

Using ComputeSDK in Remix Loaders and Actions
ComputeSDK is intended for server-side use only. Use it inside Remix loader functions, form actions, or API routes to execute code securely in sandboxes.

Example: Using ComputeSDK in a Loader
```typescript
// routes/api/sandbox-example.ts
import type { LoaderFunction } from '@remix-run/node';
import { vercel } from '@computesdk/vercel';

export const loader: LoaderFunction = async () => {
  const sandbox = vercel({ runtime: 'node' });

  try {
    const result = await sandbox.execute(`
      console.log('Hello from Remix + ComputeSDK!');
      console.log('Node.js runtime version:', process.version);
    `);

    return new Response(
      JSON.stringify({
        ok: true,
        stdout: result.stdout,
        stderr: result.stderr,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );

  } finally {
    await sandbox.kill();
  }
};

#### Filesystem Operations Example
You can read, write, and manage files within the sandbox filesystem during your Loaders or Actions:

```typescript
// routes/api/fs-demo.ts
import type { LoaderFunction } from '@remix-run/node';
import { e2b } from '@computesdk/e2b';

export const loader: LoaderFunction = async () => {
  const sandbox = e2b();

  try {
    await sandbox.filesystem.writeFile('/data/message.txt', 'Hello from Remix sandbox!');

    const result = await sandbox.execute(`
      const fs = require('fs');
      const content = fs.readFileSync('/data/message.txt', 'utf-8');
      console.log('File content:', content);
    `);

    const directContent = await sandbox.filesystem.readFile('/data/message.txt');

    return new Response(
      JSON.stringify({
        printed: result.stdout.trim(),
        directRead: directContent,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } finally {
    await sandbox.kill();
  }
};
```
#### Calling Sandbox Endpoints from Remix UI
Fetch the results from your Sandbox API loader or action from your React components using Remix data hooks or native fetch:

```tsx
import { useEffect, useState } from 'react';

export default function SandboxOutput() {
  const [output, setOutput] = useState<string>('');

  useEffect(() => {
    fetch('/api/sandbox-example')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setOutput(data.stdout);
        else setOutput('Error: ' + data.error);
      });
  }, []);

  return (
    <div>
      <h2>Sandbox Output</h2>
      <pre>{output}</pre>
    </div>
  );
}
```

#### Provider Auto-detection
Use ComputeSDK’s auto-detection to select an available provider based on your environment variables:

```typescript
import { ComputeSDK } from 'computesdk';
import type { LoaderFunction } from '@remix-run/node';

export const loader: LoaderFunction = async () => {
  const sandbox = ComputeSDK.createSandbox({ runtime: 'python' });
  try {
    const result = await sandbox.execute('print("Hello from auto-detected provider!")');
    return new Response(JSON.stringify({ output: result.stdout }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await sandbox.kill();
  }
};
```

#### Best Practices
Server-only usage: Never import or use ComputeSDK in client-side code.

Always kill sandboxes: Call await sandbox.kill() to free resources.

Error handling: Catch and respond to execution, timeout, or authentication errors properly in your loaders/actions.

Secure environment variables: Store API keys securely and do not expose them to the client.

Provider limits: Be aware of provider-specific rate limits and timeout settings.

#### Troubleshooting
Sandbox not executing code: Verify environment variables and provider package installation.

API keys missing: Ensure .env entries are correct and environment is refreshed.

Errors in loaders/actions: Check server logs and error messages for detailed insights.

You now have everything required to run secure, multi-provider sandboxed compute operations inside your Remix apps with ComputeSDK!
