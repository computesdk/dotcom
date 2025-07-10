import { defineCollection, z } from 'astro:content';

const docsCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // Add any other frontmatter fields you need
  }),
});

export const collections = {
  'docs': docsCollection,
};
