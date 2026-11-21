// Spot the Difference — Cosmic Laundromat: the hand-in program.
//
// Node 22, standard library only. It takes this directory's game/ (plain
// static files a desktop browser loads offline) and screenshots/ (three
// or four renders, the first by name the cover) and assembles the entry
// the make.fun scorer reads: game/, screenshots/ and dossier.json, the
// summary written by the vendored make.fun library.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Without MAKEFUN_OUTPUT_DIR it writes to /output, the grader's own
// directory. Run `node serve.ts` and open http://localhost:8080 to play
// the game before handing it in.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Fail loudly with a plain message instead of a stack trace. */
function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

/** The files a directory holds, so the log can say what was handed in. */
function listing(dir) {
  try {
    return readdirSync(dir).sort();
  } catch {
    return [];
  }
}

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
  fail('game/ is missing: the entry needs its game directory beside main.ts.');
}
if (!existsSync(join(gameDir, 'index.html'))) {
  fail('game/index.html is missing: a game is a directory of static files with its page at the root.');
}
if (!existsSync(shotsDir) || listing(shotsDir).length === 0) {
  fail('screenshots/ holds no renders: hand in 3 or 4 PNG or JPEG renders, the first by name the cover.');
}

// A fresh output directory each run, so a stale file can never ride along.
mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

// The scorer's own caps, from the bounty's gate: only text_max_bytes
// shapes the bytes; the rest refuse an entry the scorer would refuse —
// more than 4 screenshots or one over 256 KiB, more than 993 entries in
// game/ or 48 MiB of game files, or a game path over 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(`handed in ${listing(join(outputDir, 'game')).length} game entries and ${listing(join(outputDir, 'screenshots')).length} screenshots to ${outputDir}`);
console.log(`dossier.json: ${dossier.length} bytes`);
