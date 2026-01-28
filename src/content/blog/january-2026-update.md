---
title: "Announcing ComputeSDK 2.0 with Sandbox Gateway"
description: "Version 2 of ComputeSDK now includes our Sandbox Gateway, which allows you to use any sandbox or cloud provider without changing a single line of code."
date: "2026-01-29"
tags: [sandboxes, developer-tools, providers]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: true
---
## Improving sandbox management

We believe that sandboxes are the next primitive of compute, much like containers were a decade ago. When we started ComputeSDK, our goal was to make the universal interface for the sandbox primitive. Version 1.0 was an SDK that allowed developers to use our unified SDK across many sandbox providers with minimal changes to their codebase.

However, version 1 of our SDK was limited by existing sandbox providers. We realized that many people don’t just want to use existing sandbox companies (E2B, Daytona, Modal), but would prefer to use their existing cloud infrastructure (Railway, AWS, GCP, etc).

Back in November, we [launched](https://www.computesdk.com/blog/november-2025-update/) our own daemon that allowed all of those cloud providers to have the same universal interface as the sandbox providers do. This was a huge step in the right direction. But we still needed an orchestration layer so that we could realize our vision of being able to run sandboxes *literally* anywhere.

## The new Sandbox Gateway

So, today we are excited to introduce version 2 of ComputeSDK, which has our Sandbox Gateway built into it as a first-class citizen. Our Sandbox Gateway allows you to use the same implementation with ANY provider, including your existing cloud, by simply bringing your own keys. This is a huge step forward for seamless sandbox management. Now you don’t have to change *any* code to change providers, just your environment variables.

``` javascript
import { compute } from 'computesdk';

// ComputeSDK Gateway auto-detects provider environment variables
const sandbox = await compute.sandbox.create();

const result = await sandbox.runCode('print("Hello!")');
console.log(result.output); // "Hello!"

await compute.sandbox.destroy(sandbox.sandboxId);
```

## More sandbox features in v2.0


### Namespaces

Namespaces allow you to create multiple sandboxes inside of a sandbox (or VM) for a specific user, project, or entity.


### Servers

Servers are managed processes inside of a sandbox.


### Overlays

Overlays allow you to specify a source directory and target directory and copy files into it.


#### Example usage of Namespaces, Servers, & Overlays on sandbox creation

``` javascript
sandbox = await compute.sandbox.create({
    name: devServerId,
    namespace: organizationId,
    ...config,
    envs,
    timeout: minDurationMs,
    metadata: { devServerId, projectGroupId },
    // directory: SANDBOX_ROOT,
    overlays: [
    {
        source: SANDBOX_ROOT + "/" + WEB_APP_ROOT,
        target: "apps/web",
    },
    {
        source: SANDBOX_ROOT + "/" + MOBILE_APP_ROOT,
        target: "apps/mobile",
    }
    ],
    servers: [
    {
        port: 4000,
        slug: RUNTIME_SLUGS[RuntimeEnvironment.REACT],
        start: 'bun run dev',
        path: WEB_APP_ROOT,
        restart_policy: 'always',
    },
    {
        slug: RUNTIME_SLUGS[RuntimeEnvironment.EXPO],
        start: 'npx expo start --port 8081',
        path: MOBILE_APP_ROOT,
        port: 8081,
        restart_policy: 'always',
    },
    ],
});
const readySandbox = await sandbox.ready();
```

We're excited to keep improving your sandbox experience!

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