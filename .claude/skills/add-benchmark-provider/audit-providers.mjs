#!/usr/bin/env node
// Audits benchmark provider registration: cross-references the providers present
// in the live benchmarks data against the logo maps and color maps in the source,
// and verifies every referenced logo asset exists on disk.
//
// Usage:
//   node audit-providers.mjs            # audit all categories
//   node audit-providers.mjs sandbox    # audit one category (sandbox|storage|browser)
//
// Exit code 0 = everything registered; 1 = gaps found (or a fetch failed).

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_BASE =
  "https://raw.githubusercontent.com/computesdk/benchmarks/refs/heads/master/results";

// Walk up from this script to the repo root (the dir containing package.json).
function findRepoRoot(start) {
  let dir = start;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "package.json"))) return dir;
    dir = dirname(dir);
  }
  throw new Error("Could not locate repo root (no package.json found above script).");
}

const ROOT = findRepoRoot(dirname(fileURLToPath(import.meta.url)));
const CONSTANTS = "src/components/benchmarkConstants.ts";

const CATEGORIES = {
  sandbox: {
    // any of the sandbox test types works; they share the same provider set
    dataPath: "sequential_tti/latest.json",
    excluded: ["railway", "render", "justbash", "just-bash"],
    logoFiles: [
      "src/components/BenchmarksPage.astro",
      "src/pages/benchmarks/sandboxes/[provider]/index.astro",
    ],
    colorMap: "PROVIDER_COLORS",
  },
  storage: {
    dataPath: "storage/10mb/latest.json",
    excluded: [],
    logoFiles: [
      "src/components/StoragePage.astro",
      "src/pages/benchmarks/storage/[provider]/index.astro",
    ],
    colorMap: "STORAGE_PROVIDER_COLORS",
  },
  browser: {
    dataPath: "browser/latest.json",
    excluded: [],
    logoFiles: [
      "src/components/BrowserPage.astro",
      "src/pages/benchmarks/browsers/[provider]/index.astro",
    ],
    colorMap: "BROWSER_PROVIDER_COLORS",
  },
};

// Extract the `{ ... }` body of an object literal that follows a given declaration,
// then return the set of keys (handles `key:`, `"key":`, `'key':`).
function extractMapKeys(source, declMatcher) {
  const start = source.search(declMatcher);
  if (start === -1) return null; // map not found at all
  const braceStart = source.indexOf("{", start);
  if (braceStart === -1) return null;
  let depth = 0;
  let end = braceStart;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = source.slice(braceStart + 1, end);
  const keys = new Set();
  const keyRe = /(?:^|[,{]\s*)\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_$-]+))\s*:/g;
  let m;
  while ((m = keyRe.exec(body)) !== null) {
    keys.add(m[1] ?? m[2] ?? m[3]);
  }
  return keys;
}

async function fetchProviders(dataPath) {
  const url = `${DATA_BASE}/${dataPath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const data = await res.json();
  return (data.results ?? [])
    .filter((r) => !r.skipped)
    .map((r) => r.provider)
    .filter(Boolean);
}

function read(rel) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

let hadCritical = false; // missing logo / missing asset — breaks the page
let hadWarning = false; // missing color — falls back to gray (#6b7280), cosmetic

async function auditCategory(name) {
  const cfg = CATEGORIES[name];
  console.log(`\n=== ${name} ===`);

  let providers;
  try {
    providers = await fetchProviders(cfg.dataPath);
  } catch (e) {
    console.log(`  ⚠️  Could not fetch live data: ${e.message}`);
    hadCritical = true;
    return;
  }
  const excluded = new Set(cfg.excluded);
  const wanted = [...new Set(providers)].filter((p) => !excluded.has(p)).sort();
  console.log(`  Providers in live data: ${wanted.join(", ") || "(none)"}`);

  // Logo maps in each source file
  for (const file of cfg.logoFiles) {
    let src;
    try {
      src = read(file);
    } catch {
      console.log(`  ⚠️  Missing file: ${file}`);
      hadCritical = true;
      continue;
    }
    for (const mapName of ["providerLogos", "providerLogosDark"]) {
      const keys = extractMapKeys(src, new RegExp(`const\\s+${mapName}\\b`));
      if (keys === null) {
        console.log(`  ⚠️  ${file}: map "${mapName}" not found`);
        hadCritical = true;
        continue;
      }
      const missing = wanted.filter((p) => !keys.has(p));
      if (missing.length) {
        hadCritical = true;
        console.log(`  ❌ ${file} → ${mapName} missing: ${missing.join(", ")}`);
      } else {
        console.log(`  ✅ ${file} → ${mapName}`);
      }
    }
  }

  // Color map in benchmarkConstants.ts — optional: missing entries fall back to gray (#6b7280).
  const constSrc = read(CONSTANTS);
  const colorKeys = extractMapKeys(constSrc, new RegExp(`const\\s+${cfg.colorMap}\\b`));
  if (colorKeys === null) {
    console.log(`  ⚠️  ${CONSTANTS}: color map "${cfg.colorMap}" not found`);
    hadWarning = true;
  } else {
    const missing = wanted.filter((p) => !colorKeys.has(p));
    if (missing.length) {
      hadWarning = true;
      console.log(
        `  ⚠️  ${CONSTANTS} → ${cfg.colorMap} no color (renders gray): ${missing.join(", ")}`,
      );
    } else {
      console.log(`  ✅ ${CONSTANTS} → ${cfg.colorMap}`);
    }
  }

  // Verify referenced logo assets exist on disk
  const referenced = new Set();
  for (const file of cfg.logoFiles) {
    let src;
    try {
      src = read(file);
    } catch {
      continue;
    }
    for (const mapName of ["providerLogos", "providerLogosDark"]) {
      const start = src.search(new RegExp(`const\\s+${mapName}\\b`));
      if (start === -1) continue;
      const braceStart = src.indexOf("{", start);
      let depth = 0,
        end = braceStart;
      for (let i = braceStart; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}" && --depth === 0) {
          end = i;
          break;
        }
      }
      const body = src.slice(braceStart, end);
      const valRe = /:\s*"(\/[^"]+)"/g;
      let m;
      while ((m = valRe.exec(body)) !== null) referenced.add(m[1]);
    }
  }
  for (const path of [...referenced].sort()) {
    const disk = resolve(ROOT, "public", path.replace(/^\//, ""));
    if (!existsSync(disk)) {
      hadCritical = true;
      console.log(`  ❌ logo asset missing on disk: public${path}`);
    }
  }
}

const arg = process.argv[2];
const targets = arg ? [arg] : Object.keys(CATEGORIES);
for (const t of targets) {
  if (!CATEGORIES[t]) {
    console.error(`Unknown category "${t}". Use one of: ${Object.keys(CATEGORIES).join(", ")}`);
    process.exit(2);
  }
  await auditCategory(t);
}

if (hadCritical) {
  console.log("\n❌ Critical gaps found (missing logos/assets break the page). See ❌ above.");
} else if (hadWarning) {
  console.log("\n⚠️  No critical gaps. Optional color entries missing (providers render gray).");
} else {
  console.log("\nAll providers in the live data are fully registered. ✅");
}
process.exit(hadCritical ? 1 : 0);
