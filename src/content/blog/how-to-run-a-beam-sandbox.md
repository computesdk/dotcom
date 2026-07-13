---
title: "How to run a Beam sandbox"
description: "A step-by-step process for creating a sandbox with Beam, running a basic Vite app inside, and accessing it securely via the browser."
date: "2026-07-13"
tags: [how-to, sandboxes, beam]
author: "David Tice"
role: "Head of Product"
image: "/david-tice-sq.jpeg"
featured: false
---

Beam is a cloud platform for running serverless compute, with sandboxes for executing code in isolated environments.
Let's walk through the process of getting a basic application running inside a Beam sandbox.

## Why use Beam as your sandbox provider?

- Simple token + workspace authentication — no extra setup beyond your Beam account.
- Custom gateway URL support if you're running against a staging or enterprise deployment.
- A straightforward runCommand-first sandbox model that's easy to reason about.

**Let's see how we can easily run a basic Vite app inside of a Beam sandbox.**

## Let's start by creating a new Next.js project

Run this command in your terminal:

```bash
npx create-next-app@latest beam-basic
```

You can use all of the defaults when prompted.

### Create an .env file

Once it has been created, be sure to create an `.env` file to add your necessary credentials to.

```bash
BEAM_TOKEN=your_beam_token
BEAM_WORKSPACE_ID=your_beam_workspace_id
```

### Install ComputeSDK and the Beam provider

ComputeSDK ships as a small core package plus one package per provider, so you only install what you use.

```bash
cd beam-basic
npm install computesdk @computesdk/beam
```

## Create or log in to your Beam account
<!-- markdownlint-disable-next-line MD033 -->
Create a Beam account or log in <a href="https://www.beam.cloud" target="_blank">here</a>.\
Create an account, then find your API token and workspace ID in your Beam dashboard settings.

Save these values in your `.env` file.

```bash
BEAM_TOKEN=your_beam_token
BEAM_WORKSPACE_ID=your_beam_workspace_id
```

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

Import the `beam` factory from `@computesdk/beam` and pass it your credentials. `compute.sandbox.create()` provisions a sandbox on Beam.\
Create a new `route.ts` file in `app/api/sandbox` and paste the following code:

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { beam } from '@computesdk/beam';

const compute = beam({
  token: process.env.BEAM_TOKEN,
  workspaceId: process.env.BEAM_WORKSPACE_ID,
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
        Create Beam sandbox
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

Then check your Beam dashboard.\
You should see a new sandbox created!

Success!

## You've successfully created your first Beam sandbox

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
      allowedHosts: ['.app.beam.cloud', 'localhost', '127.0.0.1'],
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

Beam's preview URLs follow the pattern `https://<sandbox-id>-<port>.app.beam.cloud` — a Beam domain, not a shared ComputeSDK one.

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
import { beam } from '@computesdk/beam';

const compute = beam({
  token: process.env.BEAM_TOKEN,
  workspaceId: process.env.BEAM_WORKSPACE_ID,
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
      allowedHosts: ['.app.beam.cloud', 'localhost', '127.0.0.1'],
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

Now, after you click the "Create Beam Sandbox" button on your localhost homepage you should:

1. See a new sandbox created in your Beam dashboard.
2. See a preview URL logged to your terminal output.
3. Finally, if you visit that URL you should see the boilerplate Vite React app running in your Beam sandbox!

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/sandbox-vite-app-in-browser.png" alt="screenshot of Vite app running in Beam sandbox via ComputeSDK" title="Basic Vite App in Beam sandbox" />

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created a Beam sandbox with ComputeSDK
- used our runCommand, writeFile, and getUrl methods (these work with any provider whose sandbox supports them)
- ran a Vite app inside the sandbox
- accessed the app running within the sandbox through its preview URL

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code for Beam, you can easily adjust this code to run in any sandbox provider.

**Happy Sandboxing!**

Want to get sandboxes running in your application?\
Want to be added as a provider?\
Reach out to us at [email@computesdk.com](mailto:email@computesdk.com)
