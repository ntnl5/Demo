#!/usr/bin/env node
// Gate tests. Every gate exists to stop something untrue reaching a client's site, so
// each one needs a test proving it still fires. Run with: node tools/test.mjs
//
// Each case mutates a copy of clients/_example/client.json, builds it into a scratch
// slug, and asserts the build failed with the expected gate (or succeeded, for the
// cases that should pass). No dependencies, same as the builder.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = '_test';
const CLIENT_DIR = path.join(ROOT, 'clients', SLUG);
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'clients/_example/client.json'), 'utf8'));

// A client that would pass every gate on a --live build, used as the starting point for
// the launch-time cases.
function liveReady() {
  const d = structuredClone(BASE);
  d.meta.noindex = false;
  d.meta.description = 'Roofing across Glasgow.';
  d.meta.ogDescription = 'Roofing across Glasgow.';
  d.meta.ogImageAlt = 'A roofing van.';
  d.testimonials = [
    { quote: 'Solid work, on time.', rating: 5, name: 'A. Smith', attribution: 'Verified customer', source: 'Google, captured 2026-08-01' },
  ];
  return d;
}

function build(data, live) {
  fs.mkdirSync(CLIENT_DIR, { recursive: true });
  fs.writeFileSync(path.join(CLIENT_DIR, 'client.json'), JSON.stringify(data));
  const args = ['tools/build.mjs', SLUG];
  if (live) args.push('--live');
  try {
    return { ok: true, out: execFileSync('node', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || '') };
  }
}

const cases = [
  // [name, mutate, expected] where expected is a gate number, or 'builds'.
  ['gate 1  accreditation with no source', (d) => { d.accreditations = [{ name: 'NFRC' }]; }, 1],
  ['gate 2  testimonial with no source', (d) => { delete d.testimonials[0].source; }, 2],
  ['gate 2  rating outside 1-5', (d) => { d.testimonials[0].rating = 6; }, 2],
  ['gate 2  ratingLabel contradicts rating', (d) => { d.testimonials[0].rating = 4; d.testimonials[0].ratingLabel = '5.0'; }, 2],
  ['gate 3  reviews with no source', (d) => { d.reviews = { score: 4.9 }; }, 3],
  ['gate 4  finance with no FCA disclosure', (d) => { d.finance = { provider: 'X' }; }, 4],
  ['gate 5  demo build that is not noindex', (d) => { d.meta.noindex = false; }, 5],
  ['gate 7  placeholder text in the data', (d) => { d.hero.titleLine1 = 'TODO write this'; }, 7],
  ['gate 9  baseUrl with a trailing slash', (d) => { d.site.baseUrl = 'https://example.pages.dev/'; }, 9],
  ['gate 9  relative baseUrl', (d) => { d.site.baseUrl = 'example.pages.dev'; }, 9],
  ['gate 11 apostrophe breaking inline JS', (d) => { d.gallery[0].title = "O'Brien's job"; }, 11],
  ['gate 13 social link with no destination', (d) => { d.social = [{ label: 'Facebook', url: '#' }]; }, 13],
  ['gate 13 social link over http', (d) => { d.social = [{ label: 'Facebook', url: 'http://example.com' }]; }, 13],
  ['gate 13 social link with no label', (d) => { d.social = [{ url: 'https://example.com' }]; }, 13],
  ['        demo build with sample content', (d) => d, 'builds'],
];

const liveCases = [
  ['gate 6  --live while still noindex', (d) => { d.meta.noindex = true; }, 6],
  ['gate 8  endpoint with no Turnstile key', (d) => { d.forms.endpoint = 'https://example.com/f'; d.forms.turnstileSiteKey = null; }, 8],
  ['gate 8  Cloudflare test key on --live', (d) => { d.forms.turnstileSiteKey = '1x00000000000000000000AA'; }, 8],
  ['gate 12 demo wording surviving --live', (d) => { d.testimonials = BASE.testimonials; }, 12],
  ['gate 12 preview wording in meta', (d) => { d.meta.description = 'A design preview.'; }, 12],
  ['        --live build that is fully ready', (d) => d, 'builds'],
];

let passed = 0;
let failed = 0;

function run(label, mutate, expected, live) {
  const data = live ? liveReady() : structuredClone(BASE);
  mutate(data);
  const res = build(data, live);
  let ok;
  if (expected === 'builds') ok = res.ok;
  else ok = !res.ok && new RegExp(`Gate ${expected} failed`).test(res.out);
  console.log(`${ok ? '  pass' : '  FAIL'}  ${label}`);
  if (!ok) {
    console.log(`        expected ${expected === 'builds' ? 'a successful build' : `gate ${expected} to fire`}`);
    console.log(`        got: ${res.out.trim().split('\n')[0].slice(0, 140)}`);
  }
  ok ? passed++ : failed++;
}

console.log('\nDemo builds');
for (const [label, mutate, expected] of cases) run(label, mutate, expected, false);
console.log('\nLive builds (--live)');
for (const [label, mutate, expected] of liveCases) run(label, mutate, expected, true);

fs.rmSync(CLIENT_DIR, { recursive: true, force: true });
fs.rmSync(path.join(ROOT, 'dist', SLUG), { recursive: true, force: true });

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
