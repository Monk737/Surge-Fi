// Runs automatically before `npm start` (the "prestart" script).
//
// `next start` only serves an existing production build, so this builds one when
// .next/ has none yet (fresh checkout, first deploy) or when the sources or env
// files have changed since the last build. NEXT_PUBLIC_* values are baked in at
// build time, which is why env files count as build inputs.
//
// Environment variables set outside these files (e.g. in a hosting dashboard)
// cannot be detected here — run `npm run build` after changing those.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const BUILD_MARKER = path.join('.next', 'BUILD_ID');
const BUILD_INPUTS = [
  'src',
  'next.config.js',
  'package.json',
  'tailwind.config.ts',
  'postcss.config.mjs',
  'tsconfig.json',
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
];

function newestMtime(target) {
  if (!existsSync(target)) return 0;
  const stats = statSync(target);
  if (!stats.isDirectory()) return stats.mtimeMs;
  return readdirSync(target).reduce(
    (newest, entry) => Math.max(newest, newestMtime(path.join(target, entry))),
    0,
  );
}

function buildReason() {
  if (!existsSync(BUILD_MARKER)) return 'no production build found';
  const builtAt = statSync(BUILD_MARKER).mtimeMs;
  const changed = BUILD_INPUTS.find(input => newestMtime(input) > builtAt);
  return changed ? `${changed} changed since the last build` : null;
}

const reason = buildReason();
if (reason) {
  console.log(`> ${reason} — running "npm run build" before starting...`);
  const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });
  process.exit(result.status ?? 1);
}
