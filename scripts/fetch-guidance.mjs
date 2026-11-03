#!/usr/bin/env node
/**
 * Download private guidance JSON (and optionally PDFs) from the companion repo
 * into gitignored local paths for Vite build/dev and the AME parser.
 *
 * Env:
 *   GUIDANCE_REPO   owner/name (default: Colby-Frison/Capstone-Fall2026-guidance)
 *   GUIDANCE_TOKEN     GitHub PAT with read access to that private repo
 *   GUIDANCE_REF       branch/tag/sha (default: main)
 *   GUIDANCE_REQUIRED  when "1"/"true", missing token or fetch failure exits non-zero
 *                      (default: soft-fail and let Vite use samples/)
 *
 * Flags:
 *   --with-pdfs     also download manifest.pdfs into Documentation/Resources/
 *   --help
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'data', 'guidance', 'content');
const RESOURCES_DIR = path.join(ROOT, 'Documentation', 'Resources');

const repo = process.env.GUIDANCE_REPO || 'Colby-Frison/Capstone-Fall2026-guidance';
const token = process.env.GUIDANCE_TOKEN || process.env.GITHUB_TOKEN || '';
const ref = process.env.GUIDANCE_REF || 'main';
const required = /^(1|true|yes)$/i.test(String(process.env.GUIDANCE_REQUIRED || ''));
const withPdfs = process.argv.includes('--with-pdfs');
const help = process.argv.includes('--help') || process.argv.includes('-h');

function fail(message, code = 1) {
  console.error(`fetch-guidance: ${message}`);
  process.exit(code);
}

function softFail(message) {
  console.warn(`fetch-guidance: ${message}`);
  console.warn(
    'fetch-guidance: skipping download; Vite will use src/data/guidance/samples/. Set GUIDANCE_TOKEN to load private guidance, or GUIDANCE_REQUIRED=1 to fail the build without it.',
  );
  process.exit(0);
}

if (help) {
  console.log(`Usage: node scripts/fetch-guidance.mjs [--with-pdfs]

Uses GUIDANCE_TOKEN (read access to ${repo}) when set.
Writes guidance JSON under src/data/guidance/content/.
`);
  process.exit(0);
}

if (!token) {
  const msg =
    'GUIDANCE_TOKEN is not set. Export a GitHub PAT with read access to the private guidance repo.';
  if (required) fail(msg);
  softFail(msg);
}

async function githubJson(urlPath) {
  const url = `https://api.github.com/repos/${repo}/${urlPath}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'capstone-fetch-guidance',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    fail(`GitHub API ${res.status} for ${urlPath}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

async function downloadRepoFile(repoPath) {
  const encoded = repoPath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  const meta = await githubJson(`contents/${encoded}?ref=${encodeURIComponent(ref)}`);
  if (meta.type !== 'file' || !meta.download_url) {
    fail(`Expected a file at ${repoPath}, got type=${meta.type}`);
  }
  const res = await fetch(meta.download_url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'capstone-fetch-guidance',
    },
  });
  if (!res.ok) {
    fail(`Download failed for ${repoPath}: HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/** Hash JSON as LF-normalized UTF-8 so Windows CRLF checkouts match GitHub blobs. */
function sha256GuidancePayload(buf, repoPath) {
  if (repoPath.endsWith('.json')) {
    const text = buf.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    return sha256(Buffer.from(text, 'utf8'));
  }
  return sha256(buf);
}

function stripGuidancePrefix(repoPath) {
  return repoPath.replace(/^guidance\//, '');
}

async function writeBinary(absPath, buf) {
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, buf);
}

async function main() {
  console.log(`fetch-guidance: repo=${repo} ref=${ref}`);
  const manifestBuf = await downloadRepoFile('manifest.json');
  const manifest = JSON.parse(manifestBuf.toString('utf8'));
  const guidanceEntries = Array.isArray(manifest.guidance) ? manifest.guidance : [];
  if (!guidanceEntries.length) {
    fail('manifest.json has no guidance entries');
  }

  await rm(CONTENT_DIR, { recursive: true, force: true });
  await mkdir(CONTENT_DIR, { recursive: true });
  await writeBinary(path.join(CONTENT_DIR, '.gitkeep'), Buffer.from('', 'utf8'));

  for (const entry of guidanceEntries) {
    const repoPath = entry.path;
    if (!repoPath || typeof repoPath !== 'string') continue;
    if (!repoPath.startsWith('guidance/') || !repoPath.endsWith('.json')) {
      console.warn(`fetch-guidance: skipping unexpected guidance path ${repoPath}`);
      continue;
    }
    const buf = await downloadRepoFile(repoPath);
    if (entry.sha256) {
      const actual = sha256GuidancePayload(buf, repoPath);
      if (actual !== String(entry.sha256).toLowerCase()) {
        fail(`SHA-256 mismatch for ${repoPath}: expected ${entry.sha256}, got ${actual}`);
      }
    }
    const rel = stripGuidancePrefix(repoPath);
    const dest = path.join(CONTENT_DIR, rel);
    await writeBinary(dest, buf);
    console.log(`fetch-guidance: wrote ${path.relative(ROOT, dest)}`);
  }

  // Preserve drop-zone docs for local clones that re-fetch.
  await writeBinary(
    path.join(CONTENT_DIR, 'README.md'),
    Buffer.from(
      '# Private guidance drop zone\n\nPopulated by `scripts/fetch-guidance.mjs`. Do not commit.\n',
      'utf8',
    ),
  );

  if (withPdfs) {
    const pdfEntries = Array.isArray(manifest.pdfs) ? manifest.pdfs : [];
    for (const entry of pdfEntries) {
      const repoPath = entry.path;
      if (!repoPath || typeof repoPath !== 'string') continue;
      const buf = await downloadRepoFile(repoPath);
      if (entry.sha256) {
        const actual = sha256(buf);
        if (actual !== String(entry.sha256).toLowerCase()) {
          fail(`SHA-256 mismatch for ${repoPath}: expected ${entry.sha256}, got ${actual}`);
        }
      }
      const name = path.basename(repoPath);
      const dest = path.join(RESOURCES_DIR, name);
      await writeBinary(dest, buf);
      console.log(`fetch-guidance: wrote ${path.relative(ROOT, dest)}`);
    }
  }

  console.log('fetch-guidance: done');
}

main().catch((err) => {
  const message = err?.stack || String(err);
  if (required) fail(message);
  softFail(message);
});
