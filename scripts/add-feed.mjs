#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FEEDS_FILE = path.resolve(__dirname, '../src/data/feeds.json');

// Helper to decode basic XML entities & strip tags
export function cleanText(raw) {
  if (!raw) return '';
  return raw
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Slugify string for branch and identifier
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

// Parses GitHub issue body and title for feed submissions
export function parseFeedIssueBody(body = '', title = '') {
  const urlMatch = body.match(/###\s*(?:Feed\s*)?URL\s*\n+([^\n#]+)/i);
  const nameMatch = body.match(/###\s*.*?Name\s*\n+([^\n#]+)/i);
  const catMatch = body.match(/###\s*Category\s*\n+([^\n#]+)/i);
  const descMatch = body.match(/###\s*Description\s*\n+([\s\S]*?)(?:###|$)/i);

  let url = urlMatch ? urlMatch[1].trim() : '';
  let name = nameMatch ? nameMatch[1].trim() : '';
  let category = catMatch ? catMatch[1].trim() : 'blogs';
  let description = descMatch ? descMatch[1].trim() : '';

  if (!url || url.toLowerCase() === '_no response_') {
    const rawMatch = (body + ' ' + title).match(/https?:\/\/[^\s)"]+/);
    url = rawMatch ? rawMatch[0].trim() : '';
  }

  url = url.replace(/^[<(\[]+|[>)\]]+$/g, '').trim();

  if (name.toLowerCase() === '_no response_') name = '';
  if (category.toLowerCase() === '_no response_') category = 'blogs';
  if (description.toLowerCase() === '_no response_') description = '';

  return { url, name, category, description };
}

// Extracts feed title, site, and description from raw RSS/Atom XML
export function extractFeedMetadata(xml, feedUrl) {
  const isAtom = xml.includes('<feed') || xml.includes('<entry');
  let name = '';
  let site = '';
  let description = '';

  if (isAtom) {
    const titleMatch =
      xml.match(/<feed[^>]*>[\s\S]*?<title[^>]*>(.*?)<\/title>/i) ||
      xml.match(/<title[^>]*>(.*?)<\/title>/i);
    name = titleMatch ? cleanText(titleMatch[1]) : '';

    const altLinkMatch =
      xml.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ||
      xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["']/i) ||
      xml.match(/<link[^>]*href=["']([^"']+)["']/i);
    site = altLinkMatch ? altLinkMatch[1] : '';

    const subMatch = xml.match(/<subtitle[^>]*>(.*?)<\/subtitle>/i);
    description = subMatch ? cleanText(subMatch[1]) : '';
  } else {
    // RSS
    const channelMatch = xml.match(/<channel[\s>]([\s\S]*?)(?:<item[\s>]|<\/channel>)/i);
    const channelXml = channelMatch ? channelMatch[1] : xml;

    const titleMatch = channelXml.match(/<title[^>]*>(.*?)<\/title>/i);
    name = titleMatch ? cleanText(titleMatch[1]) : '';

    const linkMatch = channelXml.match(/<link[^>]*>(.*?)<\/link>/i);
    site = linkMatch ? cleanText(linkMatch[1]) : '';

    const descMatch = channelXml.match(/<description[^>]*>(.*?)<\/description>/i);
    description = descMatch ? cleanText(descMatch[1]) : '';
  }

  if (!site) {
    try {
      const parsedUrl = new URL(feedUrl);
      site = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
    } catch {
      site = feedUrl;
    }
  }

  return { name, site, description };
}

// Fetches and verifies feed XML
export async function fetchAndVerifyFeed(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PaperTrail/1.0; +https://github.com)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch feed.`);
    }

    const xml = await res.text();
    if (!xml.includes('<rss') && !xml.includes('<feed') && !xml.includes('<xml') && !xml.includes('<channel')) {
      throw new Error('URL does not return valid RSS or Atom XML.');
    }

    return xml;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// CLI entrypoint
async function main() {
  const args = process.argv.slice(2);
  const fromIssue = args.includes('--from-issue');
  const isTest = args.includes('--test') || args.includes('--dry-run');

  if (!fromIssue && (args.length === 0 || args.includes('--help') || args.includes('-h'))) {
    console.log(`
[+] Usage:
    node scripts/add-feed.mjs <url> [category] [name] [description]
    node scripts/add-feed.mjs --from-issue

[+] Examples:
    node scripts/add-feed.mjs "https://wornandwound.com/feed/" "watches"
    node scripts/add-feed.mjs "https://danluu.com/atom.xml" "hardware"

[+] Options:
    --dry-run, --test    Verify feed and show preview without modifying src/data/feeds.json
    --from-issue         Parse feed parameters from ISSUE_BODY / ISSUE_TITLE env variables
`);
    process.exit(0);
  }

  const filteredArgs = args.filter((a) => !a.startsWith('--'));

  let inputUrl = '';
  let inputCategory = 'blogs';
  let inputName = '';
  let inputDesc = '';

  if (fromIssue) {
    const parsed = parseFeedIssueBody(process.env.ISSUE_BODY || '', process.env.ISSUE_TITLE || '');
    inputUrl = parsed.url;
    inputCategory = parsed.category || 'blogs';
    inputName = parsed.name;
    inputDesc = parsed.description;
  } else {
    inputUrl = filteredArgs[0];
    inputCategory = filteredArgs[1] || 'blogs';
    inputName = filteredArgs[2] || '';
    inputDesc = filteredArgs[3] || '';
  }

  if (!inputUrl) {
    console.error('[!] Error: No Feed URL provided.');
    process.exit(1);
  }

  try {
    new URL(inputUrl);
  } catch {
    console.error(`[!] Error: Invalid Feed URL provided: "${inputUrl}"`);
    process.exit(1);
  }

  // Check if feeds file exists
  let currentFeeds = [];
  try {
    currentFeeds = JSON.parse(fs.readFileSync(FEEDS_FILE, 'utf8'));
  } catch {
    currentFeeds = [];
  }

  // Duplicate check
  const existing = currentFeeds.find(
    (f) => f.url.toLowerCase() === inputUrl.toLowerCase()
  );
  if (existing) {
    console.error(`[!] Error: Feed is already registered: "${existing.name}" (${existing.url})`);
    process.exit(1);
  }

  console.log(`[*] Validating and fetching feed: ${inputUrl}...`);
  let xml = '';
  try {
    xml = await fetchAndVerifyFeed(inputUrl);
  } catch (err) {
    console.error(`[!] Failed to verify feed: ${err.message}`);
    process.exit(1);
  }

  const extracted = extractFeedMetadata(xml, inputUrl);
  const finalName = inputName || extracted.name || new URL(inputUrl).hostname;
  const finalSite = extracted.site || `${new URL(inputUrl).protocol}//${new URL(inputUrl).hostname}`;
  const finalDesc = inputDesc || extracted.description || `Followed feed from ${finalName}.`;
  const slug = slugify(finalName) || 'feed';

  const newFeedEntry = {
    name: finalName,
    url: inputUrl,
    site: finalSite,
    category: inputCategory.toLowerCase(),
    description: finalDesc,
  };

  if (isTest) {
    console.log(`[+] SUCCESS (DRY-RUN / TEST): Verified feed successfully.`);
    console.log(JSON.stringify(newFeedEntry, null, 2));
    process.exit(0);
  }

  currentFeeds.push(newFeedEntry);
  fs.writeFileSync(FEEDS_FILE, JSON.stringify(currentFeeds, null, 2) + '\n', 'utf8');

  console.log(`[+] SUCCESS: Added new feed source!`);
  console.log(`    Name: ${finalName}`);
  console.log(`    URL: ${inputUrl}`);
  console.log(`    Site: ${finalSite}`);
  console.log(`    Category: ${inputCategory}`);

  if (fromIssue) {
    const prBody = `Closes #${process.env.ISSUE_NUMBER || ''}

### Feed Source Preview
- **Name**: ${finalName}
- **Feed URL**: ${inputUrl}
- **Website**: ${finalSite}
- **Category**: \`${inputCategory}\`
- **Description**: ${finalDesc}

*Generated from issue #${process.env.ISSUE_NUMBER || ''}. Merge to add to /radar.*
`;
    fs.writeFileSync('/tmp/pr-body.txt', prBody, 'utf8');
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `name=${finalName.replace(/[\r\n]+/g, ' ')}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `url=${inputUrl}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `category=${inputCategory}\n`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
