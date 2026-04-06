---
title: "How to run a Runloop sandbox"
description: "A step-by-step process for creating a sandbox with Runloop, running a basic Vite app inside, and accessing it securely via the browser."
date: "2026-04-12"
tags: [how-to, sandboxes, runloop]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: false
---

Runloop is a cloud platform for running secure, isolated development environments. It provides instant devboxes with full Linux environments, enabling AI coding agents and developers to execute code, run tests, and build applications in sandboxed containers.
Let's walk through the process of getting a basic application running inside a Runloop sandbox.

## Why use Runloop as your sandbox provider?

- Runloop provides secure, isolated devbox environments with full Linux capabilities.
- They offer fast provisioning and robust security boundaries ideal for AI-assisted development.
- Runloop's infrastructure is purpose-built for running code in sandboxed containers at scale.

**Let's see how we can easily run a basic Vite app inside of a Runloop sandbox.**

## Let's start by creating a new Next.js project

Run this command in your terminal:

```bash
npx create-next-app@latest basic-runloop-sandbox
```

You can use all of the defaults when prompted.

### Create an .env file
Once it has been created, be sure to create an `.env` file to add your necessary credentials to.

```bash
COMPUTESDK_API_KEY=your_computesdk_api_key

RUNLOOP_API_KEY=your_runloop_api_key
```

### Install the ComputeSDK package

```bash
npm install computesdk
```

## Create or log in to your Runloop account
<!-- markdownlint-disable-next-line MD033 -->
Create a Runloop account or log in <a href="https://runloop.ai" target="_blank">here</a>.\
Once you have created an account, you'll need to get your Runloop API key.\
Go to "Settings" and generate an API key.

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 24px auto; border-radius: 10px;" width="700px" src="/blog/runloop/runloop-api-key-ui.png" alt="screenshot of Runloops's API key management interface" title="Runloop settings page" />

Save your API key in your `.env` file to the `RUNLOOP_API_KEY` variable.

```bash
RUNLOOP_API_KEY=your_runloop_api_key
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

ComputeSDK makes this easy. To create a sandbox with any provider just import the basic `computesdk` package.\
Use compute.sandbox.create() to create a sandbox. ComputeSDK auto-detects your sandbox provider variables from your .env file

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { compute } from 'computesdk';

export async function POST() {

  const sandbox = await compute.sandbox.create();

  return NextResponse.json({
    sandboxId: sandbox.sandboxId,
  });
}
```

### Next, we'll edit the page.tsx file

We'll keep it simple and just add one button to run our sandbox test with.\
Paste this code into Page.tsx

```typescript
// app/page.tsx
'use client';

export default function Home() {
  const createSandbox = async () => {
    const res = await fetch('/api/sandbox', { method: 'POST' });
    const data = await res.json();
    console.log(data);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-8 text-4xl font-bold">ComputeSDK Sandbox Test</h1>
      <button
        className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
        type="button"
        onClick={createSandbox}
      >
        Create Runloop sandbox
      </button>
    </div>
  );
}
```

### Now, our first test

Click the button on the main page.
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="500px" src="/blog/create-sandbox-button-ui.png" alt="screenshot of next.js app button" title="sandbox test button" />

Then check your Runloop dashboard.\
You should see a new sandbox created!
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="800px" src="/blog/runloop/runloop-sandbox-list-ui.png" alt="screenshot of Runloop sandbox list UI" title="Runloop devboxes list" />

Success!

## You've successfully created your first Runloop sandbox

You can view more details about your active sandbox by clicking it in Runloop's UI.
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="600px" src="/blog/runloop/runloop-sandbox-ui.png" alt="screenshot of Runloop sandbox UI" title="Runloop devboxes UI" />

If you want to use another sandbox provider like E2B or Vercel, all you need to do is change your provider variable from `RUNLOOP_API_KEY=xxxxx` to `E2B_API_KEY=xxxxx`. ComputeSDK automatically detects your sandbox provider from your environment variables.

## Making changes within the sandbox

Now, let's take the next step and run a primitive Vite app inside of our sandbox as an example of what we are able to do within the sandbox itself.

### Update /api/sandbox/route.ts

Add the following to your `route.ts` file directly below this in your code:

```typescript
const sandbox = await compute.sandbox.create();
```

#### Create a basic Vite app inside our sandbox subfolder

```typescript
// Scaffold Vite React app
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
      allowedHosts: ['.runloop.ai', 'localhost', '127.0.0.1', '.computesdk.com'],
    },
  })
  `;
  await sandbox.filesystem.writeFile('app/vite.config.js', viteConfig);
```

#### Run npm install using the runCommand method

```typescript
  // Install dependencies
  await sandbox.runCommand('npm install', {
    cwd: 'app',
  })
```

#### Start local dev server in the background with runCommand

```typescript
  // Start dev server
  sandbox.runCommand('npm run dev', {
    cwd: 'app',
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
  return NextResponse.json({
    sandboxId: sandbox.sandboxId,
    url,
  });
```

#### Finished route.ts file

Your `/app/api/sandbox/route.ts` file should look like this now:

```typescript
import { NextResponse } from 'next/server';
import { compute } from 'computesdk';

export async function POST() {

  const sandbox = await compute.sandbox.create();

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
      allowedHosts: ['.runloop.ai', 'localhost', '127.0.0.1', '.computesdk.com'],
    },
  })
  `;
  await sandbox.filesystem.writeFile('app/vite.config.js', viteConfig);

  // Install dependencies
  await sandbox.runCommand('npm install', {
    cwd: 'app',
  })

  // Start dev server
  sandbox.runCommand('npm run dev', {
    cwd: 'app',
  });

  // Get preview URL
  const url = await sandbox.getUrl({ port: 5173 });
  console.log('previewUrl:', url)

  return NextResponse.json({
    sandboxId: sandbox.sandboxId,
    url,
  });
}
```

## Testing Vite app inside sandbox

Now, after you click the "Create Runloop Sandbox" button on your localhost homepage you should:

1. See a new sandbox created in your Runloop dashboard.
2. See a preview URL in your terminal output like this:\
`unique-sandbox-id-5173.preview.computesdk.com`
3. Finally, if you visit that URL you should see the boilerplate Vite React app running in your Runloop sandbox!

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/sandbox-vite-app-in-browser.png" alt="screenshot of Vite app running in Runloop sandbox via ComputeSDK" title="Basic Vite App in Runloop sandbox" />

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created a Runloop sandbox with ComputeSDK
- used our runCommand, writeFile, and getUrl methods (these work with any provider)
- ran a Vite app inside the sandbox
- accessed the app running within the sandbox through our secure tunnel

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code in Runloop, you can easily adjust this code to run in any sandbox provider.

**Happy Sandboxing!**

<!-- markdownlint-disable-next-line MD033 -->
<a href="https://console.computesdk.com/register" target="_blank" style="display: inline-block; padding: 6px 12px; background-color: #10b981; color: white; font-weight: bold; border-radius: 8px; text-decoration: none;">Register with ComputeSDK</a>

Want to get sandboxes running in your application?\
Want to be added as a provider?\
Reach out to us at [email@computesdk.com](mailto:email@computesdk.com)
