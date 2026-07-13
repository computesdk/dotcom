---
title: "How to run an Archil sandbox"
description: "A step-by-step process for creating a sandbox with Archil and running commands against a mounted disk."
date: "2026-07-13"
tags: [how-to, sandboxes, archil]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: false
---

Archil is exec-only — instead of provisioning a new long-running VM, `create()` resolves a handle to an existing Archil disk, and each command you run executes in a fresh, Archil-managed container with that disk attached.
Let's walk through the process of attaching a sandbox to an Archil disk and running commands against it.

## Why use Archil as your sandbox provider?

- Attach ComputeSDK's exec API directly to disks you already manage in Archil.
- Every command runs in a fresh, isolated container — no long-lived VM to keep alive or clean up.
- A good fit for workloads that care about persistent disk state, not long-running background processes.

> **A note before you start:** Archil sandboxes don't support `getUrl()` — each exec runs in a fresh ephemeral container, so there's no long-lived process to expose a port on. `destroy()` is a no-op, since Archil manages the underlying disk's lifecycle, not ComputeSDK. `filesystem` operations work over shell commands. This guide sticks to `runCommand` and `filesystem` instead of a live browser preview.

**Let's see how we can attach a sandbox to an Archil disk and run commands against it.**

## Let's start by creating a new Next.js project

Run this command in your terminal:

```bash
npx create-next-app@latest archil-basic
```

You can use all of the defaults when prompted.

### Create an .env file
Once it has been created, be sure to create an `.env` file to add your necessary credentials to.

```bash
ARCHIL_API_KEY=your_archil_api_key
ARCHIL_REGION=aws-us-east-1
ARCHIL_DISK_ID=your_archil_disk_id
```

### Install ComputeSDK and the Archil provider

ComputeSDK ships as a small core package plus one package per provider, so you only install what you use.

```bash
cd archil-basic
npm install computesdk @computesdk/archil
```

## Create or log in to your Archil account
<!-- markdownlint-disable-next-line MD033 -->
Create an Archil account or log in <a href="https://archil.com" target="_blank">here</a>.\
Once you have created an account, generate an API key and note your region. You'll also need an existing disk to attach to — create one in your Archil console and note its disk ID.

Save these values in your `.env` file.

```bash
ARCHIL_API_KEY=your_archil_api_key
ARCHIL_REGION=aws-us-east-1
ARCHIL_DISK_ID=your_archil_disk_id
```

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

Import the `archil` factory from `@computesdk/archil` and pass it your credentials. `compute.sandbox.create({ diskId })` resolves a handle to your existing disk — there's no `diskId`, no sandbox.\
Create a new `route.ts` file in `app/api/sandbox` and paste the following code:

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { archil } from '@computesdk/archil';

const compute = archil({
  apiKey: process.env.ARCHIL_API_KEY,
  region: process.env.ARCHIL_REGION,
});

export async function POST() {

  const diskId = process.env.ARCHIL_DISK_ID;
  if (!diskId) throw new Error('ARCHIL_DISK_ID is not set');

  const sandbox = await compute.sandbox.create({ diskId });

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
        Create Archil sandbox
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

Check your terminal output — you should see a `sandboxId` logged for the new handle attached to your disk.

Success!

## You've successfully created your first Archil sandbox

If you want to use another sandbox provider like E2B or Daytona, swap the import and factory call — install `@computesdk/e2b` and use `import { e2b } from '@computesdk/e2b'` instead, with that provider's own credentials. The rest of your code (`runCommand`, `filesystem`) stays the same — that's the point of the universal `Sandbox` interface.

## Making changes within the sandbox

Now let's run a command against the mounted disk. Since each exec spins up a fresh container, we can't background a dev server and check on it later the way the other provider guides do — but the disk itself persists across calls, so writing a file in one command and reading it back in the next still works.

### Update /api/sandbox/route.ts

Add the following to your `app/api/sandbox/route.ts` file directly below this in your code:

```typescript
const sandbox = await compute.sandbox.create({ diskId });
```

#### Write a file with the filesystem method

```typescript
await sandbox.filesystem.writeFile('/mnt/hello.txt', 'Hello from Archil!');
```

#### Read it back with runCommand

```typescript
const result = await sandbox.runCommand('cat /mnt/hello.txt');
console.log(result.stdout); // "Hello from Archil!"
```

#### Return the output along with the sandboxId

```typescript
return NextResponse.json({
  sandboxId: sandbox.sandboxId,
  output: result.stdout,
});
```

#### Finished route.ts file

Your `/app/api/sandbox/route.ts` file should look like this now:

```typescript
import { NextResponse } from 'next/server';
import { archil } from '@computesdk/archil';

const compute = archil({
  apiKey: process.env.ARCHIL_API_KEY,
  region: process.env.ARCHIL_REGION,
});

export async function POST() {

  const diskId = process.env.ARCHIL_DISK_ID;
  if (!diskId) throw new Error('ARCHIL_DISK_ID is not set');

  const sandbox = await compute.sandbox.create({ diskId });

  // Write to the mounted disk
  await sandbox.filesystem.writeFile('/mnt/hello.txt', 'Hello from Archil!');

  // Read it back — a fresh container, same disk
  const result = await sandbox.runCommand('cat /mnt/hello.txt');
  console.log(result.stdout); // "Hello from Archil!"

  return NextResponse.json({
    sandboxId: sandbox.sandboxId,
    output: result.stdout,
  });
}
```

## Testing it out

Now, after you click the "Create Archil Sandbox" button on your localhost homepage you should:

1. See a `sandboxId` logged in your terminal for the handle attached to your disk.
2. See `Hello from Archil!` logged and returned in the JSON response — confirming the write and read both landed on the same mounted disk, even though they ran in separate containers.

There's no live browser preview in this guide, and calling `sandbox.destroy()` is a no-op here — Archil manages your disk's lifecycle outside of ComputeSDK. If your use case needs a live preview or a long-running VM, E2B, Daytona, CodeSandbox, Blaxel, Hopx, Runloop, or Modal are all better fits today.

## Congrats! You've successfully created your first sandbox application

You have done the following:

- attached a ComputeSDK sandbox to an existing Archil disk
- used our runCommand and filesystem methods (these work with any provider that supports them)
- confirmed what Archil sandboxes do and don't support today (no `getUrl`, no persistent container — just a persistent disk)

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code for Archil, you can easily adjust this code to run in any sandbox provider — and if you need a live preview URL or a long-running VM, swapping to a provider that supports them is a one-line import change.

**Happy Sandboxing!**

Want to get sandboxes running in your application?\
Want to be added as a provider?\
Reach out to us at [email@computesdk.com](mailto:email@computesdk.com)
