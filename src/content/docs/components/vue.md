---
title: Vue
description: ComputeSDK for Vue
sidebar:
    order: 2
---

### ComputeSDK + Vue.js Integration Guide
ComputeSDK enables you to execute code and perform filesystem operations in secure, isolated sandboxes using various cloud providers. For Vue.js, all ComputeSDK logic must execute on the server (Node.js)—not in client-side Vue code. This keeps provider credentials secure and leverages server resources for code execution.

#### Key Principles
Server-Only ComputeSDK: Never import or use ComputeSDK in client-side (browser) Vue code.

API-Driven Integration: Use Vue components to interact (via fetch/AJAX) with backend API endpoints that invoke ComputeSDK logic.

Environment Variables: Store your provider credentials (e.g., API keys) securely in your backend.

#### Installation
Install the core SDK and required provider(s):

```bash
npm install computesdk
npm install @computesdk/vercel      # For Vercel provider
npm install @computesdk/e2b         # For E2B provider, etc.
```

#### Backend API Example (Node/Express, Vite, or Vercel/Nuxt server)
Create an API endpoint (e.g., /api/run-code) that uses ComputeSDK to execute code.

```typescript
// server/api/run-code.ts (e.g., Express.js or Vite backend)
import { vercel } from '@computesdk/vercel';
import express from 'express';

const router = express.Router();

router.post('/run-code', async (req, res) => {
  const { code, runtime } = req.body;
  const sandbox = vercel({ runtime: runtime || 'node' });

  try {
    const result = await sandbox.execute(code);
    res.json({ ok: true, stdout: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  } finally {
    await sandbox.kill();
  }
});

export default router;
```
You can also use serverless functions or Nuxt/Nuxt3 server routes as your API controller.

#### Vue Component Example (Composition API)
Use your Vue component to POST code to the backend and display the results:

```vue
<script setup lang="ts">
import { ref } from 'vue';

const code = ref(`console.log('Hello from Vue + ComputeSDK!')`);
const output = ref('');
const loading = ref(false);

async function runSandbox() {
  loading.value = true;
  output.value = '';
  try {
    const response = await fetch('/api/run-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code.value,
        runtime: 'node'
      })
    });
    const data = await response.json();
    output.value = data.ok ? data.stdout : ('Error: ' + data.error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <textarea v-model="code" rows="6" style="width:100%"/>
    <button @click="runSandbox" :disabled="loading">
      {{ loading ? 'Running...' : 'Run Code in Sandbox' }}
    </button>
    <pre>{{ output }}</pre>
  </div>
</template>
```

#### Filesystem Operations Example
Add endpoints to perform file read/write in the sandbox (backend):

```typescript
// server/api/fs-demo.ts
import { e2b } from '@computesdk/e2b';
import express from 'express';

const router = express.Router();

router.post('/fs-demo', async (req, res) => {
  const sandbox = e2b();
  try {
    await sandbox.filesystem.writeFile('/sandbox/hello.txt', 'Hello from Vue + ComputeSDK!');
    const code = `
with open('/sandbox/hello.txt') as f:
    print(f.read())
`;
    const result = await sandbox.execute(code, 'python');
    const directRead = await sandbox.filesystem.readFile('/sandbox/hello.txt');
    res.json({
      output: result.stdout.trim(),
      fileContent: directRead
    });
  } finally {
    await sandbox.kill();
  }
});
```
Call this endpoint from your Vue code just as in the previous example.

#### Provider Auto-detection
If you want the server to pick the best available provider based on environment variables:

```typescript
// server/api/auto-provider.ts
import { ComputeSDK } from 'computesdk';

router.post('/auto-provider', async (req, res) => {
  const { code, runtime } = req.body;
  const sandbox = ComputeSDK.createSandbox({ runtime: runtime || 'python' });
  try {
    const result = await sandbox.execute(code, runtime || 'python');
    res.json({ output: result.stdout });
  } finally {
    await sandbox.kill();
  }
});
```
### Security & Best Practices
Keep ComputeSDK and provider keys strictly on your server. Never expose them in your Vue or client bundle.

Call await sandbox.kill() after every run to free up resources.

Handle and display error statuses and messages in the UI for full transparency.

Sanitize user input to avoid unnecessary resource usage or abuse.

### Troubleshooting
Cannot call ComputeSDK from Vue: Ensure all ComputeSDK code remains server-side; Vue components must interact via HTTP endpoints.

API keys not found: Validate .env setup, server environment, and Docker/cloud configs.

Execution/Provider errors: Check provider quotas, error messages, and restart your dev server if changing environment variables.


You’re now ready to build secure, compute-enabled Vue applications powered by ComputeSDK and modern cloud sandboxes!