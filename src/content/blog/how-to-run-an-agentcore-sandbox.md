---
title: "How to run an AWS Bedrock AgentCore sandbox"
description: "A step-by-step process for creating a sandbox with AWS Bedrock AgentCore and running code inside it."
date: "2026-07-13"
tags: [how-to, sandboxes, agentcore]
author: "David Tice"
role: "Head of Product"
image: "/david-tice-sq.jpeg"
featured: false
---

AWS Bedrock AgentCore Code Interpreter provides secure, fully-managed, session-based sandboxes for running code and shell commands, with no infrastructure to provision. A ComputeSDK sandbox maps onto an AgentCore Code Interpreter session.
Let's walk through the process of creating an AgentCore sandbox and running code inside it.

## Why use AgentCore as your sandbox provider?

- Fully-managed, session-based sandboxes — no infrastructure to provision, and no separate account signup since it rides on your existing AWS account.
- Uses the standard AWS credential provider chain — the same resolution as the AWS CLI, so environment variables, SSO sessions, named profiles, and instance roles all work, including temporary credentials.
- A good fit if your workloads already run on AWS and you want sandboxes under the same IAM boundary.

> **A note before you start:** AgentCore Code Interpreter has no inbound network endpoint, so `getUrl()` throws — there's no live browser preview in this guide. Commands are request/response, not an interactive PTY, and **each `runCommand` call runs in a fresh shell** — `cd`, `export`, and shell variables don't carry over between calls (chain steps in one command, or use the `cwd`/`env` options). `{ background: true }` also doesn't outlive the call — AgentCore terminates the process tree when the invocation ends. This guide sticks to synchronous `runCommand` and `filesystem` calls instead of a backgrounded dev server.

**Let's see how we can create an AgentCore sandbox and run some code inside it.**

## Let's start by creating a new Next.js project

Run this command in your terminal:

```bash
npx create-next-app@latest agentcore-basic
```

You can use all of the defaults when prompted.

### Create an .env file
Once it has been created, be sure to create an `.env` file to add your necessary configuration to.

```bash
AWS_REGION=us-west-2
```

### Install ComputeSDK and the AgentCore provider

ComputeSDK ships as a small core package plus one package per provider, so you only install what you use.

```bash
cd agentcore-basic
npm install computesdk @computesdk/agentcore
```

## Configure your AWS credentials

There's no ComputeSDK-style account to sign up for here — AgentCore uses the standard [AWS credential provider chain](https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html), the same resolution the AWS CLI uses. If you already have AWS credentials configured locally (via `aws configure`, SSO, or an instance role), you're set. Otherwise, set the usual AWS environment variables:

```bash
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
# AWS_SESSION_TOKEN=your_session_token   # only if using temporary credentials
```

Your credentials need the following IAM permissions:

```
bedrock-agentcore:StartCodeInterpreterSession
bedrock-agentcore:InvokeCodeInterpreter
bedrock-agentcore:StopCodeInterpreterSession
bedrock-agentcore:GetCodeInterpreterSession
bedrock-agentcore:ListCodeInterpreterSessions
```

A region is required — set it via `AWS_REGION` (or `AWS_DEFAULT_REGION`) in your `.env` file, or pass it directly in config.

## Now we'll move on to creating the actual sandbox logic

### We need to create the API route to create the sandbox

Import the `agentcore` factory from `@computesdk/agentcore` and pass it your region. `compute.sandbox.create()` starts an AgentCore Code Interpreter session.\
Create a new `route.ts` file in `app/api/sandbox` and paste the following code:

```typescript
// app/api/sandbox/route.ts
import { NextResponse } from 'next/server';
import { agentcore } from '@computesdk/agentcore';

const compute = agentcore({
  region: process.env.AWS_REGION,
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
        Create AgentCore sandbox
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

Check your terminal output — you should see a `sandboxId` logged for the new AgentCore Code Interpreter session.

Success!

## You've successfully created your first AgentCore sandbox

If you want to use another sandbox provider like E2B or Daytona, swap the import and factory call — install `@computesdk/e2b` and use `import { e2b } from '@computesdk/e2b'` instead, with that provider's own credentials. The rest of your code (`runCommand`, `filesystem`) stays the same — that's the point of the universal `Sandbox` interface.

## Making changes within the sandbox

Now, let's run some code inside the sandbox. Since AgentCore sessions don't support a backgrounded dev server or `getUrl()`, we'll write a file and execute it in one shot instead of standing up a Vite preview.

### Update /api/sandbox/route.ts

Add the following to your `app/api/sandbox/route.ts` file directly below this in your code:

```typescript
const sandbox = await compute.sandbox.create();
```

#### Write a file with the filesystem method

Files persist for the life of the session, even though each `runCommand` call runs in a fresh shell.

```typescript
await sandbox.filesystem.writeFile('/tmp/hello.py', 'print("Hello from AgentCore!")');
```

#### Run it with runCommand

```typescript
const result = await sandbox.runCommand('python3 /tmp/hello.py');
console.log(result.stdout); // "Hello from AgentCore!"
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
import { agentcore } from '@computesdk/agentcore';

const compute = agentcore({
  region: process.env.AWS_REGION,
});

export async function POST() {

  const sandbox = await compute.sandbox.create();

  // Files persist for the life of the session
  await sandbox.filesystem.writeFile('/tmp/hello.py', 'print("Hello from AgentCore!")');

  // Each runCommand call runs in a fresh shell, but the filesystem persists between calls
  const result = await sandbox.runCommand('python3 /tmp/hello.py');
  console.log(result.stdout); // "Hello from AgentCore!"

  return NextResponse.json({
    sandboxId: sandbox.sandboxId,
    output: result.stdout,
  });
}
```

## Testing it out

Now, after you click the "Create AgentCore Sandbox" button on your localhost homepage you should:

1. See `Hello from AgentCore!` logged to your terminal and returned in the JSON response.
2. Confirm the session eventually auto-terminates after its idle timeout — AgentCore sessions aren't meant to be kept alive indefinitely, so create a new sandbox for each unit of work.

There's no live browser preview in this guide — AgentCore Code Interpreter has no inbound network endpoint. If your use case needs a live preview, E2B, Daytona, CodeSandbox, Blaxel, Hopx, Runloop, or Modal are all better fits today.

## Congrats! You've successfully created your first sandbox application

You have done the following:

- created an AgentCore sandbox with ComputeSDK, authenticated entirely through your existing AWS credentials
- used our runCommand and filesystem methods (these work with any provider that supports them)
- confirmed what AgentCore sandboxes do and don't support today (no `getUrl`, no cross-call background processes, fresh shell per command)

ComputeSDK makes it easy to standardize this process across providers.\
So now that you've written this code for AgentCore, you can easily adjust this code to run in any sandbox provider — and if you need a live preview URL or persistent background processes, swapping to a provider that supports them is a one-line import change.

**Happy Sandboxing!**

Want to get sandboxes running in your application?\
Want to be added as a provider?\
Reach out to us at [email@computesdk.com](mailto:email@computesdk.com)
