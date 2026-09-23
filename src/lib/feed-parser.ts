export interface FeedItem {
  title: string;
  link: string;
  pubDate: Date;
  sourceName: string;
  sourceCategory: string;
  sourceTags: string[];
  snippet: string;
}

export interface FeedSource {
  name: string;
  url: string;
  site?: string;
  tags?: string[];
  category?: string;
  description?: string;
}

// Helper to resolve tags and category string from FeedSource
export function resolveSourceTags(source: FeedSource): { tags: string[]; category: string } {
  const tags =
    source.tags && source.tags.length > 0
      ? source.tags
      : source.category
        ? source.category.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
        : ['blogs'];
  const category = tags.join(', ');
  return { tags, category };
}

// Helper to strip HTML tags and decode common XML/HTML entities
export function cleanText(raw: string): string {
  if (!raw) return '';
  let text = raw
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 1. Decode entities first so escaped markup (like &lt;p&gt; or &lt;a href="..."&gt;) becomes real HTML
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, '-');

  // 2. Strip all HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 3. Decode any leftover entities and clean whitespace
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

// Parses an XML string into FeedItem array (supports RSS 2.0 and Atom 1.0)
export function parseXmlFeed(xml: string, source: FeedSource, limit = 5): FeedItem[] {
  const items: FeedItem[] = [];
  const { tags: sourceTags, category: sourceCategory } = resolveSourceTags(source);

  // 1. Check for Atom 1.0 (<entry>)
  const isAtom = xml.includes('<entry');

  if (isAtom) {
    const entryMatches = xml.match(/<entry[\s>].*?<\/entry>/gs) || [];
    for (const entryXml of entryMatches.slice(0, limit)) {
      const titleMatch = entryXml.match(/<title[^>]*>(.*?)<\/title>/s);
      const title = titleMatch ? cleanText(titleMatch[1]) : 'Untitled';

      // Atom link can be <link href="..."/> or <link>...</link>
      let link = '';
      const hrefMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["']/i);
      if (hrefMatch) {
        link = hrefMatch[1];
      } else {
        const textLinkMatch = entryXml.match(/<link[^>]*>(.*?)<\/link>/s);
        if (textLinkMatch) link = cleanText(textLinkMatch[1]);
      }

      // Date: <published> or <updated>
      const dateMatch = entryXml.match(/<(?:published|updated)[^>]*>(.*?)<\/(?:published|updated)>/s);
      const pubDate = dateMatch ? new Date(cleanText(dateMatch[1])) : new Date();

      // Snippet: <summary> or <content>
      const summaryMatch = entryXml.match(/<(?:summary|content)[^>]*>(.*?)<\/(?:summary|content)>/s);
      const snippet = summaryMatch ? cleanText(summaryMatch[1]).slice(0, 200) : '';

      if (link) {
        items.push({
          title,
          link,
          pubDate: isNaN(pubDate.getTime()) ? new Date() : pubDate,
          sourceName: source.name,
          sourceCategory,
          sourceTags,
          snippet,
        });
      }
    }
    return items;
  }

  // 2. RSS 2.0 / 1.0 (<item>)
  const itemMatches = xml.match(/<item[\s>].*?<\/item>/gs) || [];
  for (const itemXml of itemMatches.slice(0, limit)) {
    const titleMatch = itemXml.match(/<title[^>]*>(.*?)<\/title>/s);
    const title = titleMatch ? cleanText(titleMatch[1]) : 'Untitled';

    const linkMatch = itemXml.match(/<link[^>]*>(.*?)<\/link>/s);
    const link = linkMatch ? cleanText(linkMatch[1]) : '';

    const dateMatch = itemXml.match(/<(?:pubDate|dc:date)[^>]*>(.*?)<\/(?:pubDate|dc:date)>/s);
    const pubDate = dateMatch ? new Date(cleanText(dateMatch[1])) : new Date();

    const descMatch = itemXml.match(/<description[^>]*>(.*?)<\/description>/s);
    const snippet = descMatch ? cleanText(descMatch[1]).slice(0, 200) : '';

    if (link) {
      items.push({
        title,
        link,
        pubDate: isNaN(pubDate.getTime()) ? new Date() : pubDate,
        sourceName: source.name,
        sourceCategory,
        sourceTags,
        snippet,
      });
    }
  }

  return items;
}

// Fetches a single feed with timeout and error resilience
export async function fetchFeed(source: FeedSource, limit = 5, timeoutMs = 4000): Promise<FeedItem[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PaperTrail/1.0; +https://github.com)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[feed-fetcher] Failed to fetch ${source.name} (${res.status})`);
      return [];
    }

    const xml = await res.text();
    return parseXmlFeed(xml, source, limit);
  } catch (err) {
    console.warn(`[feed-fetcher] Error or timeout fetching ${source.name}: ${(err as Error).message}`);
    return [];
  }
}

// Fetches all feeds concurrently and returns them sorted by date
export async function aggregateAllFeeds(sources: FeedSource[], itemsPerFeed = 4): Promise<FeedItem[]> {
  const promises = sources.map((src) => fetchFeed(src, itemsPerFeed));
  const results = await Promise.allSettled(promises);

  const allItems: FeedItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      allItems.push(...r.value);
    }
  }

  // Sort reverse-chronologically
  allItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  return allItems;
}
