---
title: "How to run your first E2B sandbox"
description: "A step-by-step process for creating a sandbox with E2B, running a basic Vite app inside, and accessing it securely via the browser."
date: "2025-12-19"
tags: [how-to, sandboxes, e2b]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: true
---
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
Once it has been created, be sure to create an `env.local` file to add your necessary credentials to.

```bash
E2B_API_KEY=your_e2b_api_key
COMPUTESDK_API_KEY=your_computesdk_api_key
```

<!-- markdownlint-disable-next-line MD033 -->
*Want to skip all of this talk? You can just clone <a href="https://github.com/dtice25/basic-sandbox-app" target="_blank">this repo</a>, update your .env.local with your ComputeSDK & E2B credentials and run it. You're welcome!*

## Create an E2B account
<!-- markdownlint-disable-next-line MD033 -->
Create an E2B account <a href="https://e2b.dev/sign-up" target="_blank">here</a>.\
Once you have created an account, you'll need to get your E2B API key.\
Go to your dashboard -> API Keys -> "Create Key"
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/e2b-api-keys.png" alt="screenshot of E2B's API key management interface" title="E2B API keys page" />

Save your API key in your `env.local` file to the `E2B_API_KEY` variable.

```bash
E2B_API_KEY=your_e2b_api_key
```

## Create a ComputeSDK account
<!-- markdownlint-disable-next-line MD033 -->
Create an account at our <a href="https://console.computesdk.com/register" target="_blank">signup page</a>.\
Once you have created your ComputeSDK account, you'll need to generate an API key.\
Click "API Keys" in the left-hand navigation -> "Create API Key"
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/compute-api-keys.png" alt="screenshot of ComputeSDK's API key management interface" title="ComputeSDK API keys page" />

Save your API key in your `env.local` file to the `COMPUTESDK_API_KEY` variable.

```bash
COMPUTESDK_API_KEY=your_computesdk_api_key
```

## Install the necessary packages

```bash
npm install computesdk @computesdk/e2b
```

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

ComputeSDK makes this easy, just import the basic `computesdk` package & the specific provider package.\
More [documentation](https://www.computesdk.com/docs/providers/e2b/#with-computesdk).

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { createCompute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export async function POST() {
  const compute = createCompute({
    provider: e2b({
      apiKey: process.env.E2B_API_KEY!,
      timeout: 300000, // 5 minutes for testing
    }),
    apiKey: process.env.COMPUTESDK_API_KEY,
  });

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

ComputeSDK automatically installs our lightweight daemon upon sandbox creation. There should already be a `.compute/sandboxes/unique-sandbox-id` subfolder created in your sandbox. This is where you can run applications in your sandbox and automatically access them via the browser through our secure tunnel.

## You've successfully created your first E2B sandbox

If you wanted to do this with another sandbox provider, like Daytona, all you need to do is:

1. Install the new provider package

    ```bash
    npm install @computesdk/daytona
    ```

2. Import the new provider package in your API route file

    ```typescript
    import { daytona } from '@computesdk/daytona'
    ```

3. Update your environment variables

    ```bash
    DAYTONA_API_KEY=your_daytona_api_key_here
    ```

4. Change your `createCompute` logic to use new provider

    ```typescript
    export async function POST() {
    const compute = createCompute({
        provider: daytona({
        apiKey: process.env.DAYTONA_API_KEY!,
        timeout: 300000, // 5 minutes for testing
        }),
        apiKey: process.env.COMPUTESDK_API_KEY,
    });

    const sandbox = await compute.sandbox.create();

    return NextResponse.json({ 
        sandboxId: sandbox.sandboxId,
    });
    }
    ```

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
await sandbox.runCommand('npm', ['create', 'vite@5', 'app', '--', '--template', 'react']);
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
      allowedHosts: ['.e2b.app', '.e2b.dev', 'localhost', '127.0.0.1', '.computesdk.com'],
    },
  })
  `;
  await sandbox.filesystem.writeFile('app/vite.config.js', viteConfig);
```

#### Run npm install using the runCommand method

runCommand runs at the sandbox subfolder by default.
(i.e., `/.compute/unique_sandbox_id/commands_run_here`)\
So we need to cd into /app before we run npm install or start our Vite server.

```typescript
  // Install dependencies
  await sandbox.runCommand('cd app && npm install')
```

#### Start local dev server in the background with runCommand

```typescript
  // Start dev server
  sandbox.runCommand('cd app && npm run dev', [], {
    background: true,
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
import { createCompute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

export async function POST() {
  const compute = createCompute({
    provider: e2b({
      apiKey: process.env.E2B_API_KEY!,
      timeout: 300000, // 5 minutes for testing
    }),
    apiKey: process.env.COMPUTESDK_API_KEY,
  });

  const sandbox = await compute.sandbox.create();

  // Create basic Vite React app
  await sandbox.runCommand('npm', ['create', 'vite@5', 'app', '--', '--template', 'react']);

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
      allowedHosts: ['.e2b.app', '.e2b.dev', 'localhost', '127.0.0.1', '.computesdk.com'],
    },
  })
  `;
  await sandbox.filesystem.writeFile('app/vite.config.js', viteConfig);
  
  // Install dependencies
  await sandbox.runCommand('cd app && npm install')
  
  // Start dev server
  sandbox.runCommand('cd app && npm run dev', [], {
    background: true,
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
2. See a Vite app structure inside of your `home/user/.compute/sandboxes/unique-sandbox-id/` folder structure
3. See a preview URL in your terminal output like this:\
`unique-sandbox-id-5173.preview.computesdk.com`
4. Finally, if you visit that URL you should see the boilerplate Vite React app running in your E2B sandbox!

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/sandbox-vite-app-in-browser.png" alt="screenshot of Vite app running in E2B sandbox via ComputeSDK" title="Basic Vite App in E2B sandbox" />

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created an E2B sandbox with ComputeSDK
- used our runCommand, writeFile, and getUrl methods (these work with any provider)
- ran a Vite app inside the sandbox
- accessed the app running within the sandbox through our secure tunnel

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code in E2B, you can easily adjust this code to run in any sandbox provider.

**Happy Sandboxing!**

[Sign up with ComputeSDK](https://console.computesdk.com/register)

Want to get sandboxes running in your application?\
Want to be added as a provider?\
Reach out to us at [email@computesdk.com](mailto:email@computesdk.com)
