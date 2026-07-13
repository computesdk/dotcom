---
title: "How to run a Modal sandbox"
description: "A step-by-step process for creating a sandbox with Modal, running a basic Vite app inside, and accessing it securely via the browser."
date: "2026-07-12"
tags: [how-to, sandboxes, modal]
author: "David Tice"
role: "Head of Product"
image: "/david-tice-sq.jpeg"
featured: false
---

<span style="font-size: 14px; font-style: italic;">You can clone <a href="https://github.com/computesdk/examples/tree/main/modal-basic" target="_blank">this repo</a> and update your credentials to run locally.</span>

Modal is a serverless cloud platform for running compute-intensive code. It provides instant container spin-up with GPU support, enabling developers to run ML inference, data processing, and batch jobs without managing infrastructure.
Let's walk through the process of getting a basic application running inside a Modal sandbox.

## Why use Modal as your sandbox provider?

- Modal provides serverless compute with GPU support, making it ideal for ML workloads.
- They offer fast cold starts and seamless scaling without infrastructure management.
- Modal's instant container spin-up means your sandboxes are ready in seconds.

**Let's see how we can easily run a basic Vite app inside of a Modal sandbox.**

## Let's start by creating a new Next.js project

Run this command in your terminal:

```bash
npx create-next-app@latest modal-basic
```

You can use all of the defaults when prompted.

### Create an .env file
Once it has been created, be sure to create an `.env` file to add your necessary credentials to.

```bash
MODAL_TOKEN_ID=your_modal_token_id
MODAL_TOKEN_SECRET=your_modal_token_secret
```

### Install ComputeSDK and the Modal provider

ComputeSDK ships as a small core package plus one package per provider, so you only install what you use.

```bash
npm install computesdk @computesdk/modal
```

## Create or log in to your Modal account
<!-- markdownlint-disable-next-line MD033 -->
Create a Modal account or log in <a href="https://modal.com" target="_blank">here</a>.\
Once you have created an account, you'll need to get your Modal API tokens.\
Go to Settings → API Tokens → Create new token. You'll receive both a Token ID and Token Secret.

Save your tokens in your `.env` file.

```bash
MODAL_TOKEN_ID=your_modal_token_id
MODAL_TOKEN_SECRET=your_modal_token_secret
```

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

Import the `modal` factory from `@computesdk/modal` and pass it your credentials. `compute.sandbox.create()` provisions a sandbox on Modal.

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { modal } from '@computesdk/modal';

const compute = modal({
  tokenId: process.env.MODAL_TOKEN_ID,
  tokenSecret: process.env.MODAL_TOKEN_SECRET,
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
        Create Modal sandbox
      </button>
    </div>
  );
}
```

### Now, our first test

Click the button on the main page.
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="500px" src="/blog/create-sandbox-button-ui.png" alt="screenshot of next.js app button" title="sandbox test button" />

Then check your Modal dashboard.\
You should see a new sandbox created!

Success!

## You've successfully created your first Modal sandbox

If you want to use another sandbox provider like E2B or Daytona, swap the import and factory call — install `@computesdk/e2b` and use `import { e2b } from '@computesdk/e2b'` instead, with that provider's own credentials. The rest of your code (`runCommand`, `filesystem`, `getUrl`) stays the same — that's the point of the universal `Sandbox` interface.

## Making changes within the sandbox

Now, let's take the next step and run a primitive Vite app inside of our sandbox as an example of what we are able to do within the sandbox itself.

Modal sandboxes only expose ports you declare up front, so this time we pass `ports` to `create()`.

### Update /api/sandbox/route.ts

Add the following to your `route.ts` file directly below this in your code:

```typescript
const sandbox = await compute.sandbox.create({ ports: [5173] });
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
      allowedHosts: ['.modal.host', '.modal.run', 'localhost', '127.0.0.1'],
    },
  })
  `;
  await sandbox.filesystem.writeFile('app/vite.config.js', viteConfig);
```

#### Run npm install using the runCommand method

`cwd` is an optional per-call override — if you don't pass one, commands run in whatever Modal's own sandbox default working directory is. We pass `cwd: 'app'` here simply because that's the subfolder we just scaffolded the Vite project into.

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

Modal resolves this through its own tunnel service (`.modal.host`-style domains, e.g. `https://wtqcahqwhd4tu0.r5.modal.host`) — not a shared ComputeSDK one. This only works because we declared `ports: [5173]` when we created the sandbox above; Modal sandboxes don't expose ports you didn't ask for up front.

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
import { modal } from '@computesdk/modal';

const compute = modal({
  tokenId: process.env.MODAL_TOKEN_ID,
  tokenSecret: process.env.MODAL_TOKEN_SECRET,
});

export async function POST() {

  const sandbox = await compute.sandbox.create({ ports: [5173] });

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
      allowedHosts: ['.modal.host', 'localhost', '127.0.0.1'],
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

Now, after you click the "Create Modal Sandbox" button on your localhost homepage you should:

1. See a new sandbox created in your Modal dashboard.
2. See a preview URL logged to your terminal, on a `.modal.host` tunnel domain.
3. Finally, if you visit that URL you should see the boilerplate Vite React app running in your Modal sandbox!

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/sandbox-vite-app-in-browser.png" alt="screenshot of Vite app running in Modal sandbox via ComputeSDK" title="Basic Vite App in Modal sandbox" />

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created a Modal sandbox with ComputeSDK
- used our runCommand, writeFile, and getUrl methods (these work with any provider)
- ran a Vite app inside the sandbox
- accessed the app running within the sandbox through its preview URL

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code in Modal, you can easily adjust this code to run in any sandbox provider.

**Happy Sandboxing!**

Have questions?\
Want to be added as a provider?\
Reach out to us at [support@computesdk.com](mailto:support@computesdk.com)
