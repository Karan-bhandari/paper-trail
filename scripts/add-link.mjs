#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LINKS_DIR = path.resolve(__dirname, '../src/content/links');

// Clean and slugify text
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

// Helper to decode basic HTML entities
const clean = (s) =>
  s
    ? s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
    : '';

// Scrapes title and description from a URL using native RegExp
export async function scrapeUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PaperTrail/1.0; +https://github.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { title: '', description: '' };
    }

    const html = await res.text();

    const titleMatch =
      html.match(/<meta[^>]+(?:property|name)=["'](?:og:title|twitter:title)["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:title|twitter:title)["']/i)?.[1] ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

    const descMatch =
      html.match(/<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:description|description)["']/i)?.[1];

    const title = clean(titleMatch) || new URL(url).hostname;
    const description = clean(descMatch);

    return { title, description };
  } catch {
    return { title: '', description: '' };
  }
}

// Generate the markdown content
export function generateMarkdown({ title, url, date, tags, notes, author, via }) {
  const safeTitle = title.replace(/"/g, '\\"');
  const tagList = tags.map((t) => `"${t.trim()}"`).join(', ');

  return `---
title: "${safeTitle}"
url: "${url}"
date: ${date}
tags: [${tagList}]${author ? `\nauthor: "${author}"` : ''}${via ? `\nvia: "${via}"` : ''}
---

${notes}
`;
}

// CLI entrypoint
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
[+] Usage:
    npm run add <url> [notes] [tags]

[+] Examples:
    npm run add "https://fly.io/blog/all-in-on-sqlite/" "Great post on SQLite replication" "systems,databases"
    npm run add "https://gwern.net/spaced-repetition"

[+] Options:
    --dry-run, --test    Simulate scraping and markdown generation without writing to disk
`);
    process.exit(0);
  }

  const isTest = args.includes('--test') || args.includes('--dry-run');
  const filteredArgs = args.filter((a) => !a.startsWith('--'));

  const inputUrl = filteredArgs[0];
  const inputNotes = filteredArgs[1] || '';
  const inputTags = filteredArgs[2]
    ? filteredArgs[2].split(',').map((t) => t.trim())
    : ['reads'];

  try {
    new URL(inputUrl);
  } catch {
    console.error(`[!] Error: Invalid URL provided: "${inputUrl}"`);
    process.exit(1);
  }

  console.log(`[*] Fetching metadata for ${inputUrl}...`);
  const scraped = await scrapeUrl(inputUrl);

  const title = scraped.title || new URL(inputUrl).hostname;
  const notes = inputNotes || scraped.description || 'Interesting find.';
  const today = new Date().toISOString().slice(0, 10);
  const slug = slugify(title) || 'link';

  const filename = `${today}-${slug}.md`;
  const filePath = path.join(LINKS_DIR, filename);

  const content = generateMarkdown({
    title,
    url: inputUrl,
    date: today,
    tags: inputTags,
    notes,
    via: new URL(inputUrl).hostname.replace('www.', ''),
  });

  if (isTest) {
    console.log(`[+] SUCCESS (DRY-RUN / TEST): Would write to ${filename}`);
    console.log(content);
    process.exit(0);
  }

  fs.mkdirSync(LINKS_DIR, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`[+] SUCCESS: Created new dispatch!`);
  console.log(`    File: src/content/links/${filename}`);
  console.log(`    Title: ${title}`);
  console.log(`    Tags: [${inputTags.join(', ')}]`);
}

// Only execute if called directly from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
