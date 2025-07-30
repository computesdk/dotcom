---
title: React
description: ComputeSDK for React
sidebar:
    order: 1
---

#### ComputeSDK + React.js: Component Usage Guide
ComputeSDK enables seamless code execution and filesystem operations in isolated sandboxes across multiple cloud providers, making it ideal for powering dynamic React applications that need to run computation-heavy, code, or AI workflows securely.

### Key Principles
All ComputeSDK code must run on the server. Never import uses of ComputeSDK (or include its provider keys) into browser/client bundles.

React components interact with ComputeSDK via API endpoints. Build components that fetch data/results from your Node.js backend which invokes the ComputeSDK.

Provider credentials (API keys, tokens) live in your backend environment variables.

### Example Architecture
Backend: API endpoints (e.g., Express, Next.js API routes, or any Node server) handle ComputeSDK calls.

Frontend: React UI components fetch results or trigger operations via HTTP requests to these endpoints.

#### Step 1: Install ComputeSDK and Providers
```bash
npm install computesdk
npm install @computesdk/vercel      # For Vercel provider
npm install @computesdk/e2b         # For E2B provider, etc.
```

#### Step 2: Configure Environment Variables
Set your sandbox provider credentials securely in your backend’s environment:

```text
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id
VERCEL_PROJECT_ID=your_project_id

# Or, for E2B
E2B_API_KEY=your_e2b_api_key
```

#### Step 3: Build a Backend API Endpoint
Example: An Express.js route that runs code using ComputeSDK:

```typescript
// server/routes/sandboxExample.ts
import express from 'express';
import { vercel } from '@computesdk/vercel';

const router = express.Router();

router.post('/run-sandbox', async (req, res) => {
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

#### Step 4: Use ComputeSDK API from React Components
Your React components interact with the backend—never directly with ComputeSDK or its keys.

Example: A “Run Code” Component
```jsx
import { useState } from 'react';

export function RunSandboxCode() {
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRun() {
    setLoading(true);
    setOutput('');
    const response = await fetch('/api/run-sandbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code: `console.log("Hello from ComputeSDK in React!");`, 
        runtime: 'node' // or 'python'
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (data.ok) setOutput(data.stdout);
    else setOutput('Error: ' + data.error);
  }

  return (
    <div>
      <button onClick={handleRun} disabled={loading}>
        {loading ? 'Running...' : 'Run Sandbox Code'}
      </button>
      <pre>{output}</pre>
    </div>
  );
}
```

#### Step 5: Filesystem and Advanced Operations
You can enable advanced UI features (like file upload, code editing, etc.) by routing those capabilities through API endpoints that use ComputeSDK’s sandox.filesystem methods.

Example: Save and read a file in a sandbox
React component sends file content to /api/save-file.

API endpoint receives content, uses sandbox.filesystem.writeFile/readFile, and returns result.

### Security and Best Practices
Never expose ComputeSDK or provider packages in your React (browser) bundle.

Always kill sandboxes after use.

Propagate and display errors clearly in the React UI for user feedback and debugging.

Sanitize all user input before executing it in a sandbox.

### Summary
All access to ComputeSDK should occur on the server, with React components acting as smart clients via API.

React enables dynamic UIs powered by secure, ephemeral compute on any provider supported by ComputeSDK.

This model is compatible with any React setup (CRA, Vite, Next.js, etc.), as long as all ComputeSDK operations are backend-only.

You now have a secure foundation for building dynamic, compute-powered React components, using ComputeSDK as your safe, multi-provider code execution and virtual filesystem layer!