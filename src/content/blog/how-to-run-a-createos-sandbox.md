---
title: "How to run a CreateOS sandbox"
description: "A step-by-step process for creating a sandbox with CreateOS, running a basic Vite app inside, and accessing it securely via the browser."
date: "2026-07-13"
tags: [how-to, sandboxes, createos-sandbox]
author: "David Tice"
role: "Head of Product"
image: "/david-tice-sq.jpeg"
featured: false
---

<span style="font-size: 14px; font-style: italic;">You can clone <a href="https://github.com/computesdk/examples/tree/main/createos-sandbox-basic" target="_blank">this repo</a> and update your credentials to run locally.</span>

CreateOS provides NodeOps VM sandboxes with pause, resume, and fork snapshots, wrapping the official @nodeops-createos/sandbox package.
Let's walk through the process of getting a basic application running inside a CreateOS sandbox.

## Why use CreateOS as your sandbox provider?

- Pause/resume/fork snapshots are built in — pausing a sandbox IS the snapshot, and you can fork it into a fresh running one instantly.
- A thin adapter over the official @nodeops-createos/sandbox package, so you can drop to the native SDK for advanced VM control.
- Sized from a fixed shape catalog, so resource sizing is predictable.

**Let's see how we can easily run a basic Vite app inside of a CreateOS sandbox.**

## Let's start by creating a new Next.js project

Run this command in your terminal:

```bash
npx create-next-app@latest createos-sandbox-basic
```

You can use all of the defaults when prompted.

### Create an .env file

Once it has been created, be sure to create an `.env` file to add your necessary credentials to.

```bash
CREATEOS_SANDBOX_API_KEY=your_createos_api_key
```

### Install ComputeSDK and the CreateOS provider

ComputeSDK ships as a small core package plus one package per provider, so you only install what you use.

```bash
cd createos-sandbox-basic
npm install computesdk @computesdk/createos-sandbox
```

## Create or log in to your CreateOS account
<!-- markdownlint-disable-next-line MD033 -->
Create a CreateOS account or log in <a href="https://createos.sh" target="_blank">here</a>.\
Create an account, then generate an API key from your CreateOS dashboard.

Save these values in your `.env` file.

```bash
CREATEOS_SANDBOX_API_KEY=your_createos_api_key
```

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

Import the `createosSandbox` factory from `@computesdk/createos-sandbox` and pass it your credentials. `compute.sandbox.create()` provisions a sandbox on CreateOS.\
Create a new `route.ts` file in `app/api/sandbox` and paste the following code:

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { createosSandbox } from '@computesdk/createos-sandbox';

const compute = createosSandbox({
  apiKey: process.env.CREATEOS_SANDBOX_API_KEY,
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
        Create CreateOS sandbox
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

Then check your CreateOS dashboard.\
You should see a new sandbox created!

Success!

## You've successfully created your first CreateOS sandbox

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

CreateOS resolves this through its own sandbox preview URL (`sandbox.previewUrl(port)`). We don't have a fixed domain to pin down here — add it to the `allowedHosts` array above once you see it in your terminal output.

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
import { createosSandbox } from '@computesdk/createos-sandbox';

const compute = createosSandbox({
  apiKey: process.env.CREATEOS_SANDBOX_API_KEY,
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

Now, after you click the "Create CreateOS Sandbox" button on your localhost homepage you should:

1. See a new sandbox created in your CreateOS dashboard.
2. See a preview URL logged to your terminal output.
3. Finally, if you visit that URL you should see the boilerplate Vite React app running in your CreateOS sandbox!

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/sandbox-vite-app-in-browser.png" alt="screenshot of Vite app running in CreateOS sandbox via ComputeSDK" title="Basic Vite App in CreateOS sandbox" />

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created a CreateOS sandbox with ComputeSDK
- used our runCommand, writeFile, and getUrl methods (these work with any provider whose sandbox supports them)
- ran a Vite app inside the sandbox
- accessed the app running within the sandbox through its preview URL

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code for CreateOS, you can easily adjust this code to run in any sandbox provider.

**Happy Sandboxing!**

Want to get sandboxes running in your application?\
Want to be added as a provider?\
Reach out to us at [email@computesdk.com](mailto:email@computesdk.com)
