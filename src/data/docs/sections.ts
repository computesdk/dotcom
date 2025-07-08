export interface DocPage {
  title: string;
  slug: string;
  description?: string;
}

export interface DocSection {
  title: string;
  slug: string;
  pages: DocPage[];
}

export const docsSections: DocSection[] = [
  {
    title: "Getting Started",
    slug: "getting-started",
    pages: [
      { title: "Introduction", slug: "introduction" },
      { title: "Installation", slug: "installation" },
      { title: "Quick Start", slug: "quick-start" },
    ],
  },
  {
    title: "Guides",
    slug: "guides",
    pages: [
      { title: "Authentication", slug: "authentication" },
      { title: "API Usage", slug: "api-usage" },
      { title: "Best Practices", slug: "best-practices" },
    ],
  },
  {
    title: "API Reference",
    slug: "api-reference",
    pages: [
      { title: "Endpoints", slug: "endpoints" },
      { title: "Parameters", slug: "parameters" },
      { title: "Responses", slug: "responses" },
    ],
  },
];
