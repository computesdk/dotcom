import introduction from "./getting-started/introduction";
import installation from "./getting-started/installation";
// Import other content files as they are created

const contentMap = {
  "introduction": introduction,
  "installation": installation,
  // Add other content exports here
} as const;

export default contentMap;

export function getContent(section: string, slug: string) {
  const key = slug as keyof typeof contentMap;
  if (key in contentMap) {
    return contentMap[key];
  }
  return null;
}
