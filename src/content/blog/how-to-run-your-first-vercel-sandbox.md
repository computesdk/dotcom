---
title: "How to run your first Vercel sandbox"
description: "A step-by-step process for creating a sandbox with Vercel, running a basic Vite app inside, and accessing it securely via the browser."
date: "2026-01-30"
tags: [how-to, sandboxes, vercel]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: false
---

<span style="font-size: 14px; font-style: italic;">You can clone <a href="https://github.com/computesdk/examples/tree/main/vercel-basic" target="_blank">this repo</a> and update your credentials to run locally.</span>
<span style="font-size: 14px; font-style: italic;">Or, just deploy this example with Vercel:</span>
<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcomputesdk%2Fexamples%2Ftree%2Fmain%2Fvercel-basic" target="_blank">
  <img src="https://vercel.com/button" alt="Deploy with Vercel"/>
</a>

Want to use Vercel sandboxes to run AI-generated code? ComputeSDK makes it easy.
Let's walk through the process of getting a basic application running inside a Vercel sandbox.

## Why use Vercel as your sandbox provider?

Vercel is known for its globally distributed serverless infrastructure and developer-friendly experience.\
If you're already using Vercel for deployments, using them as a sandbox provider integrates seamlessly into your existing workflow.\
They offer excellent performance with edge computing capabilities and automatic SSL.\
**Let's see how we can easily run a basic Vite app inside of a Vercel sandbox.**

## Let's start by creating a new Next.js project

Run this command in your terminal:

```bash
npx create-next-app@latest vercel-basic
```

You can use all of the defaults when prompted.\
Once it has been created, be sure to create an `.env` file to add your credentials to.\
Add these credentials to your `.env` file and keep reading to learn how to create them.

```bash
COMPUTESDK_API_KEY=your_computesdk_api_key
VERCEL_TEAM_ID=your_vercel_team_id
VERCEL_PROJECT_ID=your_vercel_project_id
VERCEL_TOKEN=your_vercel_token
```

## Now install the ComputeSDK package

```bash
npm install computesdk
```

## Create a ComputeSDK account

<!-- markdownlint-disable-next-line MD033 -->
Create an account on our <a href="https://console.computesdk.com/register" target="_blank">signup page</a>.\
Once you have created your ComputeSDK account, you'll need to generate an API key.\
Click "API Keys" in the left-hand navigation → "Create API Key"
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/compute-api-keys.png" alt="screenshot of ComputeSDK's API key management interface" title="ComputeSDK API keys page" />

Save your API key in your `env.local` file to the `COMPUTESDK_API_KEY` variable.

```bash
COMPUTESDK_API_KEY=your_computesdk_api_key
```

## Create a Vercel account

<!-- markdownlint-disable-next-line MD033 -->
If you don't already have one, create a Vercel account <a href="https://vercel.com/signup" target="_blank">here</a>.

## Create a Vercel project

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 24px auto; border-radius: 10px;" width="700px" src="/blog/vercel/vercel-createproject-screenshot.png" alt="Screenshot of Vercel's create project page" title="Vercel's project creation page" />

We only need the project for Vercel's sandbox functionality, so it doesn't really matter what you deploy as to your project. But here are a few good options.
1. Clone this <a href="https://github.com/computesdk/examples/tree/main/vercel-basic" target="_blank">this repo</a>.
2. Use Vercel's Next.js Boilerplate
3. Use one of your existing Git repositories
4. [Deploy a copy of this app on Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcomputesdk%2Fexamples%2Ftree%2Fmain%2Fvercel-basic)

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 24px auto; border-radius: 10px;" width="700px" src="/blog/vercel/vercel-teamid-screenshot.png" alt="Screenshot of Vercel's project settings page" title="Vercel's general settings page" />

Once you have created a Vercel project, you'll need to gather your Vercel credentials:

1. **Team ID**: Found in your Team Settings (if using a team account)
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 24px auto; border-radius: 10px;" width="700px" src="/blog/vercel/vercel-teamid-screenshot.png" alt="Screenshot of Vercel's project settings page" title="Vercel's general settings page" />

2. **Project ID**: Found in your Project Settings → General
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 24px auto; border-radius: 10px;" width="700px" src="/blog/vercel/vercel-projectid-screenshot.png" alt="Screenshot of Vercel's project settings page" title="Vercel's project settings page" />

3. **Vercel Token**: Go to your Account Settings → Tokens → Create Token
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 24px auto; border-radius: 10px;" width="700px" src="/blog/vercel/vercel-token-screenshot.png" alt="Screenshot of Vercel's account settings page" title="Vercel's account settings page" />

Save these values in your `.env` file.

```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_vercel_team_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

ComputeSDK makes this easy, just import the basic `computesdk` package.\
ComputeSDK auto-detects your sandbox provider variables from your .env file

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { compute } from 'computesdk';

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
        Create Vercel sandbox
      </button>
    </div>
  );
}
```

### Now, our first test

Click the button on the main page.
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="300px" src="/blog/vercel/vercel-basic-home-screenshot.png" alt="screenshot of next.js app button" title="sandbox test button" />

Now navigate to your Vercel project -> sandboxes.

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 24px auto; border-radius: 10px;" width="700px" src="/blog/vercel/vercel-sandboxes-screenshot.png" alt="Screenshot of Vercel's sandboxes page" title="Vercel's sandboxes page" />

You should see a running sandbox.\
Success!

ComputeSDK automatically installs our lightweight daemon upon sandbox creation. There should already be a `.compute/sandboxes/unique-sandbox-id` subfolder created in your sandbox. This is where you can run applications in your sandbox and automatically access them via the browser through our secure tunnel.

## You've successfully created your first Vercel sandbox

If you want to use another sandbox provider like E2B or Daytona, all you need to do is change your provider variables. ComputeSDK automatically detects your sandbox provider from your environment variables.

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
      allowedHosts: ['.vercel.app', 'localhost', '127.0.0.1', '.computesdk.com'],
    },
  })
  `;
  await sandbox.filesystem.writeFile('app/vite.config.js', viteConfig);
```

#### Run npm install using the runCommand method

runCommand runs at the sandbox subfolder by default.
(e.g., `/.compute/unique_sandbox_id/commands_run_here`)\
So we need to cd into /app before we run npm install or start our Vite server.

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
import { compute } from 'computesdk';

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
      allowedHosts: ['.vercel.app', 'localhost', '127.0.0.1', '.computesdk.com'],
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

Here is an overview of our project now:
1. Uses ComputeSDK to create a sandbox in Vercel
2. Uses ComputeSDK's daemon to create a basic Vite app
3. Uses ComputeSDK to run a dev server (port 5173) on the sandbox
4. Uses ComputeSDK to connect to the Vite app running on the 5173 port in our browser.

Now, after you click the "Create Vercel Sandbox" button on your localhost homepage you should:

1. See a sandbox running in your Vercel project -> Sandboxes tab.

2. See a preview URL in your activity logs (if running on Vercel).
<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 24px auto; border-radius: 10px;" width="700px" src="/blog/vercel/vercel-logs-screenshot.png" alt="Screenshot of Vercel's logs page" title="Vercel's logs page" />

3. See a preview URL like this in your terminal (if you're running locally):\
`unique-sandbox-id-5173.preview.computesdk.com`
4. If you visit that URL you should see the boilerplate Vite React app running in your Vercel sandbox!

<!-- markdownlint-disable-next-line MD033 -->
<img style="margin: 12px auto; border-radius: 10px;" width="700px" src="/sandbox-vite-app-in-browser.png" alt="screenshot of Vite app running in Vercel sandbox via ComputeSDK" title="Basic Vite App in Vercel sandbox" />

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created a Vercel sandbox with ComputeSDK
- used our runCommand, writeFile, and getUrl methods (these work with any provider)
- ran a Vite app inside the sandbox
- accessed the app running within the sandbox through our secure tunnel

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code in Vercel, you can easily adjust this code to run in any sandbox provider.

**Happy Sandboxing!**

[Sign up with ComputeSDK](https://console.computesdk.com/register)

Want to get sandboxes running in your application?\
Want to be added as a provider?\
Reach out to us at [email@computesdk.com](mailto:email@computesdk.com)
