---
title: "How to run a Cloudflare sandbox"
description: "A step-by-step process for creating a sandbox with Cloudflare, running a basic Vite app inside, and accessing it securely via the browser."
date: "2026-07-13"
tags: [how-to, sandboxes, cloudflare]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: false
---

Cloudflare's Sandbox lets you execute code in secure, isolated containers on Cloudflare's edge network. The ComputeSDK Cloudflare provider connects to Cloudflare's official Sandbox bridge Worker, which you deploy once and reuse across your apps.
Let's walk through the process of getting a basic application running inside a Cloudflare sandbox.

## Why use Cloudflare as your sandbox provider?

- Sandboxes run on Cloudflare's global edge network.
- Self-hosted control: you deploy Cloudflare's official Sandbox bridge Worker once, so you own the endpoint.
- Optional warm pool support to keep sandboxes ready and reduce cold-start latency.

**Let's see how we can easily run a basic Vite app inside of a Cloudflare sandbox.**

## Let's start by creating a new Next.js project

Run this command in your terminal:

```bash
npx create-next-app@latest cloudflare-basic
```

You can use all of the defaults when prompted.

### Create an .env file
Once it has been created, be sure to create an `.env` file to add your necessary credentials to.

```bash
CLOUDFLARE_SANDBOX_URL=https://your-bridge-subdomain.workers.dev
CLOUDFLARE_SANDBOX_API_KEY=your_bridge_api_key
```

### Install ComputeSDK and the Cloudflare provider

ComputeSDK ships as a small core package plus one package per provider, so you only install what you use.

```bash
cd cloudflare-basic
npm install computesdk @computesdk/cloudflare
```

## Deploy the Cloudflare Sandbox bridge Worker

Unlike most providers, there's no dashboard sign-up here — you connect to Cloudflare's official Sandbox bridge Worker, which only needs to be deployed once. You can print these setup instructions at any time by running `npx @computesdk/cloudflare` (this only prints instructions; it doesn't deploy anything and doesn't require Docker).

1. **Deploy the bridge Worker**: follow the guide at [developers.cloudflare.com/sandbox/bridge](https://developers.cloudflare.com/sandbox/bridge/).
2. **Set the bridge Worker's API key secret**:
   ```bash
   npx wrangler secret put SANDBOX_API_KEY
   ```
3. **Configure your app**: add the bridge URL and the same API key to your `.env` file.

```bash
CLOUDFLARE_SANDBOX_URL=https://your-bridge-subdomain.workers.dev
CLOUDFLARE_SANDBOX_API_KEY=your_bridge_api_key
```

> Want sandboxes to stay warm? Set `WARM_POOL_TARGET` (e.g. `WARM_POOL_TARGET=10`) on the bridge Worker to keep a pool ready.

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

Import the `cloudflare` factory from `@computesdk/cloudflare` and pass it your bridge Worker's URL and API key. `compute.sandbox.create()` provisions a sandbox behind your bridge Worker.\
Create a new `route.ts` file in `app/api/sandbox` and paste the following code:

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { cloudflare } from '@computesdk/cloudflare';

const compute = cloudflare({
  sandboxUrl: process.env.CLOUDFLARE_SANDBOX_URL,
  sandboxApiKey: process.env.CLOUDFLARE_SANDBOX_API_KEY,
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
Replace the content on Page.tsx with this code:

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
        Create Cloudflare sandbox
      </button>
    </div>
  );
}
```

### Now, our first test
Run `npm run dev` in your terminal to start the dev server.\
Open `localhost:3000`\
Click the button on the main page.
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="500px" src="/blog/create-sandbox-button-ui.png" alt="screenshot of next.js app button" title="sandbox test button" />

Check your terminal output — you should see a `sandboxId` logged for the new sandbox.

Success!

## You've successfully created your first Cloudflare sandbox

If you want to use another sandbox provider like E2B or Daytona, swap the import and factory call — install `@computesdk/e2b` and use `import { e2b } from '@computesdk/e2b'` instead, with that provider's own credentials. The rest of your code (`runCommand`, `filesystem`, `getUrl`) stays the same — that's the point of the universal `Sandbox` interface.

## Making changes within the sandbox

Now, let's take the next step and run a primitive Vite app inside of our sandbox as an example of what we are able to do within the sandbox itself.

### Update /api/sandbox/route.ts

Add the following to your `app/api/sandbox/route.ts` file directly below this in your code:

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
      allowedHosts: ['localhost', '127.0.0.1'] // add domain here
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

#### Use the getUrl method to get a preview URL

```typescript
  // Get preview URL
  const url = await sandbox.getUrl({ port: 5173 });
  console.log('previewUrl:', url)
```

Cloudflare resolves this through your bridge Worker's own routing. We don't have a fixed domain to pin down here — add it to the `allowedHosts` array above once you see it in your terminal output.

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
import { cloudflare } from '@computesdk/cloudflare';

const compute = cloudflare({
  sandboxUrl: process.env.CLOUDFLARE_SANDBOX_URL,
  sandboxApiKey: process.env.CLOUDFLARE_SANDBOX_API_KEY,
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
      allowedHosts: ['localhost', '127.0.0.1'] // add domain here
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

Now, after you click the "Create Cloudflare Sandbox" button on your localhost homepage you should:

1. See a new sandbox created behind your bridge Worker.
2. See a preview URL logged to your terminal — routed through your bridge Worker, not a shared ComputeSDK domain.
3. Finally, if you visit that URL you should see the boilerplate Vite React app running in your Cloudflare sandbox!

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/sandbox-vite-app-in-browser.png" alt="screenshot of Vite app running in Cloudflare sandbox via ComputeSDK" title="Basic Vite App in Cloudflare sandbox" />

## Congrats! You've successfully created your first sandbox application

You have done the following:

- deployed a Cloudflare Sandbox bridge Worker and created a sandbox behind it with ComputeSDK
- used our runCommand, writeFile, and getUrl methods (these work with any provider)
- ran a Vite app inside the sandbox
- accessed the app running within the sandbox through its preview URL

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code for Cloudflare, you can easily adjust this code to run in any sandbox provider.

**Happy Sandboxing!**

Want to get sandboxes running in your application?\
Want to be added as a provider?\
Reach out to us at [email@computesdk.com](mailto:email@computesdk.com)
