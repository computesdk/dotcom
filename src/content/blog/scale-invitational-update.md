---
title: "What 100,000 concurrent sandboxes has taught us so far"
description: "An honest look at our experience building a 100,000 concurrent sandbox test."
date: "2026-06-04"
tags: [sandboxes, benchmarks, scaling]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: true
---

# What 100,000 Sandboxes Taught Us

<br>

**tl;dr** *We have moved the Scale Invitational to **June 17th** after underestimating the complexity of orchestrating and measuring 100,000 sandboxes **concurrently**.*

<br>

The Scale Invitational was meant to answer a simple question: "when an app needs to spin up tens of thousands of sandboxes at once, how do providers hold up?"

Our daily benchmark already measures cold-start time, staggered ramp, and small-scale burst behavior across providers. But "small-scale" is the operative word — a few hundred sandboxes from a single runner tells you almost nothing about what happens at scale. So we decided to run a 100,000-sandbox test.

What we did *not* expect was how much we'd learn before ever running the test.

This post is a candid look at the problems we ran into, the course-corrections, and why we're deliberately taking our time before publishing a single 100k number.


---

## v1: 10,000 iterations from one very busy VM

The first version was the obvious one. Take the benchmark we already trust, crank up the iteration count, and point it at a single beefy VM. We pushed it up toward 10,000 sandbox creations from one machine and watched it work.

It *worked* — right up until it didn't tell us anything useful.

A single VM has a single network stack, a single event loop, and a single egress IP. Long before you reach interesting provider behavior, you start measuring **your own machine's limits**. The numbers we got back were as much a portrait of our test rig as of any provider.

That was lesson one: **at scale, the test harness becomes part of the experiment.** If you can't rule out your own bottlenecks, you can't publish.

---

## Spreading the load (aka sharding)

When we shared early v1 results, the consistent feedback was: *you're concentrating load in a way no real workload would, and you're capping out your own box.* A genuine high-concurrency workload is distributed.

So we re-architected around **sharding**. Instead of one VM doing 10k, a logical burst is split across many VMs, each running a slice of the total. The coordinator on each VM now carries shard metadata so that independently-launched machines know they're part of one larger run and their results can be stitched back together afterward.

This removed the single-machine ceiling and, just as importantly, made the test look more like the thing we're actually trying to measure.

---

## Finding the sweet spot: ~100 iterations per shard

Sharding raised an immediate tuning question: *how much work per VM?*

Too much per shard and you're back to v1's problem — each VM becomes its own bottleneck and you're measuring the rig again. Too little and you're paying to provision, boot, and coordinate an enormous fleet of VMs for a trivial slice of work each, which is wasteful and adds its own orchestration noise.

After iterating, we landed on roughly **100 iterations per shard/VM**. That keeps each individual machine comfortably below its own resource limits — so the numbers reflect the provider, not our hardware — while keeping the fleet size manageable. 100k sandboxes becomes ~1,000 well-behaved shards rather than one machine on fire.

---

## The big one: we weren't actually testing concurrency

This is the realization that reshaped the whole project.

Our burst test created N sandboxes "at once" and measured how fast each came up. But here's the subtle flaw: a sandbox that was created and then immediately torn down isn't *concurrent* with anything. If you create #1, tear it down, create #2, tear it down, and so on quickly, you've measured **burst throughput** — how fast you can churn through creations — but you have *not* measured whether a provider can hold 100,000 sandboxes **alive at the same time**.

Those are completely different questions. "Can you create 100k quickly?" and "Can you sustain 100k live simultaneously?" stress entirely different parts of a provider's infrastructure — scheduling and admission vs. sustained capacity, memory pressure, and reclamation.

We had been reporting *implied* concurrency. We wanted *true* concurrency.

---

## Pursuing true concurrency: keep the sandboxes alive

Measuring true concurrency meant a fundamental change: **sandboxes have to stay alive until the whole run reaches peak, then be torn down together.** Every shard has to hold its sandboxes open and coordinate so that, at some moment, all 100k are simultaneously live.

That changed what a "result" even means. It more than just "how fast was the sandbox created?" It now has a richer lifecycle, which our result model now captures explicitly:

- **success** — created, became interactive, *and* was still alive when we performed the coordinated teardown at the end of the test.
- **partial** — created and became interactive, but died somewhere between creation and the coordinated destroy. (This is the category that only a true concurrency test can even detect.)
- **readiness failed** — created, but never became usable.
- **failed** — the creation call itself errored.

That "partial" bucket is the whole point. Under implied-concurrency testing, those sandboxes would have counted as wins — created successfully, torn down, move on. Under true concurrency, we can see which providers *create* well but struggle to *sustain*. To make this airtight we also record per-shard liveness over time, so we can reconstruct the real concurrency curve — how many sandboxes
were actually alive at each instant — rather than trusting that "created" meant "still running."

---

## Logs everywhere: getting visibility across a thousand shards

A single VM is easy to debug — you SSH in and tail a log. A thousand shards spread across a fleet is a different animal. When something goes sideways at shard 734, you need to know, and you can't be SSH-ing into a thousand machines.

So we built log aggregation into the coordinator itself. Each shard captures its own coordinator output and ships it durably to object storage (Tigris) alongside its results, rather than relying on the ephemeral VM's local disk or the orchestration layer's log plumbing. The logs survive the VM, and they survive the orchestration layer flaking — which, at this scale, it will.

This matters more than it sounds. Without per-shard logs you can see *that* a run produced fewer successes than expected, but not *why*. With them, a post-mortem across the whole fleet becomes possible.

---

## Ingesting a firehose: the data pipeline

100k sandboxes, each with a full lifecycle record, multiplied by repeated runs across multiple providers, is a lot of data — and it arrives from a thousand shards roughly at once.

We landed on a two-store design of Tigris for cold storage and an Clickhouse for analytics.

The principle: never lose raw data, never hold the full result set in memory, and make sure a failure anywhere — a VM, a coordinator, the orchestration layer — costs you seconds of in-flight data at most, not the whole run. If the structured store ever needs reshaping, we can rebuild it from the raw record in Tigris.

---

## Why we're pushing to June 17th

Every step so far has changed what the benchmark *measures*. v1 measured our own VM. Implied concurrency measured throughput, not sustained load. Each correction made the test more honest — and revealed the next thing we hadn't gotten right. We've learned something at every juncture, and we fully expect to learn more.

Look out for the final results on the 17th (fingers crossed).
