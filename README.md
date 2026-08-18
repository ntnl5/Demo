# Trade site generator

A static site generator for small trade businesses. One audited page template, one JSON
file per client, and a build that refuses to publish a claim the business cannot evidence.

Built to sell websites to roofers, plumbers and similar trades: a prospect gets a
personalised preview, and the same file becomes their live site once they buy.

**[Live demo](https://demo-e00.pages.dev/)**: a fictional Glasgow roofer, marked as a
preview and blocked from search engines.

---

## What it does

```bash
cp -r clients/_example clients/acme-roofing   # copy the reference client
vi clients/acme-roofing/client.json           # their details, colours, copy
node tools/build.mjs acme-roofing             # -> dist/acme-roofing/
```

That produces a complete site: home page, privacy policy, terms, 404, `robots.txt`,
`sitemap.xml` and an `llms.txt` disclosure. Zero dependencies, no install step, Node 18+.

Nothing in `templates/` contains a business name, phone number, address or brand colour.
Rebranding is one JSON file plus a folder of photos.

## The interesting part

UK consumer protection law makes an unevidenced claim on a trade website a real liability
for whoever publishes it, and the practical risk in a template business is not inventing a
claim deliberately. It is a plausible-looking placeholder surviving into a live site
because nobody noticed.

So the build is the enforcement. Fourteen gates run before anything is written, and a
failed build produces no output at all:

| | |
|---|---|
| **Unevidenced claims** | An accreditation, testimonial or review score with no recorded source fails the build. A finance section without an FCA reference number fails the build. |
| **Accidental indexing** | A demo that is not `noindex` fails. Going live takes both a config change and an explicit `--live` flag. |
| **Demo language leaking** | Preview wording is conditional on build mode, and gate 12 scans the rendered output to prove none survived. A real client's site cannot describe itself as a sample business. |
| **Silent breakage** | Unresolved template tokens, inline JavaScript broken by an apostrophe in a client's name, and social links pointing nowhere all fail the build. |

```
node tools/test.mjs     # 21 tests, one per gate behaviour
```

## Design notes

**Single file, no framework.** The whole site is one HTML file with inline CSS and JS.
No build-time bundler, no runtime dependencies, nothing to keep patched. It deploys as
static files to Cloudflare Pages.

**Derived, never stored.** Anything that could drift is computed at build time: the
`tel:` href from the display number, E.164 for schema.org, opening hours in both 24-hour
and readable forms, star counts from a numeric rating. Two copies of a fact eventually
disagree, and every drift bug this project has had came from a stored duplicate.

**Accessibility is checked, not assumed.** Contrast ratios were measured against computed
backgrounds rather than eyeballed; the before/after slider is a real keyboard-operable
`slider` role, not drag-only; the gallery filter announces its result count to screen
readers. Content does not depend on JavaScript to become visible.

**Performance.** Above-fold content paints without waiting on JavaScript. Scroll handlers
are coalesced to one animation frame and split into read and write phases, so measuring
never forces a synchronous layout. The whole page is 96KB, 22KB gzipped.

## Layout

```
templates/          the page templates. Never edited per client
clients/<slug>/     client.json + their photos. The only thing edited per client
tools/build.mjs     template engine, derived values, fourteen gates
tools/test.mjs      gate tests
docs/               workflow, editing guide, client onboarding
```

## Documentation

- **[docs/WORKFLOW.md](docs/WORKFLOW.md)** covers the three stages: demo, post-sale, launch
- **[clients/_example/EDITING-THIS-FILE.md](clients/_example/EDITING-THIS-FILE.md)** lists
  every field in `client.json` and which stage it belongs to
- **[docs/REBRAND-KIT.md](docs/REBRAND-KIT.md)** covers template syntax, derived values
  and what each gate catches
- **[docs/ONBOARDING.md](docs/ONBOARDING.md)** lists the evidence to collect from a client
  before publishing a claim, and how to ask for it
