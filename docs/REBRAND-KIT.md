# Rebrand kit

Turning a new prospect demo into **one JSON file plus a folder of their photos**.

The audited markup is frozen in `templates/`. Nothing in there is edited per client. If
you find yourself hand-editing a template to fit a prospect, that's a missing key in
`client.json`, not a template change.

---

## Layout

```
templates/
  index.template.html      tokenised pages, the frozen audited markup
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
  _example/client.json     the reference client, copy this to start
  <slug>/client.json       the only file edited per prospect
  <slug>/assets/           that client's images (images/hero.jpg, images/work-1.jpg, …)
tools/build.mjs            the whole build. No dependencies, Node 18+.
dist/<slug>/               output. Gitignored, never hand-edited.
```

`templates/*.template.<ext>` renders to `dist/<slug>/<name>.<ext>`. Add a page by adding
a template, and the build picks it up with no code change.

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
`INDEXABLE`. **If you ever see `INDEXABLE` on a demo, stop and fix it**. A fictional
business competing in local search against real Glasgow roofers is the one mistake in
this repo with a named victim.

Photos are deliberately not shipped with the kit. A build with an empty `assets/` renders
fine, because the image tags carry `onerror` handlers and collapse to labelled placeholders, so
you can preview layout before the client sends anything. Do not substitute stock photos:
see gate 7 in `ONBOARDING.md`.

---

## Token syntax

Five constructs. That is the whole language, and it should stay that way.

| Token | Behaviour |
|---|---|
| `{{a.b.c}}` | dot-path lookup, HTML-escaped |
| `{{{a.b.c}}}` | raw, unescaped, for values that are markup, e.g. `iconSvg` |
| `{{#each items}}…{{/each}}` | repeat, exposing `{{@index}}`, `{{@number}}`, `{{@first}}`, `{{@last}}`, and `{{this}}` for primitive arrays |
| `{{#if path}}…{{/if}}` | render when set. `null`, `false`, `""` and `[]` all count as unset |
| `{{#unless path}}…{{/unless}}` | inverse |

Blocks nest via an explicit stack, so a mismatched close tag fails the build loudly
rather than silently mis-closing. Inside `{{#each}}`, `{{this.foo}}` reads the current
item and unprefixed paths still read the document root.

`{{#unless @last}}, {{/unless}}` is the separator idiom, used in the schema.org
`areaServed` array and the two inline JS arrays.

**In the plain-text templates (`robots`, `llms`) use `{{{triple}}}` throughout.** Double
braces HTML-escape, which is right for `.html` and `.xml` and wrong for `.txt`, where it would
render a business called "Roofing & Slating" as `Roofing &amp; Slating`.

**Optional sections wrap their own container**, so nothing renders as an empty box. An
empty `accreditations` array falls back to the bracketed `.ph-flag` placeholder rather
than disappearing, because a missing trust mark should look unfinished, not finished.

---

## Derived values

Computed at build time, never stored. A stored copy is a copy that can drift, and drift
is what the audit kept finding.

| Value | Derived from |
|---|---|
| `site.canonical` | `site.baseUrl` + `/` |
| `site.ogImage` | `site.baseUrl` + `/og-image.jpg` |
| `business.phoneHref` | `business.phoneDisplay`, non-digits stripped, `tel:` prefixed |
| `business.emergencyPhoneHref` | `business.emergencyPhoneDisplay`, same treatment |
| `business.phoneIntl` | `business.phoneDisplay` in E.164 (`0141…` becomes `+44141…`). Set `business.phoneIntl` explicitly to override for a non-UK number. |
| `business.areasSentence` | `business.areasCovered`, joined as `Glasgow, Paisley and Ayr` |
| `stats.jobsCompletedFormatted` | `stats.jobsCompleted`, formatted as `2,400` |
| `business.hours.weekdayDisplay` | `business.hours.weekdayOpen`/`Close`, as `8am to 6pm`. The footer and the schema.org block now read the same source |
| `business.hours.saturdayDisplay` | `business.hours.saturdayOpen`/`Close`, same treatment |
| `testimonials[].avatarInitial` | first letter of `name` (decorative, `aria-hidden`) |
| `testimonials[].starsHtml` | `testimonials[].rating`, drawn in `brand.colors.star`. No `rating` means no stars, never a default of five |
| `testimonials[].ratingLabel` | `testimonials[].rating` as `4.0`, unless set explicitly. The override exists for word labels like `Sample`; a numeric one that contradicts the stars fails gate 2 |
| `legal.year` | current year when `null`, so the copyright line can never render empty |
| `brand.colors.accentEnc` | `brand.colors.accent` with `#` URL-encoded, for the inline SVG favicon |
| `brand.colors.logoMarkInkEnc` | `brand.colors.logoMarkInk`, same treatment |

`site.baseUrl` is the single source for canonical, `og:url` and `og:image`. That is the
fix for the stale-slug bug: one field to change on a redeploy, and the link preview cards
in outreach stay correct.

---

## What a rebrand actually touches

Nothing in `templates/` carries a business name, phone number, address, service area or
brand colour any more. Everything below comes out of `client.json`, so a new prospect is
one file plus a folder of photos:

| Section | Drives |
|---|---|
| `brand.colors` | Every colour on the page, including the inline SVG favicon and the logo mark |
| `business` | Name, logo wordmark, both phone numbers, email, address, opening hours, service areas |
| `areas.intro` | The "where we work" intro line above the area chips |
| `footer.blurb` | The short description under the footer logo |
| `legal` | The statutory trading disclosure in the footer, and the same details on terms.html and privacy.html. Any field left `null` renders as a `.ph-flag` placeholder instead |
| `privacy` | The form provider, data location, transfer mechanism and retention period on privacy.html |
| `forms` | An empty `endpoint` leaves the form inert, validating and showing its success state locally. Set `endpoint` and the form posts for real |
| `accreditations` | The footer badge row, names only. Empty falls back to a `[CLIENT ACCREDITATIONS]` placeholder |
| `meta.noindex` | Whether the build is a demo. Drives `robots.txt`, the `noindex` tag, the demo ribbon, the "design preview" titles and the `llms.txt` framing. A `--live` build drops all of it automatically |

### Images

Every image on the site is a path in `client.json`, resolved against
`clients/<slug>/assets/`. Drop the client's photos in, point the JSON at them, done. Any
filename and any format works, because the path is used verbatim.

| Key | Lands on |
|---|---|
| `hero.image.src` | The hero photo |
| `beforeAfter.before.src` / `.after.src` | The two halves of the before/after slider |
| `team.image.src` | The photo beside the promise list |
| `gallery[].src` | One tile in the project gallery, and its lightbox view |

Each has an `alt` alongside it, except the gallery, which builds its alt text from the
tile's own `title` and `area`.

`favicon.png`, `apple-touch-icon.png` and `og-image.jpg` come from `templates/static/`
as brand defaults. A client's own copy in `clients/<slug>/assets/` overrides them, because
client assets are copied second.

Missing files are safe: every `<img>` carries an `onerror` handler and collapses to a
labelled placeholder showing the path it wanted, so you can build and preview the layout
before the client has sent a single photo, and it is obvious what is still outstanding.

### Legal and privacy pages

`terms.html` and `privacy.html` are driven by the same `client.json` as the homepage.
Anything in `legal` or `privacy` that is still `null` renders as a bracketed `.ph-flag`
placeholder rather than silently disappearing, so an unfinished notice is visible rather
than plausible. `legal.registeredName`, the phone and the email are shared with the
homepage footer, so the three pages cannot disagree about who the business is.

### Spam protection

The form uses **Cloudflare Turnstile**. `forms.turnstileSiteKey` drives it.

Its script is **loaded lazily**, when the form nears the viewport or someone focuses a
field, whichever comes first. Turnstile pulls roughly a megabyte of third-party
JavaScript; in `<head>` that sat on the initial critical path for a form near the bottom
of the page and cost about a second of First Contentful Paint.

### Turnstile widgets and the 10-slot limit

The account has a limited number of Turnstile widgets, so **do not create one per
prospect.** Creating a widget is a post-sale step.

| Phase | Widget | Cost |
|---|---|---|
| Outreach demos | **One shared "Demos" widget.** Add each new prospect's `<slug>.pages.dev` to its hostname list and reuse the same key | 1 slot, however many prospects |
| Sold | That client's **own widget**, on their real domain, and their own key in their `client.json` | 1 slot each |

`clients/_example/client.json` carries the shared demo key, so a new prospect copied from
it is already wired up. The only Cloudflare step per demo is adding their hostname to the
shared widget: Turnstile validates the hostname, so a demo on a hostname that is not on
the list shows an error instead of a widget. That is the one thing that will bite you,
and it is the first thing to check if a demo's form looks broken.

On a sale, create the client's widget against their real domain and paste its site key
into their `client.json`. Nothing else changes.

Site keys are public and belong in the repo. The **secret** key never does: it lives in
the form endpoint's environment variables, and is only needed once a real endpoint exists.

`challenges.cloudflare.com` is already allowed in `script-src` and `frame-src` in
`templates/static/_headers`, so enabling this needs no header change.

---

## The gates

The build **fails and writes nothing** when any of these trip. A failed build leaves no
half-written `dist/<slug>/` behind. Every page is rendered in memory and checked before
anything touches disk.

| # | Trips when | Why |
|---|---|---|
| 1 | an `accreditations` entry has no `source` | Displaying an unearned trade accreditation is live legal exposure under the **DMCC Act 2024**. The `source` is where you verified it: membership number, expiry, evidence on file. |
| 2 | a testimonial has no `source`, or its `rating` is not a whole 1 to 5 | Written permission, or platform plus capture date. A rating of `0`, `6`, `4.5` or `"five"` would silently render no stars, so it fails instead. |
| 3 | `reviews` is set without a `source` | A rating needs a linkable public profile and the date the figure was captured. |
| 4 | `finance` is set without an `fcaDisclosure` | Introducing customers to a lender is a regulated activity. No FRN, no finance block: ship the non-regulated "Clear Fixed Quotes" card instead. |
| 5 | `meta.noindex` is not `true` and `--live` was not passed | Demos must never be indexable. This is the fix for the homepage that silently lost its `noindex`. |
| 6 | `--live` was passed but `meta.noindex` is still `true` | Going live has to be a deliberate two-part statement, not a stray flag. |
| 7 | any string matches `YOUR_`, `TODO`, `XXXX`, `FIXME`, `REPLACE_ME`, `LOREM` | Unfilled placeholder text must never reach a prospect. Fields the client doesn't have are `null` or `[]`, never placeholder prose. |
| 8 | on a `--live` build: `forms.endpoint` is set with no `forms.turnstileSiteKey`, or the key is one of Cloudflare's `1x`/`2x`/`3x` test keys | A real client's public endpoint needs a real widget, verified server-side. Test keys pass everything, which is right for a demo and useless on a live site. |
| 9 | `site.baseUrl` is missing, relative, or has a trailing slash | Everything canonical is derived from it, so a bad value would poison canonical and `og:image` together. |
| 10 | any `{{token}}` survives rendering | Catches template typos and missing `client.json` keys before they reach a prospect as literal braces. |
| 11 | a rendered inline `<script>` or `ld+json` block no longer parses | Client copy is interpolated raw into single-quoted JS arrays, so an apostrophe in a name like "O'Brien Roofing" emits broken JavaScript and silently kills the gallery filter. Reword it, or escape it as `\'` in `client.json`. |
| 12 | **on `--live`**, any rendered page still contains "design preview", "sample business", "not a real company", "sample content" or "sample review" | Every demo string is wrapped in a `meta.noindex` conditional, and this is the check that the promise was kept. A real client's site whose `<title>` reads "Design preview (sample business)", or whose `llms.txt` tells AI crawlers the business is not real, is the worst thing this repo could ship and no other gate would see it. |
| 13 | a `social` entry has no `label`, or a `url` that is not an absolute `https://` link | An icon linking to `#` gives no destination, fails WCAG 2.4.4 and reads as a broken site. The label is the icon's accessible name. |

Gates 1 to 9 and 13 run against the parsed JSON before rendering. Gates 10 to 12 run against the
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
