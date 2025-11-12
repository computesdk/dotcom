---
title: "The Universal Sandbox Interface"
description: "ComputeSDK is a universal sandbox interface that lets you build, deploy, and interact with sandboxes across any provider using a single, consistent API."
date: "2025-11-12"
tags: [sandboxes, developer-tools, providers, ai]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: true
---
Around a year ago, I was building a K8s-based sandbox implementation for a large enterprise client who wanted to create their own on-prem AI builder (Lovable, Bolt, v0, etc). This is when I knew that the need for developers to be able to create sandboxes at-will was going to be the lynchpin for a world where AI-generated code was the norm. This is also when I ran headfirst into the problems developers face when using sandbox providers:

1. **Extreme dependency** - you are dependent on one provider’s reliability and feature set. If you are an AI builder, this is a suboptimal scenario where your revenue is fully tied to a specific sandbox provider because you depend on them for both the infrastructure and application layer.
2. **Lack of enterprise options** - how does a large company create their own self-hosted internal solution? They don’t. This slows them down dramatically in the race to implement AI in the workplace.
3. **Lack of flexibility** - why should you be dependent on one sandbox provider? Why not have the flexibility to easily switch providers? Or add a secondary provider for additional functionality? In an ideal world, you should be able to take the same application and use any sandbox or cloud provider.

Addressing any one of these issues is a massive undertaking, and it shouldn’t be. You should be able to easily use compute anywhere it’s available without affecting your business, your users, or your developers.

## That is why we are proud to announce the new capabilities of ComputeSDK.

ComputeSDK is a universal sandbox interface that lets you build, deploy, and interact with sandboxes anywhere using a single, consistent API. Our lightweight binary lives anywhere your compute lives - bare metal, VMs, containers, or your existing sandbox provider. This provides a consistent experience across all compute environments with some key benefits:
- Create sandboxes with any of our providers (more to come)
- Authenticated access to each sandbox instance from any client (browser, server, or application)
- Each sandbox instance has a secure, public URL out-of-the-box
- Full terminal access
- Full file-system access
- Real-time file watching
- WebSocket event system
- More details here

## Why would I use ComputeSDK?
The compute power needed to run AI-written code is not the bottleneck in implementing AI in a useful way. The bottleneck is in the setup, the configuration of the infrastructure, and the work it takes to update & improve that architecture. ComputeSDK decouples your application from your infrastructure - a separation of concerns, if you will. Our users are now able to focus on creating value in their core application (AI or otherwise), not fussing with decisions about the architecture of their sandbox infrastructure. **Now, with ComputeSDK, changing or adding sandbox providers is as simple as importing a new provider module and updating environment variables.**

## Focus on building
The need for sandboxes is exploding alongside the AI market. The companies that will win are the ones who can deliver the most value to their users. You can't afford to spend time working on complex integrations or debugging one-off APIs. You need ComputeSDK so you can focus on building your core product.

## How to use ComputeSDK:
Here’s how you can start with ComputeSDK today:
* [Sign up](https://console.computesdk.com/register) and play with sandboxes locally (your first 1,000 sandbox creations are free)
* [Sign up](https://console.computesdk.com/register) and use ComputeSDK in your application ([Read our docs](https://www.computesdk.com/docs/getting-started/introduction))
* [Talk to us](https://www.computesdk.com/contact) if you have questions or want help with implementation.

Example application usage:
``` javascript
import { createCompute } from 'computesdk';
import { e2b } from '@computesdk/e2b';

// Set default provider
const compute = createCompute({ 
  defaultProvider: e2b({ apiKey: process.env.E2B_API_KEY }) 
});

// Create a sandbox
const sandbox = await compute.sandbox.create();

// Get instance
const instance = sandbox.getInstance();

// Execute code
const result = await sandbox.runCode('print("Hello World!")');
console.log(result.stdout); // "Hello World!"

// Clean up
await compute.sandbox.destroy(sandbox.sandboxId);
```

Visit our [quick start page](https://www.computesdk.com/docs/getting-started/quick-start/) for more detailed instructions.

## Pricing
Compute is $97/month for 10,000 sandboxes, and then $0.0097 per sandbox creation after that.
We’ve made it simple to get started whether you’re just testing locally or ready to integrate into your production application. You can sign up for free and generate an API key [here](https://console.computesdk.com/register).

We're incredibly excited to see what you build.

— Garrison Snelling & The ComputeSDK Team

---

*Thanks for reading!*
<br>
*Find more in our [Documentation](https://www.computesdk.com/docs/getting-started/introduction)*
<br>
*[Contact Us](https://www.computesdk.com/contact) with any questions*
<br>
Follow us on [X](https://x.com/computesdk) to stay updated as we add more providers and features.
<br>
We are happy to talk with you if you have any questions or feedback!
