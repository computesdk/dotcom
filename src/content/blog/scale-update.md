---
title: "What 100,000 Sandboxes Taught Us (Before We Even Ran It)"
description: "An honest field report from building a true concurrency benchmark at scale"
date: 2026-06-03
tags: [sandboxes, benchmarks, scaling]
author: "Garrison Snelling"
role: "Founder, ComputeSDK"
image: "/Garrison-Snelling-sq.jpeg"
featured: true
---

# What 100,000 Sandboxes Taught Us (Before We Even Ran It)

We set out to answer a deceptively simple question: *when an app needs to
spin up tens of thousands of sandboxes at once, how do today's providers
actually hold up?*

Our daily benchmark already measures cold-start time, staggered ramp, and
small-scale burst behavior across providers. But "small-scale" is the operative
word — a few hundred sandboxes from a single runner tells you almost nothing
about what happens at four and five orders of magnitude higher. So we started
building a 100,000-sandbox benchmark.

What we did *not* expect was how much we'd learn before ever pressing the launch button. This post is a candid look at the problems we ran into, the
course-corrections our provider partners pushed us toward, and why we're
deliberately taking our time before publishing a single 100k number.

---

## v1: 10,000 iterations from one very busy VM

The first version was the obvious one. Take the benchmark we already trust,
crank the iteration count, and point it at a single beefy VM. We pushed it up
toward 10,000 sandbox creations from one machine and watched it work.

It *worked* — right up until it didn't tell us anything useful.

A single VM has a single network stack, a single ephemeral-port range, a single
event loop, and a single egress IP. Long before you reach interesting provider
behavior, you start measuring **your own machine's limits**: port exhaustion,
TLS handshake contention, file-descriptor ceilings, event-loop lag. The numbers
we got back were as much a portrait of our test rig as of any provider.

That was lesson one: **at scale, the test harness becomes part of the
experiment.** If you can't rule out your own bottlenecks, you can't publish.

---

## Listening to the providers: spread the load (sharding)

Here's where our partners earned their place in this project. When we shared
early v1 results, the consistent feedback was: *you're concentrating load in a
way no real workload would, and you're capping out your own box.* A genuine
high-concurrency workload is distributed — it comes from many machines, many
source IPs, many network paths.

So we re-architected around **sharding**. Instead of one VM doing 10k, a
logical burst is split across many VMs, each running a slice of the total. The
coordinator on each VM now carries shard metadata — a shared `group_id`, a
`shard_index`, and a `shard_count` — so that independently-launched machines
know they're part of one larger run and their results can be stitched back
together afterward.

This removed the single-machine ceiling and, just as importantly, made the test
look more like the thing we're actually trying to measure.

---

## Finding the sweet spot: ~100 iterations per shard

Sharding raised an immediate tuning question: *how much work per VM?*

Too much per shard and you're back to v1's problem — each VM becomes its own
bottleneck and you're measuring the rig again. Too little and you're paying to
provision, boot, and coordinate an enormous fleet of VMs for a trivial slice of
work each, which is wasteful and adds its own orchestration noise.

After iterating, we landed on roughly **100 iterations per shard/VM**. That
keeps each individual machine comfortably below its own resource limits — so the
numbers reflect the provider, not our hardware — while keeping the fleet size
manageable. 100k sandboxes becomes ~1,000 well-behaved shards rather than one
machine on fire.

---

## The big one: we weren't actually testing concurrency

This is the realization that reshaped the whole project, and again we have to thank our providers for their candid feedback.

Our burst test created N sandboxes "at once" and measured how fast each came up.
But here's the subtle flaw: a sandbox that was created and then immediately torn
down isn't *concurrent* with anything. If you create #1, tear it down, create
#2, tear it down, and so on quickly, you've measured **burst throughput** — how
fast you can churn through creations — but you have *not* measured whether a
provider can hold 100,000 sandboxes **alive at the same time**.

Those are completely different questions. "Can you create 100k quickly?" and
"Can you sustain 100k live simultaneously?" stress entirely different parts of a
provider's infrastructure — scheduling and admission vs. sustained capacity,
memory pressure, and reclamation.

We had been reporting *implied* concurrency. We wanted *true* concurrency.

---

## Pursuing true concurrency: keep the sandboxes alive

Measuring true concurrency meant a fundamental change: **sandboxes have to stay
alive until the whole run reaches peak, then be torn down together.** Every
shard has to hold its sandboxes open and coordinate so that, at some moment, all
100k are simultaneously live.

That changed what a "result" even means. A sandbox is no longer just
"created — how fast?" It now has a richer lifecycle, which our result model now
captures explicitly:

- **success** — created, became interactive, *and* was still alive when we
  performed the coordinated teardown at the end of the test.
- **partial** — created and became interactive, but died somewhere between
  creation and the coordinated destroy. (This is the category that only a true
  concurrency test can even detect.)
- **readiness_failed** — created, but never became usable.
- **failed** — the creation call itself errored.

That "partial" bucket is the whole point. Under implied-concurrency testing,
those sandboxes would have counted as wins — created successfully, torn down,
move on. Under true concurrency, we can see which providers *create* well but
struggle to *sustain*. To make this airtight we also record per-shard liveness
over time, so we can reconstruct the real concurrency curve — how many sandboxes
were actually alive at each instant — rather than trusting that "created" meant
"still running."

---

## Logs everywhere: getting visibility across a thousand shards

A single VM is easy to debug — you SSH in and tail a log. A thousand shards
spread across a fleet is a different animal. When something goes sideways at
shard 734, you need to know, and you can't be SSH-ing into a thousand machines.

So we built log aggregation into the coordinator itself. Each shard captures its
own coordinator output and ships it durably to object storage (Tigris) alongside
its results, rather than relying on the ephemeral VM's local disk or the
orchestration layer's log plumbing. The logs survive the VM, and they survive
the orchestration layer flaking — which, at this scale, it will.

This matters more than it sounds. Without per-shard logs you can see *that* a
run produced fewer successes than expected, but not *why*. With them, a
post-mortem across the whole fleet becomes possible.

---

## Ingesting a firehose: the data pipeline

100k sandboxes, each with a full lifecycle record, multiplied by repeated runs
across multiple providers, is a lot of data — and it arrives from a thousand
shards roughly at once.

We landed on a two-store design:

- **Tigris (object storage)** holds the raw, append-only source of truth — one
  line per sandbox with the complete record, plus per-shard logs and heartbeat
  snapshots. Streamed up in chunks as the run progresses, so partial results
  survive a crashed coordinator.
- **Postgres** holds the queryable projection — structured rows you can
  actually run analysis against, batch-inserted to keep write rates sane.

The principle: never lose raw data, never hold the full result set in memory,
and make sure a failure anywhere — a VM, a coordinator, the orchestration layer
— costs you seconds of in-flight data at most, not the whole run. If the
structured store ever needs reshaping, we can rebuild it from the raw record in
Tigris.

---

## Building a UI worth our partners' time

Finally, none of this is useful if the results are a wall of JSON. Our provider
partners are putting real engineering attention into participating, and they
deserve more than a CSV dump.

So we're investing in a UI that makes the scale data legible: concurrency over
time, where in the lifecycle failures cluster, and how success degrades (or doesn't)
as the live count climbs toward 100k. The goal is something a provider's engineers as well as any other curious dev or VC can open
and immediately reason about — and something the broader community can trust.

---

## Why we're (still) not running the 100k — yet

It would be easy to fire off a headline 100k run and publish whatever came back.
We're choosing not to, on purpose.

Every step above changed what the benchmark *measures*. v1 measured our own VM.
Implied concurrency measured throughput, not sustained load. Each correction
made the test more honest — and revealed the next thing we hadn't gotten right.
We've learned something at every juncture, and we fully expect to learn more.

When we publish a 100,000-sandbox result, we want to stand behind it completely
— for the providers who've partnered with us and put their infrastructure on the
line, and for everyone watching this space who wants to know what "scale"
really means. Confidence is the deliverable. So we're going to keep testing,
keep iterating, and keep listening to our partners until the numbers mean
exactly what we say they mean.

The 100k is coming — and when it does, it'll be
worth trusting.

---