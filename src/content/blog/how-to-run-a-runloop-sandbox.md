---
title: "How to run a Runloop sandbox"
description: "A step-by-step process for creating a sandbox with Runloop, running a basic Vite app inside, and accessing it securely via the browser."
date: "2026-04-05"
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
RUNLOOP_API_KEY=your_runloop_api_key
```

### Install ComputeSDK and the Runloop provider

ComputeSDK ships as a small core package plus one package per provider, so you only install what you use.

```bash
cd basic-runloop-sandbox
npm install computesdk @computesdk/runloop
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

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

Import the `runloop` factory from `@computesdk/runloop` and pass it your API key. `compute.sandbox.create()` provisions a sandbox on Runloop.

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { runloop } from '@computesdk/runloop';

const compute = runloop({
  apiKey: process.env.RUNLOOP_API_KEY,
});

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

If you want to use another sandbox provider like E2B or Vercel, swap the import and factory call — install `@computesdk/e2b` and use `import { e2b } from '@computesdk/e2b'` instead, with that provider's own credentials. The rest of your code (`runCommand`, `filesystem`, `getUrl`) stays the same — that's the point of the universal `Sandbox` interface.

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
      allowedHosts: ['.runloop.ai', 'localhost', '127.0.0.1'],
    },
  })
  `;
  await sandbox.filesystem.writeFile('app/vite.config.js', viteConfig);
```

#### Run npm install using the runCommand method

`cwd` is an optional per-call override — if you don't pass one, commands run in whatever Runloop's own sandbox default working directory is. We pass `cwd: 'app'` here simply because that's the subfolder we just scaffolded the Vite project into.

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

#### Use the getUrl method to get a preview URL

```typescript
  // Get preview URL
  const url = await sandbox.getUrl({ port: 5173 });
  console.log('previewUrl:', url)
```

Runloop's preview URLs follow the pattern `https://<port>-<tunnel-key>.tunnel.runloop.ai` — a Runloop domain, not a shared ComputeSDK one.

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
import { runloop } from '@computesdk/runloop';

const compute = runloop({
  apiKey: process.env.RUNLOOP_API_KEY,
});

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
      allowedHosts: ['.runloop.ai', 'localhost', '127.0.0.1'],
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
2. See a preview URL logged to your terminal, in the form `https://5173-<tunnel-key>.tunnel.runloop.ai`.
3. Finally, if you visit that URL you should see the boilerplate Vite React app running in your Runloop sandbox!

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/sandbox-vite-app-in-browser.png" alt="screenshot of Vite app running in Runloop sandbox via ComputeSDK" title="Basic Vite App in Runloop sandbox" />

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created a Runloop sandbox with ComputeSDK
- used our runCommand, writeFile, and getUrl methods (these work with any provider)
- ran a Vite app inside the sandbox
- accessed the app running within the sandbox through its preview URL

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code in Runloop, you can easily adjust this code to run in any sandbox provider.

**Happy Sandboxing!**

Have questions?\
Want to be added as a provider?\
Reach out to us at [support@computesdk.com](mailto:support@computesdk.com)
