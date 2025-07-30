---
title: Cloudflare
description: Compute Cloudflare by Compute SDK.
sidebar:
    order: 4
---

#### ComputeSDK Cloudflare Provider Documentation
This guide provides detailed information on how to install, configure, and use the Cloudflare provider within ComputeSDK. The Cloudflare provider allows you to execute code in secure, isolated sandboxed environments on Cloudflare's infrastructure, particularly leveraging Cloudflare Workers and Durable Objects, all while maintaining the consistent ComputeSDK interface.

#### Overview
The @computesdk/cloudflare package integrates ComputeSDK with Cloudflare Workers and Durable Objects. This enables you to run sandboxed code directly on Cloudflare's edge network, benefiting from low latency and Cloudflare's robust infrastructure. This integration is particularly suited for applications already deployed on Cloudflare or those requiring edge-based execution.

### Installation
To use the Cloudflare provider, you need to install its dedicated package in addition to the core ComputeSDK.

```bash
npm install @computesdk/cloudflare
```

If you haven't already, also install the core SDK:

```bash
npm install computesdk
```

### Provider Setup
The Cloudflare provider typically operates within a Cloudflare Workers environment and requires a Durable Object binding to manage the sandbox state. You'll need to configure this in your wrangler.toml file and pass the Durable Object binding to the provider in your Worker code.

### wrangler.toml Configuration
Add a Durable Object binding to your wrangler.toml file. This defines the Durable Object that the ComputeSDK Cloudflare provider will use to manage sandboxes.

#### wrangler.toml ... other configurations for your Worker ...

[[durable_objects.bindings]]
name = "Sandbox" # This name must match the 'env.Sandbox' binding in your Worker code
class_name = "ComputeSandboxDurableObject" # The name of the Durable Object class you'll define
script_name = "your-worker-script-name" # The name of your Worker script (usually your project name)

### Durable Object Implementation (Worker Code)
You'll need to define the ComputeSandboxDurableObject class within your Cloudflare Worker. This class will handle the actual sandbox logic. A basic skeleton for this Durable Object is shown below. Note: The full implementation of the Durable Object logic is beyond the scope of this client-side documentation but is crucial for the provider to function.

```typescript
// src/index.ts (or wherever your Worker entry point is)

export interface Env {
  Sandbox: DurableObjectNamespace;
}

// Define your Durable Object class
export class ComputeSandboxDurableObject {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  // Handle requests to the Durable Object
  async fetch(request: Request) {
    // This is where the server-side logic for the sandbox would reside.
    // It would receive requests from the ComputeSDK client, execute code,
    // manage filesystem, etc.
    // For now, we'll just return a placeholder.
    return new Response("ComputeSDK Cloudflare Sandbox Durable Object is running!", { status: 200 });
  }
}

// Your Worker's main fetch handler
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Example: Route requests to the Durable Object
    const url = new URL(request.url);
    if (url.pathname.startsWith('/sandbox')) {
      let id = env.Sandbox.idFromName('compute-sandbox-instance'); // Use a consistent ID
      let stub = env.Sandbox.get(id);
      return stub.fetch(request);
    }

    return new Response("Welcome to ComputeSDK Cloudflare Worker!", { status: 200 });
  },
};
```

### Client-Side Configuration
In your client-side application, you pass the env.Sandbox Durable Object binding (which is available in your Worker's fetch handler) to the Cloudflare provider.

```typescript
import { cloudflare } from '@computesdk/cloudflare';

// 'env' would typically be passed to your Cloudflare Worker's fetch handler
// For local testing or if you're simulating the environment, you might mock 'env'
declare const env: { Sandbox: DurableObjectNamespace }; // This line is for type inference in client-side code

const sandbox = cloudflare({
  env: { Sandbox: env.Sandbox }, // Durable Object binding from your Worker's environment
  runtime: 'python',             // 'python' or 'node', defaults to 'python'
  timeout: 300000,               // optional, defaults to 5 minutes (300 seconds)
});

// Now you can execute code and perform filesystem operations
const result = await sandbox.execute('print("Hello from Cloudflare!")');
console.log(result.stdout);

await sandbox.kill();
```

env: Required. An object containing the Durable Object binding for your sandbox. The key (Sandbox in this example) must match the name field in your wrangler.toml binding.

runtime: (Optional) Specifies the runtime environment for the Cloudflare sandbox. Can be 'python' or 'node'. Defaults to 'python'.

timeout: (Optional) Sets the maximum execution time for the sandbox in milliseconds. Defaults to 5 minutes (300,000 ms).

### Usage
You can use the Cloudflare provider by explicitly initializing it as shown above. Auto-detection for Cloudflare typically requires a deployed Worker environment.

### Examples
Here are some practical examples demonstrating the use of the Cloudflare provider for code execution and filesystem operations.

#### Executing Python Code on Cloudflare
This example shows how to execute a simple Python script within the Cloudflare sandbox and retrieve its output.

```typescript
import { cloudflare } from '@computesdk/cloudflare';

// Assuming 'env' is available in your Cloudflare Worker context
declare const env: { Sandbox: DurableObjectNamespace };

const sandbox = cloudflare({ env: { Sandbox: env.Sandbox }, runtime: 'python' }); // Initialize Cloudflare sandbox with Python runtime

const result = await sandbox.execute(`
print('Hello from Cloudflare!')
import sys
print(f'Python version: {sys.version}')
`);
console.log(result.stdout);

await sandbox.kill();
```

#### Executing Node.js Code on Cloudflare
This example demonstrates executing a Node.js script within the Cloudflare sandbox.

```typescript
import { cloudflare } from '@computesdk/cloudflare';

// Assuming 'env' is available in your Cloudflare Worker context
declare const env: { Sandbox: DurableObjectNamespace };

const sandbox = cloudflare({ env: { Sandbox: env.Sandbox }, runtime: 'node' }); // Initialize Cloudflare sandbox with Node.js runtime

const result = await sandbox.execute(`
console.log('Node.js version:', process.version);
console.log('Hello from Cloudflare Sandbox!');
`);
console.log(result.stdout);

await sandbox.kill();
```

### Filesystem Operations with Cloudflare
The sandbox.filesystem interface works identically across all providers, including Cloudflare. This example shows basic file operations.

```typescript
import { cloudflare } from '@computesdk/cloudflare';

// Assuming 'env' is available in your Cloudflare Worker context
declare const env: { Sandbox: DurableObjectNamespace };

const sandbox = cloudflare({ env: { Sandbox: env.Sandbox } }); // Initialize Cloudflare sandbox

// Create a directory
await sandbox.filesystem.mkdir('/data/cloudflare-temp');

// Write content to a file
const filePath = '/data/cloudflare-temp/log.txt';
await sandbox.filesystem.writeFile(filePath, 'This is a log entry from Cloudflare sandbox.');
console.log(`File written to ${filePath}`);

// Read content from the file
const content = await sandbox.filesystem.readFile(filePath);
console.log('Content read:', content);

// List directory contents
const entries = await sandbox.filesystem.readdir('/data/cloudflare-temp');
console.log('Directory entries:', entries.map(e => e.name));

// Remove the file
await sandbox.filesystem.remove(filePath);
console.log(`File removed: ${filePath}`);

await sandbox.kill();
```

This documentation page provides a comprehensive guide to using the ComputeSDK Cloudflare provider. Remember that the full functionality relies on a properly configured Cloudflare Worker and Durable Object. For more general information on ComputeSDK's core features, such as error handling or other providers, please refer to the main ComputeSDK documentation.