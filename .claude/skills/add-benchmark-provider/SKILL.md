---
name: add-benchmark-provider
description: Register a new provider on the benchmarks pages so its logo, name, and color render correctly. Use when a provider posts benchmark results but its logo/name is missing or shows as a plain dot, or when onboarding a new sandbox, storage, or browser benchmark provider.
---

# Add a benchmark provider

Benchmark **data** is fetched live from `github.com/computesdk/benchmarks` and auto-discovers providers by their `provider` slug — you never hardcode results. But the **presentation** (logo, brand color, display name) is keyed off that slug in several source maps. If a provider isn't registered in those maps, the page falls back to a gray dot + raw slug instead of a logo. That mismatch is the bug this skill fixes.

## Step 1 — Audit to find what's missing

Run the audit script from the repo root. It cross-references the live data against every logo/color map and checks that referenced logo files exist on disk.

```bash
node .claude/skills/add-benchmark-provider/audit-providers.mjs            # all categories
node .claude/skills/add-benchmark-provider/audit-providers.mjs sandbox    # one category
```

- `❌` = **critical** (missing logo entry or missing asset → broken display). Exit code 1.
- `⚠️` = **optional** (missing brand color → renders gray `#6b7280`, page still works).

Use its output as your checklist. Re-run it after editing to confirm everything is green.

## Step 2 — Identify the category and slug

The provider belongs to exactly one category. The slug is the exact `provider` string in the live data (the audit prints it). Slugs are lowercase, hyphenated for multi-word (e.g. `aws-s3`, `browser-use`).

| Category | Data source | Logo maps to edit | Color map | Detail page |
|---|---|---|---|---|
| **sandbox** | `sequential_tti` / `burst_tti` / `staggered_tti` | `src/components/BenchmarksPage.astro` | `PROVIDER_COLORS` | `src/pages/benchmarks/sandboxes/[provider]/index.astro` |
| **storage** | `storage/<size>` | `src/components/StoragePage.astro` | `STORAGE_PROVIDER_COLORS` | `src/pages/benchmarks/storage/[provider]/index.astro` |
| **browser** | `browser` | `src/components/BrowserPage.astro` | `BROWSER_PROVIDER_COLORS` | `src/pages/benchmarks/browsers/[provider]/index.astro` |

All color maps live in `src/components/benchmarkConstants.ts`.

## Step 3 — Add the logo assets

Logos live in `public/benchmarks/`. The convention is:

```
public/benchmarks/normal-<name>-light.svg
public/benchmarks/normal-<name>-dark.svg
```

`.svg` is standard; `.png` is used occasionally (e.g. `anchor-browser`). Both a **light** and **dark** variant are required for theme support.

⚠️ The filename `<name>` is **not always the slug** — it's whatever the map value references. Examples: slug `aws-s3` → file `normal-s3-light.svg`; slug `just-bash` → file `normal-justbash-light.svg`. When adding a new provider, match the slug unless there's a reason not to, and make the map value point at the actual filename.

If the asset files don't exist yet, ask the user for the logos (light + dark) before wiring up the maps — the audit will flag missing files as critical.

## Step 4 — Register the slug in every map for the category

For the category's **two** logo-map files (the component page **and** the `[provider]` detail page), add the slug to **both** `providerLogos` and `providerLogosDark`. Insert the new line in the same alphabetical/grouped position as neighbors and match the existing formatting exactly. Example (sandbox):

```ts
// in providerLogos
northflank: "/benchmarks/normal-northflank-light.svg",
// in providerLogosDark
northflank: "/benchmarks/normal-northflank-dark.svg",
```

Quote the key if it contains a hyphen: `"aws-s3": "/benchmarks/normal-s3-light.svg",`.

## Step 5 — Add a brand color (recommended)

In `src/components/benchmarkConstants.ts`, add the slug → hex color to the category's color map (`PROVIDER_COLORS` / `STORAGE_PROVIDER_COLORS` / `BROWSER_PROVIDER_COLORS`). Use the provider's brand color. Without it, charts and legend dots render gray (`#6b7280`) — functional but off-brand.

## Step 6 — Add a display name only if needed

`capitalize()` in `benchmarkConstants.ts` formats the slug for display. The default capitalizes the first letter (`northflank` → `Northflank`), which is correct for most providers. Add a special case **only** for non-standard casing (e.g. `E2B`, `CodeSandbox`, `AWS S3`).

## Step 7 — Other surfaces

- **Scale Invitational** (`src/components/ScaleInvitational.astro`): a separate hardcoded `participants` array with `name`, `logoLight`, `logoDark`, `description`, `results`. Only update if the provider is an event participant — it's independent of the benchmark maps above.

## Step 8 — Verify

1. Re-run the audit; confirm no `❌` for the category.
2. Build to confirm no type/syntax errors: `pnpm build` (or `npm run build`).
3. If possible, eyeball the relevant benchmarks page to confirm the logo renders in both light and dark mode.

## Notes

- `excludedProviders` sets (in `BenchmarksPage.astro`, `BenchmarksLandingPage.astro`, and the sandbox `[provider]` page) currently hide `railway`, `render`, `justbash`, `just-bash`. To intentionally hide a provider, add its slug to all of them consistently; the audit already accounts for the sandbox exclusions.
- Don't touch `src/utils/benchmark-data.ts` data fetching — providers are discovered automatically; this skill is purely about presentation wiring.
