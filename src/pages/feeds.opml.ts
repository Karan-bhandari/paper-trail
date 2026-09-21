import feeds from '../data/feeds.json';

export async function GET() {
  const xmlEntities = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const outlines = feeds
    .map(
      (f) =>
        `    <outline text="${xmlEntities(f.name)}" title="${xmlEntities(f.name)}" type="rss" xmlUrl="${xmlEntities(f.url)}" htmlUrl="${xmlEntities(f.site || f.url)}" category="${xmlEntities(f.category || 'general')}" />`
    )
    .join('\n');

  const opmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Paper Trail — Followed Feeds &amp; Sources</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
    <ownerName>Karan</ownerName>
  </head>
  <body>
    <outline text="Followed Feeds" title="Followed Feeds">
${outlines}
    </outline>
  </body>
</opml>`;

  return new Response(opmlContent, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': 'inline; filename="feeds.opml"',
    },
  });
}
