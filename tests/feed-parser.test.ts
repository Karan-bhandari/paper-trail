import { describe, it, expect } from 'vitest';
import { parseXmlFeed, cleanText } from '../src/lib/feed-parser';

describe('Feed Parser', () => {
  it('cleans HTML tags and entities properly', () => {
    const raw = '<div>Hello &amp; <b>World</b> &lt;&gt; &quot;&#39;</div>';
    expect(cleanText(raw)).toBe("Hello & World <> \"'");
  });

  it('parses standard RSS 2.0 XML correctly', () => {
    const mockRss = `
      <?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Test Channel</title>
          <link>https://example.com</link>
          <item>
            <title>First RSS Item</title>
            <link>https://example.com/post-1</link>
            <pubDate>Mon, 15 Sep 2026 12:00:00 GMT</pubDate>
            <description>This is a summary of post 1.</description>
          </item>
          <item>
            <title>Second RSS Item</title>
            <link>https://example.com/post-2</link>
            <pubDate>Tue, 16 Sep 2026 14:00:00 GMT</pubDate>
            <description>This is a summary of post 2.</description>
          </item>
        </channel>
      </rss>
    `;

    const source = { name: 'Test Blog', url: 'https://example.com/rss.xml', category: 'tech' };
    const items = parseXmlFeed(mockRss, source, 5);

    expect(items.length).toBe(2);
    expect(items[0].title).toBe('First RSS Item');
    expect(items[0].link).toBe('https://example.com/post-1');
    expect(items[0].sourceName).toBe('Test Blog');
    expect(items[0].sourceCategory).toBe('tech');
    expect(items[0].snippet).toBe('This is a summary of post 1.');
  });

  it('parses Atom 1.0 XML correctly', () => {
    const mockAtom = `
      <?xml version="1.0" encoding="utf-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Test Atom Feed</title>
        <entry>
          <title>First Atom Entry</title>
          <link href="https://atom.example.com/entry-1" />
          <updated>2026-09-17T10:00:00Z</updated>
          <summary>Atom summary snippet.</summary>
        </entry>
      </feed>
    `;

    const source = { name: 'Atom Blog', url: 'https://atom.example.com/atom.xml', category: 'systems' };
    const items = parseXmlFeed(mockAtom, source, 5);

    expect(items.length).toBe(1);
    expect(items[0].title).toBe('First Atom Entry');
    expect(items[0].link).toBe('https://atom.example.com/entry-1');
    expect(items[0].sourceName).toBe('Atom Blog');
    expect(items[0].snippet).toBe('Atom summary snippet.');
  });

  it('handles empty or malformed XML gracefully', () => {
    const source = { name: 'Empty', url: 'https://example.com', category: 'none' };
    expect(parseXmlFeed('', source)).toEqual([]);
    expect(parseXmlFeed('<corrupt>xml</corrupt>', source)).toEqual([]);
  });
});
