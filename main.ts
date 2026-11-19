// Vice Coast Cover Lab — entry program for gta6-cover-art-01 (Node 22, stdlib only).
// The cover maker lives in app/ as plain static files a desktop browser opens offline.
// This program hands the entry in: it copies app/ and screenshots/ from beside this file
// into the output directory and writes output/dossier.json with the vendored make.fun
// library, so the judge can read the app's source and screenshots.
//
// Local check: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Local preview: node serve.ts, then open http://localhost:8080
// Round-2 rebuild note: every app line below the starter was written fresh in this session.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Caps from the scorer's gate: the dossier text cap shapes the bytes; the rest refuse an
// entry the scorer would refuse (over 4 screenshots or one over 256 KiB; over 993 files in
// app/ or 48 MiB of app files in all; any app/ path over 1000 bytes).
// Round-2 revision: build the dossier text first, then write it, so a failed build never
// leaves a half-written dossier.json behind in the output directory.
const dossierText = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossierText);
