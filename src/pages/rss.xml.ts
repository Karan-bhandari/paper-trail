import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const links = await getCollection('links');
  links.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: 'Paper Trail — Curated Links & RSS Feed',
    description: 'A continuous paper trail of essays, systems papers, and internet curiosities.',
    site: context.site || 'http://localhost:4321',
    items: links.map((link) => {
      const hostname = new URL(link.data.url).hostname.replace(/^www\./, '');

      return {
        title: `[${hostname}] ${link.data.title}`,
        pubDate: link.data.date,
        description: link.body ? `${link.body}\n\nOriginal URL: ${link.data.url}` : link.data.url,
        link: link.data.url,
        categories: link.data.tags,
        customData: `<author>${link.data.author || 'Karan'}</author><source url="${link.data.url}">${hostname}</source>`,
      };
    }),
    customData: `<language>en-us</language>`,
  });
}
