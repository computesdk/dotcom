---
title: "How to run your first E2B sandbox"
description: "A step-by-step process for creating a sandbox with E2B, running a basic Vite app inside, and accessing it securely via the browser."
date: "2025-12-19"
tags: [how-to, sandboxes, e2b]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: false
---

<span style="font-size: 14px; font-style: italic;">You can clone <a href="https://github.com/dtice25/basic-sandbox-app" target="_blank">this repo</a>, update your credentials and run locally. Or check it out on <a href="https://stackblitz.com/edit/e2b" target="_blank">Stackblitz</a>.</span>

It feels like everyone is talking about running code inside of sandboxes these days.\
But how do you actually do that?\
Let's walk through the process of getting a basic application running inside an E2B sandbox.

## Why use E2B as your sandbox provider?

Simple, E2B is a favorite among sandbox providers. Very few can claim a similar level of popularity as E2B.\
They have a generous free offering.\
They offer plenty of credits to get familiar with sandboxes.\
And, they have the most intuitive sandbox management UI (in my opinion).\
**Let's see how we can easily run a basic Vite app inside of an E2B sandbox.**

## Let's start by creating a new Next.js project

Run this command in your terminal:

```bash
npx create-next-app@latest basic-sandbox-app
```

You can use all of the defaults when prompted.\
Once it has been created, be sure to create an `.env` file to add your necessary credentials to.

```bash
E2B_API_KEY=your_e2b_api_key
```

## Create an E2B account
<!-- markdownlint-disable-next-line MD033 -->
Create an E2B account <a href="https://e2b.dev/sign-up" target="_blank">here</a>.\
Once you have created an account, you'll need to get your E2B API key.\
Go to your dashboard -> API Keys -> "Create Key"
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/e2b-api-keys.png" alt="screenshot of E2B's API key management interface" title="E2B API keys page" />

Save your API key in your `.env` file to the `E2B_API_KEY` variable.

```bash
E2B_API_KEY=your_e2b_api_key
```

## Install ComputeSDK and the E2B provider

ComputeSDK ships as a small core package plus one package per provider, so you only install what you use.

```bash
npm install computesdk @computesdk/e2b
```

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

Import the `e2b` factory from `@computesdk/e2b` and pass it your API key. `compute.sandbox.create()` provisions a sandbox on E2B.

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { e2b } from '@computesdk/e2b';

const compute = e2b({
  apiKey: process.env.E2B_API_KEY,
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
        Create E2B sandbox
      </button>
    </div>
  );
}
```

### Now, our first test

Click the button on the main page.
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="300px" src="/nextjs-button-screenshot.png" alt="screenshot of next.js app button" title="sandbox test button" />

Then go to your E2B dashboard.\
In your sandboxes -> list, you should see a new sandbox created!

Success!

Inside, you will be able to see your filesystem.

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/e2b-filesystem.png" alt="screenshot of e2b sandbox filesystem" title="E2B Sandbox filesystem UI" />

## You've successfully created your first E2B sandbox

If you want to use another sandbox provider like Daytona or Modal, swap the import and factory call — install `@computesdk/daytona` and use `import { daytona } from '@computesdk/daytona'` instead, with that provider's own credentials. The rest of your code (`runCommand`, `filesystem`, `getUrl`) stays the same — that's the point of the universal `Sandbox` interface.

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
      allowedHosts: ['.e2b.app', '.e2b.dev', 'localhost', '127.0.0.1'],
    },
  })
  `;
  await sandbox.filesystem.writeFile('app/vite.config.js', viteConfig);
```

#### Run npm install using the runCommand method

`cwd` is an optional per-call override — if you don't pass one, commands run in whatever E2B's own sandbox default working directory is. We pass `cwd: 'app'` here simply because that's the subfolder we just scaffolded the Vite project into.

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

The hostname `getUrl()` returns is E2B's own sandbox domain, not a ComputeSDK-branded one — check your terminal's console output for the exact value it prints for your sandbox.

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
import { e2b } from '@computesdk/e2b';

const compute = e2b({
  apiKey: process.env.E2B_API_KEY,
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
      allowedHosts: ['.e2b.app', '.e2b.dev', 'localhost', '127.0.0.1'],
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

Now, after you click the "Create E2B Sandbox" button on your localhost homepage you should:

1. See a new sandbox created inside your E2B dashboard.
2. See a preview URL logged to your terminal — the exact domain is provided by E2B itself, not a shared ComputeSDK domain.
3. Finally, if you visit that URL you should see the boilerplate Vite React app running in your E2B sandbox!

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/sandbox-vite-app-in-browser.png" alt="screenshot of Vite app running in E2B sandbox via ComputeSDK" title="Basic Vite App in E2B sandbox" />

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created an E2B sandbox with ComputeSDK
- used our runCommand, writeFile, and getUrl methods (these work with any provider)
- ran a Vite app inside the sandbox
- accessed the app running within the sandbox through its preview URL

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code in E2B, you can easily adjust this code to run in any sandbox provider.

**Happy Sandboxing!**

Have questions?\
Want to be added as a provider?\
Reach out to us at [support@computesdk.com](mailto:support@computesdk.com)
