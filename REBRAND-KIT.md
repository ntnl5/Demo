# Rebrand kit

Turning a new prospect demo into **one JSON file plus a folder of their photos**.

The audited markup is frozen in `templates/`. Nothing in there is edited per client —
if you find yourself hand-editing a template to fit a prospect, that's a missing key in
`client.json`, not a template change.

---

## Layout

```
templates/
  index.template.html      tokenised pages — the frozen, audited markup
  privacy.template.html
  terms.template.html
  404.template.html
  robots.template.txt      generated from meta.noindex, never static
  sitemap.template.xml     <loc> derived from site.baseUrl
  llms.template.txt        AI-crawler disclosure that this is a sample business
  static/                  copied verbatim into every build
    _headers
    favicon.png            brand defaults; a client's own assets/ overrides these
    apple-touch-icon.png
    og-image.jpg
clients/
  _example/client.json     the reference client — copy this to start
  <slug>/client.json       the only file edited per prospect
  <slug>/assets/           that client's images (images/hero.jpg, images/work-1.jpg, …)
tools/build.mjs            the whole build. No dependencies, Node 18+.
dist/<slug>/               output. Gitignored, never hand-edited.
```

`templates/*.template.<ext>` renders to `dist/<slug>/<name>.<ext>`. Add a page by adding
a template — the build picks it up with no code change.

Copy order into `dist/<slug>/` is **static → client assets**, so anything a client
supplies in their own `assets/` wins over the shared default.

---

## Per-client workflow

```bash
cp -r clients/_example clients/kelvinside-roofing
# edit clients/kelvinside-roofing/client.json
# drop their photos into clients/kelvinside-roofing/assets/images/
node tools/build.mjs kelvinside-roofing
```

```
node tools/build.mjs <slug>          build one client
node tools/build.mjs                 build every client (skips _-prefixed folders)
node tools/build.mjs <slug> --live   allow indexing (requires meta.noindex: false)
```

Output is one line per client with a page count and, in brackets, `noindex` or
`INDEXABLE`. **If you ever see `INDEXABLE` on a demo, stop and fix it** — a fictional
business competing in local search against real Glasgow roofers is the one mistake in
this repo with a named victim.

Photos are deliberately not shipped with the kit. A build with an empty `assets/` renders
fine — the image tags carry `onerror` handlers and collapse to labelled placeholders — so
you can preview layout before the client sends anything. Do not substitute stock photos:
see gate 7 in `ONBOARDING.md`.

---

## Token syntax

Five constructs. That is the whole language, and it should stay that way.

| Token | Behaviour |
|---|---|
| `{{a.b.c}}` | dot-path lookup, HTML-escaped |
| `{{{a.b.c}}}` | raw, unescaped — for values that are markup, e.g. `iconSvg` |
| `{{#each items}}…{{/each}}` | repeat, exposing `{{@index}}`, `{{@number}}`, `{{@first}}`, `{{@last}}`, and `{{this}}` for primitive arrays |
| `{{#if path}}…{{/if}}` | render when set — `null`, `false`, `""` and `[]` all count as unset |
| `{{#unless path}}…{{/unless}}` | inverse |

Blocks nest via an explicit stack, so a mismatched close tag fails the build loudly
rather than silently mis-closing. Inside `{{#each}}`, `{{this.foo}}` reads the current
item and unprefixed paths still read the document root.

`{{#unless @last}}, {{/unless}}` is the separator idiom — used in the schema.org
`areaServed` array and the two inline JS arrays.

**In the plain-text templates (`robots`, `llms`) use `{{{triple}}}` throughout.** Double
braces HTML-escape, which is right for `.html` and `.xml` and wrong for `.txt` — it would
render a business called "Roofing & Slating" as `Roofing &amp; Slating`.

**Optional sections wrap their own container.** An empty `accreditations` array removes
the whole badge row, not just its contents, so nothing renders as an empty box.

---

## Derived values

Computed at build time, never stored — a stored copy is a copy that can drift, and drift
is what the audit kept finding.

| Value | Derived from |
|---|---|
| `site.canonical` | `site.baseUrl` + `/` |
| `site.ogImage` | `site.baseUrl` + `/og-image.jpg` |
| `business.phoneHref` | `business.phoneDisplay`, non-digits stripped, `tel:` prefixed |
| `business.phoneIntl` | `business.phoneDisplay` in E.164 (`0141…` → `+44141…`). Set `business.phoneIntl` explicitly to override for a non-UK number. |
| `business.areasSentence` | `business.areasCovered` → `Glasgow, Paisley and Ayr` |
| `stats.jobsCompletedFormatted` | `stats.jobsCompleted` → `2,400` |
| `testimonials[].avatarInitial` | first letter of `name` (decorative, `aria-hidden`) |
| `legal.year` | current year when `null`, so the copyright line can never render empty |
| `buildDate` | ISO timestamp |

`site.baseUrl` is the single source for canonical, `og:url` and `og:image`. That is the
fix for the stale-slug bug: one field to change on a redeploy, and the link preview cards
in outreach stay correct.

---

## The gates

The build **fails and writes nothing** when any of these trip. A failed build leaves no
half-written `dist/<slug>/` behind — every page is rendered in memory and checked before
anything touches disk.

| # | Trips when | Why |
|---|---|---|
| 1 | an `accreditations` entry has no `source` | Displaying an unearned trade accreditation is live legal exposure under the **DMCC Act 2024**. The `source` is where you verified it: membership number, expiry, evidence on file. |
| 2 | a testimonial has no `source` | Written permission, or platform plus capture date. |
| 3 | `reviews` is set without a `source` | A rating needs a linkable public profile and the date the figure was captured. |
| 4 | `finance` is set without an `fcaDisclosure` | Introducing customers to a lender is a regulated activity. No FRN, no finance block — ship the non-regulated "Clear Fixed Quotes" card instead. |
| 5 | `meta.noindex` is not `true` and `--live` was not passed | Demos must never be indexable. This is the fix for the homepage that silently lost its `noindex`. |
| 6 | `--live` was passed but `meta.noindex` is still `true` | Going live has to be a deliberate two-part statement, not a stray flag. |
| 7 | any string matches `YOUR_`, `TODO`, `XXXX`, `FIXME`, `REPLACE_ME`, `LOREM` | Unfilled placeholder text must never reach a prospect. Fields the client doesn't have are `null` or `[]`, never placeholder prose. |
| 8 | `forms.endpoint` is set but `forms.turnstileSiteKey` is empty | A live form endpoint with no spam protection is not safe to publish. |
| 9 | `site.baseUrl` is missing, relative, or has a trailing slash | Everything canonical is derived from it, so a bad value would poison canonical and `og:image` together. |
| 10 | any `{{token}}` survives rendering | Catches template typos and missing `client.json` keys before they reach a prospect as literal braces. |
| 11 | a rendered inline `<script>` or `ld+json` block no longer parses | Client copy is interpolated raw into single-quoted JS arrays, so an apostrophe — "O'Brien Roofing" — emits broken JavaScript and silently kills the gallery filter. Reword it, or escape it as `\'` in `client.json`. |

Gates 1–9 run against the parsed JSON before rendering. Gates 10 and 11 run against the
real rendered output, so they catch anything the schema checks cannot anticipate.

### What the gates deliberately do not cover

Free-text copy cannot be validated by a build. Two audit findings survive only as comments
in `templates/index.template.html`, above the services loop:

- **"code-compliant" is American phrasing** and the wrong term here. Work in Scotland is
  governed by the Building (Scotland) Regulations and the Technical Handbooks, with a
  building warrant for significant work.
- **A stated lifespan must come from the manufacturer's own published figure** for the
  specified product, and be cited.

Read `ONBOARDING.md` before writing any client's service copy.
