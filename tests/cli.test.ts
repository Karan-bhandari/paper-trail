import { describe, it, expect } from 'vitest';
import { slugify, generateMarkdown } from '../scripts/add-link.mjs';

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
});
