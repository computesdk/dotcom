---
title: Quick Start
description: Get going with ComputeSDK
sidebar:
    order: 1
---

#### Welcome 
Welcome to the ComputeSDK Quick Start Guide! This page will help you get up and running with ComputeSDK, providing a unified way to execute code in secure, isolated sandboxed environments across various cloud providers.

ComputeSDK offers a consistent TypeScript interface for code execution, abstracting away the complexities of different cloud compute providers like E2B, Vercel, Cloudflare, and Fly.io.

To begin, you'll need to install the core ComputeSDK package and any provider-specific packages you plan to use. You only need to install the providers you intend to use.

### Installation

```bash
# Core SDK
npm install computesdk

# Provider packages (install only what you need)
npm install @computesdk/e2b
npm install @computesdk/vercel
npm install @computesdk/cloudflare
npm install @computesdk/fly

```

### Auto-detection

ComputeSDK's auto-detection feature simplifies usage by automatically identifying and utilizing the first available provider based on your environment variables. This is the recommended way to get started for most use cases.

```typescript
import { ComputeSDK } from 'computesdk';

// Automatically detects and uses the first available provider
const sandbox = ComputeSDK.createSandbox();

const result = await sandbox.execute('print("Hello World!")');
console.log(result.stdout);

// It's good practice to kill the sandbox when you're done with it
await sandbox.kill();
```

### Manual selection

While auto-detection is convenient, you might sometimes need to explicitly specify a provider. This is useful when you have specific requirements for a particular cloud environment or want to ensure a certain provider is used.

```typescript
import { e2b } from '@computesdk/e2b';
import { executeSandbox } from 'computesdk';

// Execute code using the E2B provider specifically
const result = await executeSandbox({
  sandbox: e2b(), // Initialize the E2B provider
  code: 'print("Hello from E2B!")'
});

console.log(result.stdout);
```

### Filesystem

ComputeSDK provides a comprehensive sandbox.filesystem interface that allows you to perform common file and directory operations within your sandboxed environment, regardless of the underlying cloud provider.

```typescript
import { ComputeSDK } from 'computesdk';

const sandbox = ComputeSDK.createSandbox();

// Create a directory
await sandbox.filesystem.mkdir('/app/data');

// Write content to a file
await sandbox.filesystem.writeFile('/app/data/message.txt', 'This is a test message.');

// Read content from the file
const content = await sandbox.filesystem.readFile('/app/data/message.txt');
console.log('File content:', content);

// List directory contents
const entries = await sandbox.filesystem.readdir('/app/data');
console.log('Directory entries:', entries.map(e => e.name));

await sandbox.kill();
```

### Error handling

Robust error handling is built into ComputeSDK. You can catch specific error types to manage issues like execution failures, timeouts, or authentication problems.
