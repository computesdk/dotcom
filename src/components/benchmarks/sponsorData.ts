export type Tier = "gold" | "silver" | "bronze" | "platform";

export interface Sponsor {
  name: string;
  href: string;
  logo: string;
  logoDark: string;
  tier: Tier;
  /** Optional visual scale (e.g. 0.7) to normalize logos whose artwork fills its viewBox more tightly than others at the same max-height. */
  scale?: number;
}

const UTM = "?utm_source=computesdk.com&utm_medium=referral&utm_campaign=benchmark-sponsor-link";

export type LogoFormat = "raw" | "bounded" | "normalized";

const LOGO_API = "https://logos.computesdk.com/api/svg";

// Builds one logo URL. format/variant are picked per sponsor, per light-or-dark
// image below, so any combination the logo manager offers can be used freely
// (e.g. bounded/logo-dark, or raw/stacked-dark, or raw/cloud-run-dark).
const logoUrl = (brandId: string, format: LogoFormat, variant: string) =>
  `${LOGO_API}/${brandId}/${format}/${variant}`;

export const SPONSORS: Sponsor[] = [
  // {
  //   name: "Namespace",
  //   tier: "platform",
  //   href: `https://namespace.so/${UTM}`,
  //   logo: logoUrl("namespace", "bounded", "logo-light"),
  //   logoDark: logoUrl("namespace", "bounded", "logo-dark"),
  //   scale: 0.6,
  // },
  {
    name: "Latitude",
    tier: "silver",
    href: `https://latitude.sh/${UTM}`,
    logo: logoUrl("latitude", "bounded", "logo-light"),
    logoDark: logoUrl("latitude", "bounded", "logo-dark"),
  },
  {
    name: "Google Cloud Run",
    tier: "silver",
    href: `https://cloud.google.com/run${UTM}`,
    logo: logoUrl("google-cloud-run", "raw", "stacked-light"),
    logoDark: logoUrl("google-cloud-run", "raw", "stacked-dark"),
    scale: 0.8,
  },
  {
    name: "Browserbase",
    tier: "bronze",
    href: `https://www.browserbase.com/${UTM}`,
    logo: logoUrl("browserbase", "bounded", "logo-light"),
    logoDark: logoUrl("browserbase", "bounded", "logo-dark"),
  },
  {
    name: "Tigris",
    tier: "bronze",
    href: `https://www.tigrisdata.com/${UTM}`,
    logo: logoUrl("tigris", "bounded", "logo-light"),
    logoDark: logoUrl("tigris", "bounded", "logo-dark"),
    scale: 0.6,
  },
  {
    name: "Neon",
    tier: "bronze",
    href: `https://neon.com/${UTM}`,
    logo: logoUrl("neon", "bounded", "logo-light"),
    logoDark: logoUrl("neon", "bounded", "logo-dark"),
    scale: 0.9,
  },
  {
    name: "GitBook",
    tier: "bronze",
    href: `https://www.gitbook.com/${UTM}`,
    logo: logoUrl("gitbook", "bounded", "logo-light"),
    logoDark: logoUrl("gitbook", "bounded", "logo-dark"),
  },
];

export interface TierConfig {
  key: Tier;
  label: string;
  lineColor: string;
  textColor: string;
  logoHeight: string;
  slotHeight: string;
}

export const TIERS: TierConfig[] = [
  {
    key: "gold",
    label: "★ GOLD",
    lineColor: "bg-[#b8860b]",
    textColor: "text-[#b8860b] dark:text-[#FFD700]",
    logoHeight: "h-14",
    slotHeight: "h-14",
  },
  {
    key: "silver",
    label: "★ SILVER",
    lineColor: "bg-[#c0c0c0]",
    textColor: "text-gray-500 dark:text-gray-300",
    logoHeight: "h-16",
    slotHeight: "h-16",
  },
  {
    key: "bronze",
    label: "+ BRONZE",
    lineColor: "bg-[#cd7f32]",
    textColor: "text-amber-700 dark:text-amber-600",
    logoHeight: "h-12",
    slotHeight: "h-12",
  },
  // {
  //   key: "platform",
  //   label: "BENCHMARKS POWERED BY:",
  //   lineColor: "bg-emerald-600 dark:bg-emerald-400",
  //   textColor: "text-emerald-600 dark:text-emerald-400",
  //   logoHeight: "h-10",
  //   slotHeight: "h-10",
  // },
];

// Mobile banner rotation order: gold, silver, bronze, platform (tier order), preserving
// SPONSORS' relative order within each tier.
const BANNER_TIER_ORDER: Tier[] = ["gold", "silver", "bronze", "platform"];
export const BANNER_SPONSORS: Sponsor[] = BANNER_TIER_ORDER.flatMap((tier) =>
  SPONSORS.filter((s) => s.tier === tier)
);
