---
title: "How to run a Namespace sandbox"
description: "A step-by-step process for creating a sandbox with Namespace and running commands inside it."
date: "2026-04-05"
tags: [how-to, sandboxes, namespace]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: false
---

Namespace is a cloud compute platform that provides ephemeral container instances. With granular resource configuration for vCPU, memory, architecture, and OS, Namespace gives you fine-grained control over your sandbox environments.
Let's walk through the process of getting a basic sandbox running on Namespace.

## Why use Namespace as your sandbox provider?

- Namespace provides ephemeral container instances with granular resource configuration.
- They offer fine-grained control over vCPU, memory, machine architecture, and operating system.
- Namespace makes it easy to create isolated sandbox environments without managing infrastructure.

> **A note before you start:** Namespace sandboxes don't currently support ComputeSDK's `filesystem` operations or `getUrl()` — both throw at runtime. This guide sticks to `runCommand`, which is fully supported, and shows off Namespace's resource-configuration options instead of the Vite-preview demo used in the other provider guides.

**Let's see how we can create a Namespace sandbox and run commands inside it.**

## Let's start by creating a new Next.js project

Run this command in your terminal:

```bash
npx create-next-app@latest namespace-basic
```

You can use all of the defaults when prompted.

### Create an .env file
Once it has been created, be sure to create an `.env` file to add your necessary credentials to.

```bash
NSC_TOKEN=your_namespace_nsc_token
```

### Install ComputeSDK and the Namespace provider

ComputeSDK ships as a small core package plus one package per provider, so you only install what you use.

```bash
npm install computesdk @computesdk/namespace
```

## Create or log in to your Namespace account
<!-- markdownlint-disable-next-line MD033 -->
Create a Namespace account or log in <a href="https://namespace.so" target="_blank">here</a>.\
Once you have created an account, you'll need to get your Namespace API token.\
Generate your NSC token from your Namespace account settings.

Save your token in your `.env` file to the `NSC_TOKEN` variable.

```bash
NSC_TOKEN=your_namespace_nsc_token
```

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

Import the `namespace` factory from `@computesdk/namespace` and pass it your token. `compute.sandbox.create()` provisions a sandbox on Namespace.

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { namespace } from '@computesdk/namespace';

const compute = namespace({
  token: process.env.NSC_TOKEN,
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
        Create Namespace sandbox
      </button>
    </div>
  );
}
```

### Now, our first test

Click the button on the main page.
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="500px" src="/blog/create-sandbox-button-ui.png" alt="screenshot of next.js app button" title="sandbox test button" />

Then check your Namespace dashboard.\
You should see a new sandbox created!

Success!

## You've successfully created your first Namespace sandbox

If you want to use another sandbox provider like E2B or Daytona, swap the import and factory call — install `@computesdk/e2b` and use `import { e2b } from '@computesdk/e2b'` instead, with that provider's own credentials. The rest of your code (`runCommand`) stays the same — that's the point of the universal `Sandbox` interface.

## Customizing sandbox resources and running commands

Namespace's standout feature is granular control over the machine backing your sandbox — vCPU, memory, architecture, and OS — so let's use that instead of the filesystem/preview-URL demo the other guides use.

### Update /api/sandbox/route.ts

Pass resource options directly to the `namespace()` factory:

```typescript
const compute = namespace({
  token: process.env.NSC_TOKEN,
  virtualCpu: 4,
  memoryMegabytes: 8192,
});
```

#### Run a command with runCommand

`filesystem` and `getUrl` both throw for Namespace sandboxes today, but `runCommand` is fully supported — you can install packages, run scripts, and inspect output just like any other provider.

```typescript
const result = await sandbox.runCommand('node -v && npm -v');
console.log(result.stdout);
```

#### Check sandbox status with getInfo

```typescript
const info = await sandbox.getInfo();
console.log(`Sandbox status: ${info.status}`);
```

#### Finished route.ts file

Your `/app/api/sandbox/route.ts` file should look like this now:

```typescript
import { NextResponse } from 'next/server';
import { namespace } from '@computesdk/namespace';

const compute = namespace({
  token: process.env.NSC_TOKEN,
  virtualCpu: 4,
  memoryMegabytes: 8192,
});

export async function POST() {

  const sandbox = await compute.sandbox.create();

  const result = await sandbox.runCommand('node -v && npm -v');
  console.log(result.stdout);

  const info = await sandbox.getInfo();
  console.log(`Sandbox status: ${info.status}`);

  return NextResponse.json({
    sandboxId: sandbox.sandboxId,
    status: info.status,
    output: result.stdout,
  });
}
```

## Testing it out

Now, after you click the "Create Namespace Sandbox" button on your localhost homepage you should:

1. See a new sandbox created in your Namespace dashboard, sized to the vCPU/memory you configured.
2. See the command output (Node and npm versions) and sandbox status logged to your terminal and returned from the API route.

There's no live browser preview in this guide — Namespace sandboxes don't currently expose ports or a public URL through ComputeSDK. If your use case needs a live preview, one of the other provider guides (E2B, Daytona, CodeSandbox, etc.) is a better fit today.

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created a Namespace sandbox with ComputeSDK, with custom vCPU/memory
- used our runCommand and getInfo methods
- confirmed what Namespace sandboxes do and don't support today (no filesystem, no getUrl)

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code for Namespace, you can easily adjust this code to run in any sandbox provider — and if you need filesystem access or a live preview URL, swapping to a provider that supports them is a one-line import change.

**Happy Sandboxing!**

Have questions?\
Want to be added as a provider?\
Reach out to us at [support@computesdk.com](mailto:support@computesdk.com)
