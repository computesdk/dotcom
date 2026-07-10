---
title: "Announcing compute.fm, built almost entirely with Factory.ai"
description: "We launched compute.fm, a low-maintenance, always-on internet radio station for builders, and we built nearly the whole thing by delegating to a Factory.ai Droid from Slack."
date: "2026-07-10"
tags: [announcement, compute-fm, factory-ai, ai-agents]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: true
---
## Say hello to compute.fm

Today we're launching [compute.fm](https://www.compute.fm), a licensed, always-on internet radio station for people who build. It's deep-focus music for shipping code, with a clean player, light and dark themes, and now-playing metadata pulled live from our streaming backend. Tune in, get in the zone, and let it run in the background while you work.

But the station itself isn't the most interesting part of this post. The most interesting part is *how* we built it: almost the entire thing was written by a [Factory.ai](https://factory.ai) Droid that we delegated to from Slack.

## We built it from Slack

The whole project started as a single Slack message: "build me a low-management internet radio station." From there, a Factory Droid picked up the thread and did the work, end to end.

The workflow was deceptively simple. We'd describe what we wanted in plain English in a Slack thread, and the Droid would go off, clone the repo, make the change, open a pull request, deploy a preview, verify it in a headless browser, and report back with a link. We reviewed, gave feedback like "put the brandmark and the wordmark on the same line" or "the music isn't actually playing," and it iterated, again as real PRs against `main`.

Every meaningful piece of compute.fm landed this way:

- A Next.js + TypeScript + Tailwind app, scaffolded and styled from scratch.
- A licensed streaming backend, proxied server-side to work around browser CORS restrictions, with metadata polling every 10 seconds.
- A CSS-variable theming system with light and dark modes and a segmented pill toggle.
- Cross-tab playback coordination so the same stream doesn't blast out of five open tabs at once.
- A song-request feature, where a marker in the track title is parsed into a "Requested by @handle" chip.
- The whole ComputeSDK brand treatment, logomark, colors, favicon, and partner sidebar.

## The parts that show the difference

A few moments made it obvious this was a genuinely different way to build.

**It debugged its own regressions.** After we shipped autoplay handling, we noticed the stream would play but stay silent. We just said "the music isn't actually playing," and the Droid traced it to the real root cause: the autoplay fallback set the audio element's `muted` property to satisfy browser autoplay policy, but the "Tune In" button only ever adjusted volume, so playback continued muted. It made the mute state authoritative, reset it on Tune In, and verified the fix in a headless browser before reporting back.

**It handled the browser's autoplay rules honestly.** When we asked "so fundamentally you have to click Tune In?", it explained the actual constraint, that browsers block unmuted autoplay without a user gesture, and implemented a sensible fallback: start muted automatically, then unmute on the first interaction anywhere on the page.

**It parsed song requests with a small, contained change.** Requesters are encoded in the track title and pulled out with a regex, then rendered as a chip that links to the requester's profile:

```javascript
// Marker like "{req:@handle}" or "[req:@handle]" in the track title
const REQUESTER_RE = /[\[{]\s*req:\s*@?([A-Za-z0-9_]{1,15})\s*[\]}]/i;

const match = title.match(REQUESTER_RE);
const requestedBy = match ? match[1] : undefined;
const cleanTitle = title.replace(REQUESTER_RE, "").trim();
```

Small, well-scoped, and shipped as its own reviewable diff, which is exactly how we'd want a teammate to do it.

## Why this matters to us

ComputeSDK is a company about compute primitives and the infrastructure that makes them universal. compute.fm is a fun, useful side project, but it's also a proof point for something we believe deeply: agents like Factory's Droids are becoming real contributors, not just autocomplete. When an agent can take a one-line request in Slack, open a PR, deploy a preview, verify it in a browser, and fix its own bugs, the bottleneck stops being "typing the code" and becomes "deciding what to build."

That's a great fit with where we're headed. The same sandbox and compute primitives we build ComputeSDK around are exactly what these agents need to run safely and at scale.

So: put on [compute.fm](https://www.compute.fm), get some work done, and know that the station you're listening to was mostly written by an AI agent working out of a Slack thread.

— Garrison Snelling & The ComputeSDK Team

---

*Thanks for reading!*
<br>
*Find more in our [Documentation](https://www.computesdk.com/docs/getting-started/introduction)*
<br>
*[Contact Us](https://www.computesdk.com/contact) with any questions*
<br>
Follow us on [X](https://x.com/computesdk) to stay updated.
