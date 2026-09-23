import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import feeds from '../src/data/feeds.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Data Integrity', () => {
  it('validates src/data/feeds.json format and URLs', () => {
    expect(feeds.length).toBeGreaterThan(0);
    for (const feed of feeds) {
      expect(feed.name).toBeTruthy();
      expect(feed.url).toMatch(/^https?:\/\//);
      expect(Array.isArray(feed.tags)).toBe(true);
      expect(feed.tags.length).toBeGreaterThan(0);
    }
  });

  it('validates seed links in src/content/links', () => {
    const linksDir = path.resolve(__dirname, '../src/content/links');
    const files = fs.readdirSync(linksDir).filter((f: string) => f.endsWith('.md'));
    expect(files.length).toBeGreaterThanOrEqual(4);

    for (const file of files) {
      const content = fs.readFileSync(path.join(linksDir, file), 'utf8');
      expect(content).toMatch(/^---[\s\S]+?---/);
      expect(content).toContain('title:');
      expect(content).toContain('url:');
      expect(content).toContain('date:');
      expect(content).toContain('tags:');
    }
  });

  it('validates src/content.config.ts exists', () => {
    const configPath = path.resolve(__dirname, '../src/content.config.ts');
    expect(fs.existsSync(configPath)).toBe(true);
  });
});
