---
title: Vanilla
description: ComputeSDK for Vanilla
sidebar:
    order: 4
---

### ComputeSDK + Vanilla JavaScript Integration Guide
Deploy secure, cloud-sandboxed compute operations and filesystem tasks with ComputeSDK in any vanilla JavaScript project. This guide uses a classic Node.js server (e.g., Express) for backend compute and a static HTML+JS frontend as your UI.

#### Key Principles
All ComputeSDK logic must run in Node.js (server-side). Never import ComputeSDK into client (browser) scripts.

Frontend interacts with ComputeSDK via HTTP API endpoints.

Provider credentials (API keys/tokens) are stored as environment vars on the server.

#### Install ComputeSDK and Provider(s)
In your Node.js server project:

```bash
npm install computesdk
npm install @computesdk/vercel     # For Vercel provider
npm install @computesdk/e2b        # Or E2B, etc.
```
#### Set Environment Variables
Add your ComputeSDK provider credentials to a .env file or host environment (never in frontend code):

```text
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id
VERCEL_PROJECT_ID=your_project_id

# Or for E2B
E2B_API_KEY=your_e2b_api_key
```
Load these using dotenv in your Node server, if desired.

#### Create Backend API Endpoints
Create an HTTP endpoint that uses ComputeSDK—for example, with Express:

```js
// server.js
const express = require('express');
const { vercel } = require('@computesdk/vercel');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

app.post('/api/run-sandbox', async (req, res) => {
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

app.listen(3000, () => {
  console.log('API server running on http://localhost:3000');
});
```
#### Simple Static Frontend
Serve a static HTML page that fetches results from your API endpoint:

```html
public/index.html:

<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>ComputeSDK + Vanilla JS Demo</title>
    <style>
      textarea { width: 100%; min-height: 80px; }
      pre { background: #fafafa; border: 1px solid #eee; padding: 1em; }
    </style>
  </head>
  <body>
    <h2>Run Cloud Sandbox Code</h2>
    <textarea id="code">// Type your JS code here
console.log("Hello from ComputeSDK!")</textarea>
    <br/>
    <button id="runBtn">Run in Sandbox</button>
    <pre id="output"></pre>

    <script>
      document.getElementById('runBtn').onclick = async function() {
        const code = document.getElementById('code').value;
        document.getElementById('output').textContent = 'Running...';

        const resp = await fetch('/api/run-sandbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code, runtime: 'node' })
        });
        const data = await resp.json();
        document.getElementById('output').textContent = data.ok
          ? data.stdout
          : 'Error: ' + data.error;
      };
    </script>
  </body>
</html>
```
Serve this static page either from your Express app or any static file server (ensure CORS is handled if not same origin).

#### Filesystem Example
To perform file operations (read/write) in a sandbox, add another API endpoint to your server:

```js
app.post('/api/fs-demo', async (req, res) => {
  const { e2b } = require('@computesdk/e2b');
  const sandbox = e2b();
  try {
    await sandbox.filesystem.writeFile('/sandbox/hello.txt', 'Hello from Vanilla JS + ComputeSDK!');
    const result = await sandbox.execute(`
with open('/sandbox/hello.txt') as f:
    print(f.read())
`, 'python');
    const fileContent = await sandbox.filesystem.readFile('/sandbox/hello.txt');
    res.json({ output: result.stdout.trim(), file: fileContent });
  } finally {
    await sandbox.kill();
  }
});
```
Call this from the frontend with a similar fetch pattern.

#### Auto-detect Provider (Optional)
For environments with multiple possible sandboxes, the server can let ComputeSDK auto-select:

```js
const { ComputeSDK } = require('computesdk');
app.post('/api/auto-provider', async (req, res) => {
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
#### Security & Best Practices
Never import ComputeSDK in the browser—server only!

Never expose sandbox provider keys to the client or bundle.

Always call sandbox.kill() after completion.

Display errors to the user and log for troubleshooting.

Sanitize user code before sending to avoid abuse.

#### Troubleshooting
API not working? Check server logs, CORS settings, and env var configuration.

Provider/auth errors? Validate provider credentials and package installation.

Cannot call from frontend? Make sure endpoints are accessible and server is running.


You now have a foundation for secure, scalable cloud-sandbox compute in any vanilla JavaScript project using ComputeSDK!