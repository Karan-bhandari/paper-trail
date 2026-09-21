# Paper Trail

[![Astro](https://img.shields.io/badge/Astro_7-000000?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.9-000000?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vitest](https://img.shields.io/badge/Vitest-000000?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-000000?style=flat-square&logo=githubpages&logoColor=white)](https://pages.github.com)
[![RSS 2.0](https://img.shields.io/badge/RSS_2.0-000000?style=flat-square&logo=rss&logoColor=white)](https://rss.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-000000?style=flat-square)](LICENSE)

A personal link log, RSS aggregator, and blogroll built with Astro.

- `/`: Curated links with search and tag filters
- `/radar`: Automated RSS stream from followed blogs
- `/feeds`: Directory of followed sources with OPML export
- `/rss.xml`: Outbound RSS 2.0 feed
- `/feeds.opml`: OPML export of followed feeds

## Quickstart

```bash
npm install
npm run dev       # Start dev server (http://localhost:4321)
npm test          # Run Vitest test suite
npm run check     # Typecheck Astro and TypeScript
npm run build     # Build static output to dist/
```

## Adding Links

### CLI

Scrapes page title and description automatically with zero extra dependencies:

```bash
npm run add "https://fly.io/blog/all-in-on-sqlite/" "Notes on edge SQLite" "systems,databases"
```

Preview frontmatter without writing to disk:

```bash
npm run add "https://example.com" --test
```

### Manual

Add a markdown file to `src/content/links/`:

```markdown
---
title: "Article Title"
url: "https://example.com"
date: 2026-09-20
tags: ["systems", "databases"]
author: "Author"
via: "example.com"
---

Notes go here.
```

## Configuring Feeds

Add RSS, Atom, or Substack feeds to `src/data/feeds.json`:

```json
[
  {
    "name": "Gwern Branwen",
    "url": "https://gwern.net/feed",
    "site": "https://gwern.net",
    "category": "essays",
    "description": "Explorations of psychology, statistics, and AI."
  }
]
```

Feeds are polled at build time to generate `/radar`.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml` to build and deploy to GitHub Pages via GitHub Actions. A scheduled cron every 2 hours rebuilds the site to keep `/radar` updated.


