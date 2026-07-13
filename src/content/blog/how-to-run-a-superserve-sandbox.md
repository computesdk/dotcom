---
title: "How to run a Superserve sandbox"
description: "A step-by-step process for creating a sandbox with Superserve and running a Vite dev server inside it."
date: "2026-07-13"
tags: [how-to, sandboxes, superserve]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: false
---

Superserve provides sandbox infrastructure to run code in isolated cloud environments powered by Firecracker microVMs.
Let's walk through the process of creating a Superserve sandbox and running a Vite dev server inside it.

## Why use Superserve as your sandbox provider?

- Sandbox infrastructure powered by Firecracker microVMs.
- Sandboxes can be paused and resumed in place for fast reactivation.
- A single API key is all you need to get started.

> **A note before you start:** Superserve doesn't support ComputeSDK's `getUrl()` — arbitrary port forwarding isn't available, so it throws. `filesystem` operations are fully supported. This guide verifies things by running a command inside the sandbox instead of opening a live browser preview — if you need a public preview URL, E2B, Daytona, CodeSandbox, Blaxel, Hopx, Runloop, or Modal all support it.

**Let's see how we can create a Superserve sandbox and run a Vite dev server inside it.**

## Let's start by creating a new Next.js project

Run this command in your terminal:

```bash
npx create-next-app@latest superserve-basic
```

You can use all of the defaults when prompted.

### Create an .env file
Once it has been created, be sure to create an `.env` file to add your necessary credentials to.

```bash
SUPERSERVE_API_KEY=your_api_key
```

### Install ComputeSDK and the Superserve provider

ComputeSDK ships as a small core package plus one package per provider, so you only install what you use.

```bash
cd superserve-basic
npm install computesdk @computesdk/superserve
```

## Create or log in to your Superserve account
<!-- markdownlint-disable-next-line MD033 -->
Create a Superserve account or log in <a href="https://superserve.ai" target="_blank">here</a>.\
Once you have created an account, generate an API key from your dashboard.

Save your API key in your `.env` file to the `SUPERSERVE_API_KEY` variable.

```bash
SUPERSERVE_API_KEY=your_api_key
```

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

Import the `superserve` factory from `@computesdk/superserve` and pass it your API key. `compute.sandbox.create()` boots a Firecracker microVM.\
Create a new `route.ts` file in `app/api/sandbox` and paste the following code:

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { superserve } from '@computesdk/superserve';

const compute = superserve({
  apiKey: process.env.SUPERSERVE_API_KEY,
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
        Create Superserve sandbox
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

Then check your Superserve dashboard.\
You should see a new sandbox created!

Success!

## You've successfully created your first Superserve sandbox

If you want to use another sandbox provider like E2B or Daytona, swap the import and factory call — install `@computesdk/e2b` and use `import { e2b } from '@computesdk/e2b'` instead, with that provider's own credentials. The rest of your code (`runCommand`, `filesystem`) stays the same — that's the point of the universal `Sandbox` interface.

## Making changes within the sandbox

Now, let's take the next step and run a Vite dev server inside our sandbox — and since Superserve doesn't support `getUrl()`, confirm it's actually running by curling it from inside the sandbox instead.

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

#### Run npm install using the runCommand method

```typescript
  // Install dependencies
  await sandbox.runCommand('npm install', {
    cwd: 'app',
  })
```

#### Start local dev server in the background with runCommand

```typescript
  // Start dev server, binding to 0.0.0.0 so we can reach it from inside the sandbox
  sandbox.runCommand('npm run dev -- --host 0.0.0.0 > vite.log 2>&1', {
    cwd: 'app',
  });
```

#### Confirm the dev server is running with a curl check

Since Superserve's `getUrl()` throws (no arbitrary port forwarding), we verify the server is up by running a command inside the sandbox instead of returning a public preview URL.

```typescript
  // Give the dev server a moment to start, then check it from inside the sandbox
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const healthCheck = await sandbox.runCommand(
    'curl -s -o /dev/null -w "%{http_code}" http://localhost:5173',
    { cwd: 'app' }
  );
  console.log('Vite dev server HTTP status:', healthCheck.stdout);
```

#### Return the sandboxId and health check result

```typescript
  return NextResponse.json({
    sandboxId: sandbox.sandboxId,
    viteStatus: healthCheck.stdout,
  });
```

#### Finished route.ts file

Your `/app/api/sandbox/route.ts` file should look like this now:

```typescript
import { NextResponse } from 'next/server';
import { superserve } from '@computesdk/superserve';

const compute = superserve({
  apiKey: process.env.SUPERSERVE_API_KEY,
});

export async function POST() {

  const sandbox = await compute.sandbox.create();

  // Create basic Vite React app
  await sandbox.runCommand('npm create vite@5 app -- --template react');

  // Install dependencies
  await sandbox.runCommand('npm install', {
    cwd: 'app',
  })

  // Start dev server, binding to 0.0.0.0 so we can reach it from inside the sandbox
  sandbox.runCommand('npm run dev -- --host 0.0.0.0 > vite.log 2>&1', {
    cwd: 'app',
  });

  // Give the dev server a moment to start, then check it from inside the sandbox
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const healthCheck = await sandbox.runCommand(
    'curl -s -o /dev/null -w "%{http_code}" http://localhost:5173',
    { cwd: 'app' }
  );
  console.log('Vite dev server HTTP status:', healthCheck.stdout);

  return NextResponse.json({
    sandboxId: sandbox.sandboxId,
    viteStatus: healthCheck.stdout,
  });
}
```

## Testing it out

Now, after you click the "Create Superserve Sandbox" button on your localhost homepage you should:

1. See a new sandbox created in your Superserve dashboard.
2. See `Vite dev server HTTP status: 200` logged to your terminal, and `viteStatus: "200"` in the JSON response — confirming the Vite dev server booted successfully inside the sandbox.

There's no live browser preview in this guide — Superserve doesn't currently expose arbitrary ports through ComputeSDK's `getUrl()`. If your use case needs a live preview, E2B, Daytona, CodeSandbox, Blaxel, Hopx, Runloop, or Modal are all better fits today.

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created a Superserve sandbox with ComputeSDK
- used our runCommand and filesystem methods (these work with any provider that supports them)
- ran a Vite dev server inside the sandbox and confirmed it booted successfully
- confirmed what Superserve sandboxes do and don't support today (no `getUrl`, filesystem works)

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code for Superserve, you can easily adjust this code to run in any sandbox provider — and if you need a live preview URL, swapping to a provider that supports it is a one-line import change.

**Happy Sandboxing!**

Want to get sandboxes running in your application?\
Want to be added as a provider?\
Reach out to us at [email@computesdk.com](mailto:email@computesdk.com)
