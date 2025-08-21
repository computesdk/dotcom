import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: "content",  
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('ComputeSDK Team'),
    role: z.string().default('Developer'),
    featured: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
  }),
});

export const collections = {
  blog,
};
