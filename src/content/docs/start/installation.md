---
title: Installation
description: Install ComputeSDK
---

#### Installation Guide

This guide provides detailed instructions on how to install the ComputeSDK core package and its various provider packages. Proper installation ensures you can leverage ComputeSDK's unified abstraction layer for secure, sandboxed code execution across multiple cloud providers.

### Core SDK Installation

The ComputeSDK core package provides the fundamental ComputeSDK class and the executeSandbox utility function, along with common interfaces and error types. It's the first step for any ComputeSDK project.

To install the core SDK, run the following command in your project directory:

```bash
npm install computesdk
```

### Provider Package Installation

ComputeSDK is designed to be modular. You only need to install the provider packages for the cloud compute services you intend to use. This keeps your project's dependencies lean and relevant.

Choose the provider(s) you need and install them using npm:

#### E2B Provider

```bash
npm install @computesdk/e2b
```

#### Vercel Provider

```bash
npm install @computesdk/vercel
```
#### Cloudflare Provider

```bash
npm install @computesdk/cloudflare
```

#### Fly.io Provider: (Note: This is currently a community target and may have evolving requirements.)

```bash
npm install @computesdk/fly
```

### Provider Setup: Environment Variables and Configuration

After installing the necessary packages, you'll need to configure your environment with the appropriate API keys and credentials for each provider. ComputeSDK relies on environment variables for auto-detection and authentication.

#### E2B (Fully Implemented)
For E2B, you need to set your API key as an environment variable.

```bash
export E2B_API_KEY=your_e2b_api_key
```

#### Vercel (Fully Implemented)
Vercel integration requires your Vercel API token, team ID, and project ID.

```bash
export VERCEL_TOKEN=your_vercel_token
export VERCEL_TEAM_ID=your_team_id
export VERCEL_PROJECT_ID=your_project_id
```

#### Cloudflare (Fully Implemented)
Cloudflare integration is typically used within a Cloudflare Workers environment and requires Durable Object bindings. You'll need to configure this in your wrangler.toml file.

```toml
name = "my-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
name = "my-worker-prod"
route = "example.com/*"

[[env.production.kv_namespaces]]
binding = "MY_KV"
id = "abc123..."

# ... other wrangler.toml configurations ...

[[durable_objects.bindings]]
name = "Sandbox" # This name should match the 'env.Sandbox' binding in your code
class_name = "SandboxDurableObject" # The name of your Durable Object class
script_name = "your-worker-script-name" # The name of the Worker script where the DO is defined
```

In your Cloudflare Worker code, you would pass the Durable Object binding to the Cloudflare provider:

import { cloudflare } from '@computesdk/cloudflare';

// 'env' would be passed to your Worker's fetch handler
const sandbox = cloudflare({
  env: { Sandbox: env.Sandbox }, // Durable Object binding
  runtime: 'python',             // 'python' or 'node'
  timeout: 300000,               // optional, defaults to 5 minutes
});

#### Fly.io (Community Target)
For Fly.io, you will need your Fly API token.

```bash
export FLY_API_TOKEN=your_fly_token
```

With these steps completed, your ComputeSDK environment should be ready for use. You can now proceed to the Quick Start Guide or API Reference to begin executing code in your chosen sandboxed environments.