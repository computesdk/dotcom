import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { capitalize } from "../components/benchmarkConstants";

const PUBLIC_DIR = resolve(process.cwd(), "public");

interface TestStats {
  median: number;
  p95: number;
  p99: number;
}

interface ProviderOgProps {
  provider: string;
  sequential: TestStats;
  burst: TestStats;
  staggered: TestStats;
  timestamp: string;
  testTypeLabel?: string;
  stats?: TestStats;
}

interface LeaderboardOgProps {
  timestamp: string;
}

function readSvgContent(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

function extractViewBox(svg: string): { width: number; height: number } {
  const vbMatch = svg.match(/viewBox="([^"]+)"/);
  if (vbMatch) {
    const parts = vbMatch[1].split(/\s+/).map(Number);
    return { width: parts[2], height: parts[3] };
  }
  const wMatch = svg.match(/width="(\d+(?:\.\d+)?)"/);
  const hMatch = svg.match(/height="(\d+(?:\.\d+)?)"/);
  return {
    width: wMatch ? parseFloat(wMatch[1]) : 100,
    height: hMatch ? parseFloat(hMatch[1]) : 100,
  };
}

function extractSvgInner(svg: string): string {
  // Remove <?xml ...?> processing instructions
  let inner = svg.replace(/<\?xml[^?]*\?>/g, "");
  // Remove the outer <svg> tag, keep inner content
  inner = inner.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return inner.trim();
}

function scaleSvg(
  svg: string,
  targetWidth: number,
  targetHeight: number,
  x: number,
  y: number,
): string {
  const vb = extractViewBox(svg);
  const scaleX = targetWidth / vb.width;
  const scaleY = targetHeight / vb.height;
  const scale = Math.min(scaleX, scaleY);
  const inner = extractSvgInner(svg);
  return `<g transform="translate(${x}, ${y}) scale(${scale})">${inner}</g>`;
}

function backgroundLayer(): string {
  return `
    <defs>
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" seed="42" stitchTiles="stitch" result="noise" />
        <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
        <feComponentTransfer in="mono" result="cutoff">
          <feFuncR type="discrete" tableValues="0 0 0 0 0 0 0.08 0.12 0.18" />
          <feFuncG type="discrete" tableValues="0 0 0 0 0 0 0.08 0.12 0.18" />
          <feFuncB type="discrete" tableValues="0 0 0 0 0 0 0.1 0.14 0.22" />
        </feComponentTransfer>
        <feBlend mode="screen" in="cutoff" in2="SourceGraphic" />
      </filter>
      <radialGradient id="vignette" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stop-color="transparent" stop-opacity="0" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.5" />
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="#0a0a0f" />
    <rect width="1200" height="630" fill="#0a0a0f" filter="url(#grain)" />
    <rect width="1200" height="630" fill="url(#vignette)" />
    <rect x="1" y="1" width="1198" height="628" rx="12" fill="none" stroke="#1e293b" stroke-width="1" />
  `;
}

function providerWordmark(provider: string, x: number, y: number, maxWidth: number, maxHeight: number): string {
  const normalPath = resolve(PUBLIC_DIR, `benchmarks/normal-${provider}-dark.svg`);
  const svgContent = readSvgContent(normalPath);
  if (!svgContent) return "";

  const vb = extractViewBox(svgContent);
  const scaleX = maxWidth / vb.width;
  const scaleY = maxHeight / vb.height;
  const scale = Math.min(scaleX, scaleY);
  const inner = extractSvgInner(svgContent);
  return `<g transform="translate(${x}, ${y}) scale(${scale})">${inner}</g>`;
}

function formatMs(ms: number): string {
  if (ms >= 10000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms).toLocaleString("en-US")}ms`;
}

export async function generateProviderOgImage(props: ProviderOgProps): Promise<Buffer> {
  const { provider, timestamp, testTypeLabel, stats } = props;
  const displayName = capitalize(provider);
  const FONT = "Liberation Sans, Arial, Helvetica, sans-serif";

  const wordmark = providerWordmark(provider, 80, 160, 600, 100);
  const hasWordmark = wordmark.length > 0;

  // If no wordmark SVG, fall back to text
  const providerNameFallback = hasWordmark
    ? ""
    : `<text x="80" y="240" font-family="${FONT}" font-size="64" font-weight="bold" fill="white">${displayName}</text>`;

  const subtitleY = hasWordmark ? 310 : 290;

  // Test-type-specific label and stats
  let testTypeContent = "";
  if (testTypeLabel) {
    testTypeContent += `<text x="80" y="${subtitleY + 45}" font-family="${FONT}" font-size="24" fill="#94a3b8">${testTypeLabel}</text>`;
  }
  if (stats) {
    const statsY = testTypeLabel ? subtitleY + 100 : subtitleY + 60;
    const statItems = [
      { label: "Median", value: formatMs(stats.median) },
      { label: "P95", value: formatMs(stats.p95) },
      { label: "P99", value: formatMs(stats.p99) },
    ];
    for (let i = 0; i < statItems.length; i++) {
      const x = 80 + i * 220;
      testTypeContent += `
        <text x="${x}" y="${statsY}" font-family="${FONT}" font-size="14" fill="#64748b" text-transform="uppercase" letter-spacing="1">${statItems[i].label}</text>
        <text x="${x}" y="${statsY + 32}" font-family="${FONT}" font-size="28" font-weight="bold" fill="white">${statItems[i].value}</text>
      `;
    }
  }

  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    ${backgroundLayer()}
    ${wordmark}
    ${providerNameFallback}
    <text x="80" y="${subtitleY}" font-family="${FONT}" font-size="32" font-weight="bold" fill="white">Sandbox Benchmarks</text>
    ${testTypeContent}
    <text x="80" y="560" font-family="${FONT}" font-size="22" font-weight="bold" fill="white">Last run ${timestamp}</text>
    <text x="1120" y="560" font-family="${FONT}" font-size="26" font-weight="bold" fill="white" text-anchor="end">ComputeSDK</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Seeded pseudo-random for deterministic decorative lines
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function renderDecorativeChart(
  chartX: number,
  chartY: number,
  chartW: number,
  chartH: number,
): string {
  const colors = [
    "#5eead4",
    "#93c5fd", // light blue
    "#ffffff", // light teal
    "#3b82f6", // blue
    "#10b981", // green
    "#1d4ed8", // deep blue
    "#047857", // deep green
  ];

  const numPoints = 20;
  const xStep = chartW / (numPoints - 1);
  let svg = "";

  for (let lineIdx = 0; lineIdx < colors.length; lineIdx++) {
    const color = colors[lineIdx];
    const rand = seededRandom(lineIdx * 1337 + 42);

    // Each line has a base y and gentle wandering
    const baseY = chartY + 90 + lineIdx * (chartH / (colors.length + 10));
    const points: { x: number; y: number }[] = [];
    let drift = 0;

    for (let i = 0; i < numPoints; i++) {
      drift += (rand() - 0.5) * 30;
      drift = Math.max(-80, Math.min(40, drift));
      const x = chartX + i * xStep;
      const y = baseY + drift;
      points.push({ x, y });
    }

    const pathData = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    svg += `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" />`;

    for (const p of points) {
      svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2" fill="${color}" opacity="0.55" />`;
    }
  }

  return svg;
}

export async function generateLeaderboardOgImage(
  props: LeaderboardOgProps,
): Promise<Buffer> {
  const { timestamp } = props;
  const FONT = "Liberation Sans, Arial, Helvetica, sans-serif";

  // Decorative chart fills the background, text overlays on top
  const chartLines = renderDecorativeChart(
    0, 220, // x, y
    1200, 430, // width, height — extends past bottom edge for the cropped look
  );

  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#0a0a0f" />
    ${chartLines}
    <text x="60" y="100" font-family="${FONT}" font-size="72" font-weight="bold" fill="white">Sandbox</text>
    <text x="60" y="180" font-family="${FONT}" font-size="72" font-weight="bold" fill="white">Benchmarks</text>
    <text x="60" y="225" font-family="${FONT}" font-size="20" fill="#94a3b8">Independently verified sandbox benchmarks run daily across providers.</text>
    <line x1="0" y1="540" x2="1200" y2="540" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4" />
    <text x="60" y="580" font-family="${FONT}" font-size="22" font-weight="bold" fill="white">Last run: ${timestamp}</text>
    <text x="1140" y="580" font-family="${FONT}" font-size="26" font-weight="bold" fill="white" text-anchor="end">ComputeSDK</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
