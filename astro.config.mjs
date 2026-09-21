import { defineConfig } from 'astro/config';

const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
const site = process.env.SITE_URL || (owner ? `https://${owner}.github.io` : 'http://localhost:4321');
const base = process.env.BASE_PATH || (repo && repo.toLowerCase() !== `${owner?.toLowerCase()}.github.io` ? `/${repo}` : '/');

export default defineConfig({
  site,
  base,
  output: 'static',
  build: { format: 'directory' },
});
