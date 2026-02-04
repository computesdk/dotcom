---
title: "How to run a sandbox on Railway"
description: "A step-by-step process for creating a sandbox with Railway, running a basic Vite app inside, and accessing it securely via the browser."
date: "2026-02-03"
tags: [how-to, sandboxes, railway]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: false
---

<span style="font-size: 14px; font-style: italic;">You can clone <a href="https://github.com/computesdk/examples/tree/main/railway-basic" target="_blank">this repo</a> and update your credentials to run locally.</span>
<br />
<span style="font-size: 14px; font-style: italic;">Or, just deploy this example with Railway or Stackblitz:</span>
<div style="display: flex; gap: 4px;">
  <a href="" target="_blank">
    <img src="https://railway.com/button.svg" alt="Deploy on Railway"/>
  </a>
  <a href="https://stackblitz.com/edit/railway-sandbox" target="_blank">
    <img src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="open in Stackblitz" />
  </a>
</div>

ComputeSDK allows you to run sandboxes in Railway.
Let's walk through the process of getting a basic Vite app running inside a Railway sandbox.

## Why use Railway as your sandbox provider?

Railway offers instant deployments with automatic SSL and a developer-friendly experience.\
They provide a generous free tier and a beautiful dashboard for monitoring your deployments.\
Railway is perfect for teams that want self-hosted sandbox capabilities with minimal infrastructure management.\
**Let's see how we can easily run a basic Vite app inside of a Railway sandbox.**

## Let's start by creating a new Vite app

Run this command in your terminal:

```bash
npm create vite@latest railway-basic -- --template react-ts
```

You can use all of the defaults when prompted.\
Once it has been created, be sure to create an `.env` file to add your necessary credentials to.

```bash
COMPUTESDK_API_KEY=your_computesdk_api_key

RAILWAY_API_KEY=your_railway_api_key
RAILWAY_PROJECT_ID=your_railway_project_id
RAILWAY_ENVIRONMENT_ID=your_railway_environment_id
```

## Create or log in to your Railway account and create a project
<!-- markdownlint-disable-next-line MD033 -->
Create a Railway account <a href="https://railway.app/login" target="_blank">here</a>.\
Create a new project

1. Use this repo and deploy the final version of this app
2. Deploy our [docker image](https://hub.docker.com/r/computesdk/compute) (fastest for sandbox boot times)
3. Create a blank project

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

## Install the ComputeSDK package

```bash
npm install computesdk
```

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

ComputeSDK makes this easy, just import the basic `computesdk` package.\
ComputeSDK auto-detects your sandbox provider variables from your .env file

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
        Create Railway sandbox
      </button>
    </div>
  );
}
```

### Now, our first test

Click the button on the main page.
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="300px" src="/nextjs-button-screenshot.png" alt="screenshot of next.js app button" title="sandbox test button" />

Then check your Railway dashboard.\
You should see a new service deployed in your project!

Success!

ComputeSDK automatically installs our lightweight daemon upon sandbox creation. There should already be a `.compute/sandboxes/unique-sandbox-id` subfolder created in your sandbox. This is where you can run applications in your sandbox and automatically access them via the browser through our secure tunnel.

## You've successfully created your first Railway sandbox

If you want to use another sandbox provider like E2B or Modal, all you need to do is change your provider variables from `RAILWAY_API_KEY=xxxxx` to `E2B_API_KEY=xxxxx`. ComputeSDK automatically detects your sandbox provider from your environment variables.

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
      allowedHosts: ['.railway.app', 'localhost', '127.0.0.1', '.computesdk.com'],
    },
  })
  `;
  await sandbox.filesystem.writeFile('app/vite.config.js', viteConfig);
```

#### Run npm install using the runCommand method

runCommand runs at the sandbox subfolder by default.
(e.g., `/.compute/unique_sandbox_id/commands_run_here`)\
So we need to cd into /app before we run npm install or start our Vite server.

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
      allowedHosts: ['.railway.app', 'localhost', '127.0.0.1', '.computesdk.com'],
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

Now, after you click the "Create Railway Sandbox" button on your localhost homepage you should:

1. See a new service deployed in your Railway project.
2. See a Vite app structure inside of your sandbox's folder structure
3. See a preview URL in your terminal output like this:\
`unique-sandbox-id-5173.preview.computesdk.com`
4. Finally, if you visit that URL you should see the boilerplate Vite React app running in your Railway sandbox!

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
