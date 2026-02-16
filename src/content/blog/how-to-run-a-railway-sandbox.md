---
title: "How to run a sandbox on Railway"
description: "A step-by-step process for creating a sandbox with Railway, running a basic Vite app inside, and accessing it securely via the browser."
date: "2026-02-08"
tags: [how-to, sandboxes, railway]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: false
---

<span style="font-size: 14px; font-style: italic;">Run locally with <a href="https://github.com/computesdk/examples/tree/main/railway-basic" target="_blank">this repo</a> or deploy with Railway or Stackblitz:</span>
<div style="display: flex; gap: 4px;">
  <a href="https://railway.com/deploy/yKLYhi?referralCode=-WK0PF&utm_medium=integration&utm_source=template&utm_campaign=generic" target="_blank">
    <img src="https://railway.com/button.svg" alt="Deploy on Railway" style="height: 32px;"/>
  </a>
  <a href="https://stackblitz.com/edit/railway-sandbox" target="_blank">
    <img src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="open in Stackblitz" />
  </a>
</div>

<br />
Railway is a popular cloud platform for spinning up infrastructure in seconds. With ComputeSDK, you can now use this infrastructure to run sandboxes.
Let's walk through the process of getting a basic Vite app running inside a Railway sandbox.

## Why use Railway as your sandbox provider?

- Railway offers instant deployments with automatic SSL and a developer-friendly experience.
- They provide a generous free tier and a beautiful dashboard for monitoring your deployments.
- Railway is perfect for teams that want self-hosted sandbox capabilities with minimal infrastructure management.

**Let's walk through how easily we can start using Railway sandboxes.**

## Let's start by creating a new Vite app

Run this command in your terminal:

```bash
npm create vite@latest railway-basic -- --template react-ts
```

### Create an .env file
Once it has been created, be sure to create an `.env` file to add your necessary credentials to.

```bash
COMPUTESDK_API_KEY=your_computesdk_api_key

RAILWAY_API_KEY=your_railway_api_key
RAILWAY_PROJECT_ID=your_railway_project_id
RAILWAY_ENVIRONMENT_ID=your_railway_environment_id
```

### Install the ComputeSDK package

```bash
npm install computesdk
```

## Create or log in to your Railway account and create a project
<!-- markdownlint-disable-next-line MD033 -->
### Create a Railway account 
Log in to or create a Railway account <a href="https://railway.app/login?ref=computesdk" target="_blank">here</a>.

### Create a new project

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/blog/railway/railway-create-project-screenshot.png" alt="screenshot of creating a new project in Railway" title="Create a new project in Railway" />

You can:
1. Use <a href="https://github.com/computesdk/examples/tree/main/railway-basic" target="_blank">this repo</a> and deploy the final version of this app
2. Deploy our <a href="https://hub.docker.com/r/computesdk/compute" target="_blank">docker image</a> (fastest for sandbox boot times)
3. Deploy an empty project

Once you have created an account, you'll need to gather several credentials:

1. **API Token**: Go to your Workspace Settings → Tokens → Create Token
2. **Project ID**: Found in your Project Settings → Project Info
3. **Environment ID**: Found in your URL when viewing a project:\
   `https://railway.com/project/{PROJECT_ID}/settings?environmentId={ENVIRONMENT_ID}`

Save these values in your `.env` file.

```bash
RAILWAY_API_KEY=your_railway_api_key
RAILWAY_PROJECT_ID=your_railway_project_id
RAILWAY_ENVIRONMENT_ID=your_railway_environment_id
```

## Create a ComputeSDK account
<!-- markdownlint-disable-next-line MD033 -->
Create an account at our <a href="https://console.computesdk.com/register" target="_blank">signup page</a>.\
Once you have created your ComputeSDK account, you'll need to generate an API key.\
Click "API Keys" in the left-hand navigation → "Create API Key"
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/compute-api-keys.png" alt="screenshot of ComputeSDK's API key management interface" title="ComputeSDK API keys page" />

Save your API key in your `.env` file to the `COMPUTESDK_API_KEY` variable.

```bash
COMPUTESDK_API_KEY=your_computesdk_api_key
```

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

ComputeSDK makes this easy, just import the basic `computesdk` package.\
ComputeSDK auto-detects your sandbox provider variables from your .env file

```typescript
// server/index.ts
import express from 'express';
import cors from 'cors';
import { compute } from 'computesdk';

const app = express();
const PORT = 8081;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.post('/api/sandbox', async (_req, res) => {
  try {
    // Create sandbox
    const sandbox = await compute.sandbox.create();
    console.log(`Sandbox created: ${sandbox.sandboxId}`);

    res.json({
      sandboxId: sandbox.sandboxId,
    });
  } catch (error) {
    console.error('Error creating sandbox:', error);
    res.status(500).json({ error: 'Failed to create sandbox' });
  }
});
```

### Next, we'll edit the App.tsx file

We'll keep it simple and just add one button to run our sandbox test with.\
Paste this code into App.tsx

```typescript
// src/page.tsx
import './App.css';

function App() {
  const createSandbox = async () => {
    const res = await fetch('/api/sandbox', { method: 'POST' });
    const data = await res.json();
    console.log(data);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-12">
      <h1 className="mb-8 text-4xl font-bold">Railway Sandbox Test</h1>
      <button
        className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
        type="button"
        onClick={createSandbox}
      >
        Create Railway sandbox
      </button>
    </div>
  );
}

export default App;
```

### Now, our first test

Click the button on the main page.
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="300px" src="/blog/railway/railway-test-sandbox-button.png" alt="screenshot of vite app button" title="sandbox test button" />

Now check your Railway dashboard. You should see a new service deployed in your project!

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="600px" src="/blog/railway/railway-deployed-service-screenshot.png" alt="screenshot of a sandbox deployed in Railway" title="deployed sandbox in Railway" />

If you see something like this, you've done it!

## You've successfully created your first Railway sandbox

This is the same process no matter what provider you use, so you can use this app to create sandboxes in any provider.\
If you want to use another sandbox provider like E2B or Modal, all you need to do is change your provider variables from `RAILWAY_API_KEY=xxxxx` to `E2B_API_KEY=xxxxx`. ComputeSDK automatically detects your sandbox provider from your environment variables.

## Making changes within the sandbox

Now, let's take the next step and run a primitive Vite app inside of our sandbox as an example of what we are able to do within the sandbox itself.

### Configuring a local dev server and API proxy

Add the following to your `index.ts` file:

```typescript
import express from 'express';
import cors from 'cors';
import WebSocket from 'ws';
import { compute } from 'computesdk';
import 'dotenv/config';

const app = express();
const PORT = 8081;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});
```

#### Update vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
});
```

### Now we can send requests to the sandbox via ComputeSDK

#### Let's create a basic Vite app inside our sandbox

```typescript
// Create basic Vite React app
await sandbox.runCommand('npm create vite@5 app -- --template react');
```

#### Use the writeFile method

Customize the `vite.config.js` so we can access the local dev server.

```typescript
// Custom vite.config.js to allow access to sandbox at port 5173
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: false,
    allowedHosts: ['.railway.app', 'localhost', '127.0.0.1', '.computesdk.com'],
  },
})
`;
  await sandbox.filesystem.writeFile('app/vite.config.js', viteConfig);
```

#### Run npm install using the runCommand method

```typescript
  // Install dependencies
  const installResult = await sandbox.runCommand('npm install', {
    cwd: 'app'
  });
```

#### Start local dev server in the background with runCommand

```typescript
  // Start dev server
  sandbox.runCommand('npm run dev', {
    cwd: 'app'
  });
```

#### Use the getUrl method to output the secure preview URL via the ComputeSDK tunnel

```typescript
  // Get preview URL
  const url = await sandbox.getUrl({ port: 5173 });
  console.log('previewUrl:', url)
```

#### Return the preview url along with the sandboxId

```typescript
  res.json({
    sandboxId: sandbox.sandboxId,
    url,
  });
```

#### Finished route.ts file

Your `/src/index.ts` file should look like this now:

```typescript
app.post('/api/sandbox', async (_req, res) => {
  try {
    // Create sandbox
    const sandbox = await compute.sandbox.create();
    console.log(`Sandbox created: ${sandbox.sandboxId}`);

    // Get sandbox info
    const info = await sandbox.getInfo();
    console.log(`Sandbox status: ${info.status}`);

    // Create basic Vite React app
    await sandbox.runCommand('npm create vite@5 app -- --template react');

    // Custom vite.config.js to allow access to sandbox at port 5173
    const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: false,
    allowedHosts: ['.railway.app', 'localhost', '127.0.0.1', '.computesdk.com'],
  },
})
`;
    await sandbox.filesystem.writeFile('app/vite.config.js', viteConfig);

    // Install dependencies
    const installResult = await sandbox.runCommand('npm install', {
      cwd: 'app'
    });
    console.log('npm install exit code:', installResult.exitCode);
    console.log('npm install stdout:', installResult.stdout);
    if (installResult.stderr)
      console.log('npm install stderr:', installResult.stderr);

    // Start dev server
    sandbox.runCommand('npm run dev', {
      cwd: 'app'
    });
    console.log('Dev server started in background');

    // Get preview URL
    const url = await sandbox.getUrl({ port: 5173 });
    console.log('previewUrl:', url);

    res.json({
      sandboxId: sandbox.sandboxId,
      url,
    });
  } catch (error) {
    console.error('Error creating sandbox:', error);
    res.status(500).json({ error: 'Failed to create sandbox' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

## Testing Vite app inside sandbox

Now, after you click the "Create Railway Sandbox" button on your localhost homepage you should:

1. See a new service deployed in your Railway project.
2. See a preview URL in your terminal output like this:\
`unique-sandbox-id-5173.preview.computesdk.com`
3. Finally, if you visit that URL you should see the boilerplate Vite React app running in your Railway sandbox!

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/sandbox-vite-app-in-browser.png" alt="screenshot of Vite app running in Railway sandbox via ComputeSDK" title="Basic Vite App in Railway sandbox" />

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created a Railway sandbox with ComputeSDK
- used our runCommand, writeFile, and getUrl methods (these work with any provider)
- ran a Vite app inside the sandbox
- accessed the app running within the sandbox through our secure tunnel

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code in Railway, you can easily adjust this code to run in any sandbox provider.

**Happy Sandboxing!**

[Sign up with ComputeSDK](https://console.computesdk.com/register)

Want to get sandboxes running in your application?\
Want to be added as a provider?\
Reach out to us at [email@computesdk.com](mailto:email@computesdk.com)
