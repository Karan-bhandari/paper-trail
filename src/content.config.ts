import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const links = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/links' }),
  schema: z.object({
    title: z.string().min(1),
    url: z.string().url(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    author: z.string().optional(),
    via: z.string().optional(),
  }),
});

export const collections = { links };
