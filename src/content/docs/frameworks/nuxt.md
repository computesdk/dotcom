---
title: Nuxt
description: ComputeSDK for Nuxt
sidebar:
    order: 2
---

#### ComputeSDK + Nuxt.js Integration
Use ComputeSDK in your Nuxt backend to run secure, sandboxed code and perform isolated file operations on cloud providers like E2B, Vercel, and Cloudflare. This allows you to build AI-powered, code-executing, or analytics-heavy features in your Nuxt app—without managing your own isolated runtime infrastructure.

#### Why Use ComputeSDK in Nuxt.js?
Secure code execution: Run user-provided code without risking your Nuxt server.

Provider flexibility: Plug into E2B, Vercel, Cloudflare, or Fly.io without code changes.

Consistent developer experience: Type-safe, promise-based, and easy to use with TypeScript/Nuxt 3.

Portable logic: Filesystem operations (“/tmp”, etc.) run in the cloud sandbox, not on your server.

### Installation
Install ComputeSDK core, plus your desired providers:

```bash
npm install computesdk
# For Vercel compute sandboxes:
npm install @computesdk/vercel
# For E2B compute sandboxes:
npm install @computesdk/e2b
Configuring Environment Variables
Set your provider keys in a .env file at the root of your Nuxt project.

<details> <summary>Example: Vercel Provider</summary>
text
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id
VERCEL_PROJECT_ID=your_project_id
</details> <details> <summary>Example: E2B Provider</summary>
text
E2B_API_KEY=your_e2b_api_key
</details>
```
Nuxt 3 loads these via runtimeConfig, and they’re available in server context.

### Basic Usage in Nuxt Server Routes
Use ComputeSDK in your server endpoints for backend-only execution.

Example: /server/api/sandbox-example.ts
```typescript
// server/api/sandbox-example.ts

import { defineEventHandler } from 'h3'
import { vercel } from '@computesdk/vercel' // or e2b, cloudflare...

export default defineEventHandler(async (event) => {
  const sandbox = vercel({ runtime: 'node' }); // pick your runtime

  try {
    const result = await sandbox.execute(`
      console.log('Hello from Nuxt + ComputeSDK!');
      console.log('Node.js version:', process.version);
    `);

    return {
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }
  } finally {
    await sandbox.kill();
  }
});
```
Tip: All server/api handlers in Nuxt 3 are run exclusively on the server, so keys are never exposed to the client.

Filesystem Example
This demonstrates cloud sandbox file operations in a Nuxt server endpoint.

```typescript
// server/api/filesystem-demo.ts

import { defineEventHandler } from 'h3'
import { e2b } from '@computesdk/e2b'

export default defineEventHandler(async () => {
  const sandbox = e2b();

  try {
    await sandbox.filesystem.writeFile('/workspace/message.txt', 'Hello from Nuxt!');

    const aboveCode = `
with open('/workspace/message.txt') as f:
    print('Read from sandbox:', f.read())
    `;

    const result = await sandbox.execute(aboveCode, 'python');
    const directRead = await sandbox.filesystem.readFile('/workspace/message.txt');

    return {
      consolePrint: result.stdout,
      fileDirect: directRead
    }
  } finally {
    await sandbox.kill();
  }
});
```
### Using ComputeSDK with Nuxt’s Composables and Actions
You can wrap ComputeSDK logic in composables for use in server-side actions or composable utilities.

```typescript
// composables/useSandbox.ts

import { vercel } from '@computesdk/vercel'

export const useSandbox = () => {
  return vercel({ runtime: 'node' });
};
```

Then use in your server routes or actions:

```typescript
// server/api/run-code.ts

import { defineEventHandler } from 'h3'
import { useSandbox } from '~/composables/useSandbox'

export default defineEventHandler(async (event) => {
  const sandbox = useSandbox();

  const result = await sandbox.execute(`
    console.log('Dynamic code in Nuxt via ComputeSDK!');
    `);

  await sandbox.kill();

  return { output: result.stdout };
});
```
### Calling From the Client
Your app’s frontend or Vue components call these server routes normally:

```html
<script setup lang="ts">
async function runSandbox() {
  const resp = await $fetch('/api/sandbox-example')
  alert(`Output:\n${resp.stdout}`)
}
</script>

<template>
  <button @click="runSandbox">Run Cloud Sandbox</button>
</template>
```
### Provider Auto-detection
Let ComputeSDK pick the best provider based on your configured environment:

```typescript
// server/api/auto-provider.ts
import { defineEventHandler } from 'h3'
import { ComputeSDK } from 'computesdk'

export default defineEventHandler(async () => {
  const sandbox = ComputeSDK.createSandbox({ runtime: 'python' });
  const result = await sandbox.execute('print("Run from Nuxt, auto-detected provider")', 'python');
  await sandbox.kill();
  return { output: result.stdout };
});
```

### Deployment Notes
Set secrets in platform-native ways (e.g., Vercel/Netlify/Render, etc. dashboard).

Never expose your provider credentials to the browser.

Allocate sandbox resources and timeouts based on your provider limits.

### Troubleshooting
Cannot import in client code: ComputeSDK is server-only; always use on backend/server routes.

Keys not loading?: Make sure .env keys match environment variable names, and restart dev server if you change them.

See provider docs for limits and capabilities.

You’re now ready to build dynamic, compute-powered features in your Nuxt.js backend with ComputeSDK!