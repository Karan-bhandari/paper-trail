import { describe, it, expect } from 'vitest';
import { slugify, generateMarkdown, parseIssueBody } from '../scripts/add-link.mjs';
import { parseFeedIssueBody, extractFeedMetadata } from '../scripts/add-feed.mjs';

describe('CLI Link Helper', () => {
  it('slugifies titles properly', () => {
    expect(slugify('All In on SQLite: Running Databases on the Edge!')).toBe(
      'all-in-on-sqlite-running-databases-on-th'
    );
    expect(slugify('  Spaced  Repetition for Efficient Learning  ')).toBe(
      'spaced-repetition-for-efficient-learning'
    );
  });

  it('generates valid Astro Markdown frontmatter', () => {
    const md = generateMarkdown({
      title: 'Test Article "Quotes"',
      url: 'https://example.com/test',
      date: '2026-09-17',
      tags: ['systems', 'databases'],
      notes: 'This is a test note.',
      author: 'Tester',
      via: 'hn',
    });

    expect(md).toContain('title: "Test Article \\"Quotes\\""');
    expect(md).toContain('url: "https://example.com/test"');
    expect(md).toContain('date: 2026-09-17');
    expect(md).toContain('tags: ["systems", "databases"]');
    expect(md).toContain('author: "Tester"');
    expect(md).toContain('via: "hn"');
    expect(md).toContain('This is a test note.');
  });

  it('parses GitHub Issue Form body correctly', () => {
    const issueBody = `
### URL

https://fly.io/blog/all-in-on-sqlite/

### Tags

systems, databases

### Notes / Takeaway

Great deep dive into edge databases.
`;
    const parsed = parseIssueBody(issueBody);
    expect(parsed.url).toBe('https://fly.io/blog/all-in-on-sqlite/');
    expect(parsed.tags).toEqual(['systems', 'databases']);
    expect(parsed.notes).toBe('Great deep dive into edge databases.');
  });

  it('handles empty/placeholder issue form values gracefully', () => {
    const issueBody = `
### URL

https://example.com

### Tags

_No response_

### Notes / Takeaway

_No response_
`;
    const parsed = parseIssueBody(issueBody);
    expect(parsed.url).toBe('https://example.com');
    expect(parsed.tags).toEqual(['reads']);
    expect(parsed.notes).toBe('');
  });

  it('falls back to raw URL in title or body when not using form', () => {
    const parsed = parseIssueBody('Check this out: https://simonwillison.net/2026/til', 'Dispatch: new link');
    expect(parsed.url).toBe('https://simonwillison.net/2026/til');
    expect(parsed.tags).toEqual(['reads']);
  });
});

describe('CLI Feed Helper', () => {
  it('parses Feed Issue Form body correctly', () => {
    const issueBody = `
### Feed URL

https://wornandwound.com/feed/

### Category

watches

### Publication / Site Name

Worn & Wound

### Description

Independent watch reviews and guides.
`;
    const parsed = parseFeedIssueBody(issueBody);
    expect(parsed.url).toBe('https://wornandwound.com/feed/');
    expect(parsed.category).toBe('watches');
    expect(parsed.name).toBe('Worn & Wound');
    expect(parsed.description).toBe('Independent watch reviews and guides.');
  });

  it('extracts metadata from RSS channel XML', () => {
    const xml = `
      <rss version="2.0">
        <channel>
          <title>Test Watch Blog</title>
          <link>https://watchblog.example.com</link>
          <description>Horology and watchmaking.</description>
        </channel>
      </rss>
    `;
    const meta = extractFeedMetadata(xml, 'https://watchblog.example.com/rss.xml');
    expect(meta.name).toBe('Test Watch Blog');
    expect(meta.site).toBe('https://watchblog.example.com');
    expect(meta.description).toBe('Horology and watchmaking.');
  });
});


