#!/usr/bin/env node
// Dependency-free rebrand-kit builder. Node 18+, no npm install, ever — see REBRAND-KIT.md.
//
// Usage:
//   node tools/build.mjs <slug>          build one client
//   node tools/build.mjs                 build every client in clients/ (skips _-prefixed folders)
//   node tools/build.mjs <slug> --live    allow indexing (requires meta.noindex: false in client.json)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const STATIC_DIR = path.join(TEMPLATES_DIR, 'static');
const CLIENTS_DIR = path.join(ROOT, 'clients');
const DIST_DIR = path.join(ROOT, 'dist');

class BuildError extends Error {}
function fail(message) {
  throw new BuildError(message);
}

// ---------------------------------------------------------------------------
// Template engine
// ---------------------------------------------------------------------------
// Only five constructs exist. Blocks nest via an explicit stack (depth
// counting), not regex non-greedy matching, so mismatched/nested tags fail
// loudly instead of silently mis-closing.

// Block paths accept the same characters as variable paths — `{{#unless @last}}` is the
// separator idiom and must tokenize as a block opener, not fall through to text (which
// would leave its {{/unless}} looking unmatched).
const PATH = String.raw`[\w@][\w.@]*`;
const TOKEN_RE = new RegExp(
  String.raw`\{\{\{\s*(${PATH})\s*\}\}\}` +
    String.raw`|\{\{#each\s+(${PATH})\s*\}\}|\{\{\/each\}\}` +
    String.raw`|\{\{#if\s+(${PATH})\s*\}\}|\{\{\/if\}\}` +
    String.raw`|\{\{#unless\s+(${PATH})\s*\}\}|\{\{\/unless\}\}` +
    String.raw`|\{\{\s*(${PATH})\s*\}\}`,
  'g'
);

function tokenize(src) {
  const tokens = [];
  let lastEnd = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(src))) {
    if (m.index > lastEnd) tokens.push({ type: 'text', value: src.slice(lastEnd, m.index) });
    if (m[1] !== undefined) tokens.push({ type: 'raw', path: m[1] });
    else if (m[2] !== undefined) tokens.push({ type: 'each-open', path: m[2] });
    else if (m[0] === '{{/each}}') tokens.push({ type: 'each-close' });
    else if (m[3] !== undefined) tokens.push({ type: 'if-open', path: m[3] });
    else if (m[0] === '{{/if}}') tokens.push({ type: 'if-close' });
    else if (m[4] !== undefined) tokens.push({ type: 'unless-open', path: m[4] });
    else if (m[0] === '{{/unless}}') tokens.push({ type: 'unless-close' });
    else if (m[5] !== undefined) tokens.push({ type: 'var', path: m[5] });
    lastEnd = TOKEN_RE.lastIndex;
  }
  if (lastEnd < src.length) tokens.push({ type: 'text', value: src.slice(lastEnd) });
  return tokens;
}

function buildTree(tokens, templateName) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const closers = { each: 'each-close', if: 'if-close', unless: 'unless-close' };
  for (const tok of tokens) {
    const top = stack[stack.length - 1];
    if (tok.type === 'each-open' || tok.type === 'if-open' || tok.type === 'unless-open') {
      const kind = tok.type.replace('-open', '');
      const node = { type: kind, path: tok.path, children: [] };
      top.children.push(node);
      stack.push(node);
    } else if (tok.type === 'each-close' || tok.type === 'if-close' || tok.type === 'unless-close') {
      const kind = tok.type.replace('-close', '');
      if (stack.length < 2 || stack[stack.length - 1].type !== kind) {
        fail(`${templateName}: unmatched {{/${kind}}} — check block nesting.`);
      }
      stack.pop();
    } else {
      top.children.push(tok);
    }
  }
  if (stack.length !== 1) {
    fail(`${templateName}: unclosed {{#${stack[stack.length - 1].type}}} block — every {{#each}}/{{#if}}/{{#unless}} needs a matching close tag.`);
  }
  return root;
}

function getPath(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc === undefined || acc === null ? undefined : acc[key]), obj);
}

function isUnset(value) {
  if (value === null || value === undefined || value === false || value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Resolves a path against the innermost {{#each}} frame first (`this`, `this.x`, `@index`
// etc.), falling back to the client's data root for everything else.
function resolve(pathStr, stack, root) {
  const frame = stack[stack.length - 1];
  if (pathStr.startsWith('@')) {
    if (!frame) return undefined;
    if (pathStr === '@index') return frame.index;
    if (pathStr === '@number') return frame.index + 1;
    if (pathStr === '@first') return frame.index === 0;
    if (pathStr === '@last') return frame.index === frame.length - 1;
    return undefined;
  }
  if (pathStr === 'this') return frame ? frame.item : undefined;
  if (pathStr.startsWith('this.')) return frame ? getPath(frame.item, pathStr.slice(5)) : undefined;
  return getPath(root, pathStr);
}

function render(node, root, stack) {
  let out = '';
  for (const child of node.children) {
    if (child.type === 'text') {
      out += child.value;
    } else if (child.type === 'var') {
      const val = resolve(child.path, stack, root);
      // Undefined (missing JSON key / typo) is left as the raw token so gate 10 can
      // catch it after rendering. An explicit null is a real value: render as "".
      out += val === undefined ? `{{${child.path}}}` : escapeHtml(val);
    } else if (child.type === 'raw') {
      const val = resolve(child.path, stack, root);
      out += val === undefined ? `{{{${child.path}}}}` : String(val);
    } else if (child.type === 'if') {
      const val = resolve(child.path, stack, root);
      if (!isUnset(val)) out += render(child, root, stack);
    } else if (child.type === 'unless') {
      const val = resolve(child.path, stack, root);
      if (isUnset(val)) out += render(child, root, stack);
    } else if (child.type === 'each') {
      const val = resolve(child.path, stack, root);
      const arr = Array.isArray(val) ? val : [];
      arr.forEach((item, index) => {
        stack.push({ item, index, length: arr.length });
        out += render(child, root, stack);
        stack.pop();
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

function toTelHref(display) {
  if (!display) return '';
  return 'tel:' + String(display).replace(/[^\d+]/g, '');
}

// schema.org wants E.164. Derived from the displayed number so the two can never drift
// apart; a client with a non-UK number sets business.phoneIntl explicitly to override.
function toIntlPhone(display) {
  if (!display) return '';
  const digits = String(display).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('0')) return '+44' + digits.slice(1);
  return digits;
}

function toSentence(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  if (list.length === 1) return list[0];
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

function getNoindex(data) {
  return typeof data?.meta?.noindex === 'boolean' ? data.meta.noindex : true;
}

function computeView(data, slug) {
  const view = JSON.parse(JSON.stringify(data));
  view.site = view.site || {};
  view.site.canonical = `${view.site.baseUrl}/`;
  view.site.ogImage = `${view.site.baseUrl}/og-image.jpg`;
  view.business = view.business || {};
  view.business.phoneHref = toTelHref(view.business.phoneDisplay);
  view.business.emergencyPhoneHref = toTelHref(view.business.emergencyPhoneDisplay);
  view.business.phoneIntl = view.business.phoneIntl || toIntlPhone(view.business.phoneDisplay);
  view.business.areasSentence = toSentence(view.business.areasCovered);
  // The audit found a broken stat counter. The displayed "2,400" is derived from the
  // number rather than stored beside it, so the two cannot disagree.
  view.stats = view.stats || {};
  if (typeof view.stats.jobsCompleted === 'number') {
    view.stats.jobsCompletedFormatted = view.stats.jobsCompleted.toLocaleString('en-GB');
  }
  // Decorative (aria-hidden) avatar letter — derived from the name so it can never
  // contradict the name sitting next to it.
  for (const t of Array.isArray(view.testimonials) ? view.testimonials : []) {
    if (!t.avatarInitial) t.avatarInitial = (t.name || '').trim().charAt(0).toUpperCase();
  }
  view.legal = view.legal || {};
  view.legal.year = view.legal.year || new Date().getFullYear();
  view.meta = view.meta || {};
  view.meta.noindex = getNoindex(data);
  view.buildDate = new Date().toISOString();
  view.slug = slug;
  return view;
}

// ---------------------------------------------------------------------------
// Validation gates — run against the raw parsed JSON, before anything is rendered.
// ---------------------------------------------------------------------------

function scanForPlaceholders(value, keyPath, matches) {
  const PLACEHOLDER_RE = /YOUR_|TODO|XXXX|FIXME|REPLACE_ME|LOREM/i;
  if (typeof value === 'string') {
    const m = value.match(PLACEHOLDER_RE);
    if (m) matches.push({ keyPath: keyPath || '(root)', match: m[0], value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => scanForPlaceholders(v, `${keyPath}[${i}]`, matches));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) scanForPlaceholders(v, keyPath ? `${keyPath}.${k}` : k, matches);
  }
}

function runValidationGates(data, slug, liveFlag) {
  // Gate 9 — site.baseUrl must be absolute with no trailing slash. Checked first because
  // canonical/og:image are derived from it — a bad baseUrl would otherwise poison both.
  const baseUrl = data.site && data.site.baseUrl;
  if (typeof baseUrl !== 'string' || !/^https?:\/\//i.test(baseUrl) || baseUrl.endsWith('/')) {
    fail(
      `Gate 9 failed: site.baseUrl (${JSON.stringify(baseUrl ?? null)}) must be an absolute URL with no trailing slash, e.g. "https://${slug}.pages.dev". ` +
        `Set it once — canonical and og:image are derived from it automatically.`
    );
  }

  // Gate 1 — every accreditation must record where it was verified.
  for (const acc of data.accreditations || []) {
    if (!acc.source) {
      fail(
        `Gate 1 failed: accreditation "${acc.name || '(unnamed)'}" has no source. Displaying an unearned trade accreditation is live legal exposure ` +
          `under the DMCC Act 2024 — add a "source" field recording where this membership was verified (membership number, expiry, evidence on file), or remove the entry.`
      );
    }
  }

  // Gate 2 — every testimonial must record how it was verified.
  for (const t of data.testimonials || []) {
    if (!t.source) {
      const label = (t.quote || t.name || '(untitled)').toString().slice(0, 50);
      fail(
        `Gate 2 failed: testimonial "${label}…" has no source. Add a "source" field recording how it was verified (written permission, platform + capture date) before it can build.`
      );
    }
  }

  // Gate 3 — an aggregate review score must record where it came from.
  if (!isUnset(data.reviews) && !data.reviews.source) {
    fail(`Gate 3 failed: "reviews" is set but has no source. Add the linkable profile URL and the date the figure was captured before a rating can be shown.`);
  }

  // Gate 4 — a finance section must carry its FCA disclosure.
  if (!isUnset(data.finance) && !data.finance.fcaDisclosure) {
    fail(`Gate 4 failed: "finance" is set but has no fcaDisclosure. Introducing customers to a lender is a regulated activity — add finance.fcaDisclosure, or remove "finance" entirely and let the demo ship its non-regulated "Clear Fixed Quotes" card instead.`);
  }

  // Gates 5/6 — meta.noindex and --live must agree.
  const noindex = getNoindex(data);
  if (!liveFlag && noindex !== true) {
    fail(
      `Gate 5 failed: meta.noindex is ${JSON.stringify(data.meta ? data.meta.noindex : undefined)}, not true, and --live was not passed. ` +
        `Set meta.noindex to true in clients/${slug}/client.json, or rebuild with "node tools/build.mjs ${slug} --live" if this is an intentional indexable launch.`
    );
  }
  if (liveFlag && noindex === true) {
    fail(`Gate 6 failed: --live was passed but meta.noindex is still true. Set meta.noindex to false in clients/${slug}/client.json to confirm this is an intentional indexable launch.`);
  }

  // Gate 8 — a live form endpoint needs spam protection wired in.
  if (data.forms && data.forms.endpoint && !data.forms.turnstileSiteKey) {
    fail(`Gate 8 failed: forms.endpoint is set but forms.turnstileSiteKey is empty. Add the Cloudflare Turnstile site key before wiring up a live form endpoint — an endpoint with no spam protection is not safe to publish.`);
  }

  // Gate 7 — no unfilled placeholder text anywhere in the client's data.
  const matches = [];
  scanForPlaceholders(data, '', matches);
  if (matches.length > 0) {
    const m = matches[0];
    fail(`Gate 7 failed: placeholder text "${m.match}" found in ${m.keyPath} ("${m.value}"). Replace it with real content, or null/[] if the client doesn't have it, before this can build.`);
  }
}

// ---------------------------------------------------------------------------
// Build pipeline
// ---------------------------------------------------------------------------

function copyDirInto(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDirInto(s, d);
    else fs.copyFileSync(s, d);
  }
}

function buildClient(slug, liveFlag) {
  const clientDir = path.join(CLIENTS_DIR, slug);
  const jsonPath = path.join(clientDir, 'client.json');
  if (!fs.existsSync(jsonPath)) fail(`clients/${slug}/client.json not found.`);

  let data;
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    fail(`clients/${slug}/client.json is not valid JSON — ${e.message}`);
  }

  runValidationGates(data, slug, liveFlag);

  const view = computeView(data, slug);

  if (!fs.existsSync(TEMPLATES_DIR)) fail(`No templates/ directory found at ${TEMPLATES_DIR}`);
  // Any templates/<name>.template.<ext> is rendered to dist/<slug>/<name>.<ext>.
  // robots.txt is a template rather than a static copy so it cannot contradict
  // meta.noindex — a --live build shipping "Disallow: /" would deindex a real
  // client's site, which is the same class of bug as the stale-slug finding.
  const templateFiles = fs
    .readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && /\.template\.[A-Za-z0-9]+$/.test(d.name))
    .map((d) => d.name);
  if (templateFiles.length === 0) fail(`No *.template.* files found in templates/.`);

  // Render everything into memory first — nothing touches disk until every page
  // clears gate 10, so a failure never leaves a half-built dist/<slug>/ behind.
  const rendered = {};
  for (const file of templateFiles) {
    const src = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf8');
    const tree = buildTree(tokenize(src), file);
    rendered[file.replace(/\.template\.([A-Za-z0-9]+)$/, '.$1')] = render(tree, view, []);
  }

  // Gate 10 — no {{token}} may survive rendering.
  for (const [outName, html] of Object.entries(rendered)) {
    const leftover = html.match(/\{\{[^\n]{0,40}/);
    if (leftover) {
      fail(
        `Gate 10 failed: an unresolved template token survives in ${outName}, near "${leftover[0]}…". ` +
          `This means a typo in the template or a missing key in clients/${slug}/client.json — check the token's path against clients/_example/client.json.`
      );
    }
  }

  // Gate 11 — rendered inline <script> blocks must still parse.
  //
  // Client copy is interpolated raw into single-quoted JS string literals (the gallery
  // and trust-bar arrays), so an apostrophe in a business or gallery name — "O'Brien
  // Roofing" — emits broken JavaScript and silently kills the gallery filter. Parsing
  // the real output catches that, and any future JS-embedded token, without this gate
  // needing to know which fields are involved. The ld+json block is checked the same
  // way so a stray quote can't quietly invalidate the schema.org markup.
  for (const [outName, html] of Object.entries(rendered)) {
    const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
    let sm;
    while ((sm = scriptRe.exec(html))) {
      const attrs = sm[1] || '';
      const body = sm[2];
      if (/\bsrc=/i.test(attrs) || !body.trim()) continue;
      if (/application\/ld\+json/i.test(attrs)) {
        try {
          JSON.parse(body);
        } catch (e) {
          fail(
            `Gate 11 failed: the ld+json block in ${outName} is not valid JSON after rendering — ${e.message}. ` +
              `A quote or backslash in a client.json value has broken the schema.org markup. Check clients/${slug}/client.json for stray " or \\ characters.`
          );
        }
      } else if (!/type=/i.test(attrs) || /text\/javascript/i.test(attrs)) {
        try {
          new Function(body); // parse-only; never executed
        } catch (e) {
          fail(
            `Gate 11 failed: an inline <script> in ${outName} does not parse after rendering — ${e.message}. ` +
              `This is almost always an apostrophe in a client.json value that lands inside a single-quoted JS string ` +
              `(gallery titles/areas, usps.trustBar). Reword it, or escape it as \\' in clients/${slug}/client.json.`
          );
        }
      }
    }
  }

  const outDir = path.join(DIST_DIR, slug);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const [outName, html] of Object.entries(rendered)) {
    fs.writeFileSync(path.join(outDir, outName), html, 'utf8');
  }
  copyDirInto(STATIC_DIR, outDir);
  copyDirInto(path.join(clientDir, 'assets'), outDir);

  const outNames = Object.keys(rendered);
  return {
    pageCount: outNames.filter((n) => n.endsWith('.html')).length,
    fileCount: outNames.length,
    noindex: view.meta.noindex,
  };
}

function main() {
  const args = process.argv.slice(2);
  const liveFlag = args.includes('--live');
  const slugArg = args.find((a) => a !== '--live');

  if (!fs.existsSync(CLIENTS_DIR)) fail(`No clients/ directory found at ${CLIENTS_DIR}`);

  let slugs;
  if (slugArg) {
    slugs = [slugArg];
  } else {
    slugs = fs
      .readdirSync(CLIENTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
      .map((d) => d.name);
    if (slugs.length === 0) {
      console.log('No clients to build — clients/ only contains reference folders (prefixed with "_").');
      return;
    }
  }

  let anyFailed = false;
  for (const slug of slugs) {
    try {
      const result = buildClient(slug, liveFlag);
      console.log(`✓ ${slug}: ${result.pageCount} pages built → dist/${slug}/ (${result.noindex ? 'noindex' : 'INDEXABLE'})`);
    } catch (err) {
      anyFailed = true;
      if (err instanceof BuildError) {
        console.error(`✗ ${slug}: ${err.message}`);
      } else {
        throw err;
      }
    }
  }
  if (anyFailed) process.exitCode = 1;
}

main();
