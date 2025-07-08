export type ContentNode = 
  | { type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'; text: string; id?: string }
  | { type: 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'code'; language: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface DocContent {
  title: string;
  description?: string;
  content: ContentNode[];
}

export interface DocPage extends DocContent {
  slug: string;
  section: string;
}

export interface DocSection {
  title: string;
  slug: string;
  description?: string;
  pages: Omit<DocPage, 'content'>[];
}
