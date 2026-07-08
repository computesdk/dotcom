export type Tier = "gold" | "silver" | "bronze" | "platform";

export interface Sponsor {
  name: string;
  href: string;
  logo: string;
  logoDark: string;
  tier: Tier;
}

const UTM = "?utm_source=computesdk.com&utm_medium=referral&utm_campaign=scale-invitational-sponsor-link";

const LOGO_API = "https://logos.computesdk.com/api/svg";
const logoUrl = (brandId: string, variant: "logo-light" | "logo-dark") =>
  `${LOGO_API}/${brandId}/bounded/${variant}`;

export const SPONSORS: Sponsor[] = [
  {
    name: "Namespace",
    tier: "platform",
    href: `https://namespace.so/${UTM}`,
    logo: logoUrl("namespace", "logo-light"),
    logoDark: logoUrl("namespace", "logo-dark"),
  },
  {
    name: "Latitude",
    tier: "silver",
    href: `https://latitude.sh/${UTM}`,
    logo: logoUrl("latitude", "logo-light"),
    logoDark: logoUrl("latitude", "logo-dark"),
  },
  {
    name: "Google Cloud Run",
    tier: "silver",
    href: `https://cloud.google.com/run${UTM}`,
    logo: logoUrl("google-cloud-run", "logo-light"),
    logoDark: logoUrl("google-cloud-run", "logo-dark"),
  },
  {
    name: "Browserbase",
    tier: "bronze",
    href: `https://www.browserbase.com/${UTM}`,
    logo: logoUrl("browserbase", "logo-light"),
    logoDark: logoUrl("browserbase", "logo-dark"),
  },
  {
    name: "Tigris",
    tier: "bronze",
    href: `https://www.tigrisdata.com/${UTM}`,
    logo: logoUrl("tigris", "logo-light"),
    logoDark: logoUrl("tigris", "logo-dark"),
  },
  {
    name: "Neon",
    tier: "bronze",
    href: `https://neon.com/${UTM}`,
    logo: logoUrl("neon", "logo-light"),
    logoDark: logoUrl("neon", "logo-dark"),
  },
  {
    name: "GitBook",
    tier: "bronze",
    href: `https://www.gitbook.com/${UTM}`,
    logo: logoUrl("gitbook", "logo-light"),
    logoDark: logoUrl("gitbook", "logo-dark"),
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
    logoHeight: "h-11",
    slotHeight: "h-14",
  },
  {
    key: "silver",
    label: "★ SILVER",
    lineColor: "bg-[#c0c0c0]",
    textColor: "text-gray-500 dark:text-gray-300",
    logoHeight: "h-10",
    slotHeight: "h-12",
  },
  {
    key: "bronze",
    label: "+ BRONZE",
    lineColor: "bg-[#cd7f32]",
    textColor: "text-amber-700 dark:text-amber-600",
    logoHeight: "h-6",
    slotHeight: "h-9",
  },
  {
    key: "platform",
    label: "BENCHMARKS POWERED BY:",
    lineColor: "bg-emerald-600 dark:bg-emerald-400",
    textColor: "text-emerald-600 dark:text-emerald-400",
    logoHeight: "h-8",
    slotHeight: "h-10",
  },
];

// Mobile banner rotation order: gold, silver, bronze, platform (tier order), preserving
// SPONSORS' relative order within each tier.
const BANNER_TIER_ORDER: Tier[] = ["gold", "silver", "bronze", "platform"];
export const BANNER_SPONSORS: Sponsor[] = BANNER_TIER_ORDER.flatMap((tier) =>
  SPONSORS.filter((s) => s.tier === tier)
);
