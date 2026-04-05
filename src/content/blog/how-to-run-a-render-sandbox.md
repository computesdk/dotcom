---
title: "How to run a Render sandbox"
description: "A step-by-step process for creating a sandbox with Render, running a basic Vite app inside, and accessing it securely via the browser."
date: "2026-04-05"
tags: [how-to, sandboxes, render]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: false
---

Render is a unified cloud platform for building and running applications. With zero infrastructure setup required, Render makes it easy to deploy services and now, with ComputeSDK, run sandboxes.
Let's walk through the process of getting a basic application running inside a Render sandbox.

## Why use Render as your sandbox provider?

- Render provides a unified cloud platform with zero infrastructure setup required.
- They offer automatic SSL, simple pricing, and a developer-friendly experience.
- Render is perfect for teams that want self-hosted sandbox capabilities without the complexity of managing infrastructure.

**Let's see how we can easily run a basic Vite app inside of a Render sandbox.**

## Let's start by creating a new Next.js project

Run this command in your terminal:

```bash
npx create-next-app@latest render-basic
```

You can use all of the defaults when prompted.

### Create an .env file
Once it has been created, be sure to create an `.env` file to add your necessary credentials to.

```bash
COMPUTESDK_API_KEY=your_computesdk_api_key

RENDER_API_KEY=your_render_api_key
RENDER_OWNER_ID=your_render_owner_id
```

### Install the ComputeSDK package

```bash
npm install computesdk
```

## Create or log in to your Render account
<!-- markdownlint-disable-next-line MD033 -->
Create a Render account or log in <a href="https://render.com" target="_blank">here</a>.\
Once you have created an account, you'll need to gather two credentials:

1. **API Key**: Go to Account Settings → API Keys and create a new key.
2. **Owner ID**: Found in your Account Settings page.

Save these values in your `.env` file.

```bash
RENDER_API_KEY=your_render_api_key
RENDER_OWNER_ID=your_render_owner_id
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
        Create Render sandbox
      </button>
    </div>
  );
}
```

### Now, our first test

Click the button on the main page.
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="500px" src="/blog/create-sandbox-button-ui.png" alt="screenshot of next.js app button" title="sandbox test button" />

Then check your Render dashboard.\
You should see a new sandbox created!

Success!

## You've successfully created your first Render sandbox

If you want to use another sandbox provider like Vercel or Modal, all you need to do is change your provider variables from `RENDER_API_KEY=xxxxx` and `RENDER_OWNER_ID=xxxxx` to `VERCEL_TOKEN=xxxxx`. ComputeSDK automatically detects your sandbox provider from your environment variables.

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
      allowedHosts: ['.onrender.com', 'localhost', '127.0.0.1', '.computesdk.com'],
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
      allowedHosts: ['.onrender.com', 'localhost', '127.0.0.1', '.computesdk.com'],
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

Now, after you click the "Create Render Sandbox" button on your localhost homepage you should:

1. See a new sandbox created in your Render dashboard.
2. See a preview URL in your terminal output like this:\
`unique-sandbox-id-5173.preview.computesdk.com`
3. Finally, if you visit that URL you should see the boilerplate Vite React app running in your Render sandbox!

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/sandbox-vite-app-in-browser.png" alt="screenshot of Vite app running in Render sandbox via ComputeSDK" title="Basic Vite App in Render sandbox" />

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created a Render sandbox with ComputeSDK
- used our runCommand, writeFile, and getUrl methods (these work with any provider)
- ran a Vite app inside the sandbox
- accessed the app running within the sandbox through our secure tunnel

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code in Render, you can easily adjust this code to run in any sandbox provider.

**Happy Sandboxing!**

<!-- markdownlint-disable-next-line MD033 -->
<a href="https://console.computesdk.com/register" target="_blank" style="display: inline-block; padding: 6px 12px; background-color: #10b981; color: white; font-weight: bold; border-radius: 8px; text-decoration: none;">Sign up with ComputeSDK</a>

Want to get sandboxes running in your application?\
Want to be added as a provider?\
Reach out to us at [email@computesdk.com](mailto:email@computesdk.com)
