# How to edit `client.json`

**Read this before changing anything.** It applies to humans and to AI agents equally.

This file sits next to `client.json` and is copied with it, so every client folder carries
its own instructions. It is never published: the build only copies `assets/` into `dist/`.

---

## The one rule

> **Never invent a fact about a real business.**

Everything else here follows from that. A demo may contain invented content because every
page is labelled a design preview and blocked from search engines. The moment a build
stops being labelled, every claim on it has to be true and evidenced.

If you are an AI agent and you cannot verify a value, **leave it `null` and say so.** Do
not fill it with something plausible. A `null` renders as a visible `[BRACKETED]`
placeholder, which is the correct outcome. A plausible invention is the failure mode this
whole repo is built to prevent.

---

## The three stages

| Stage | When | `meta.noindex` | Build command |
|---|---|---|---|
| **1. Demo** | Prospecting. Nothing sold | `true` | `node tools/build.mjs <slug>` |
| **2. Post-sale** | Money taken, evidence arriving | `true` | `node tools/build.mjs <slug>` |
| **3. Launch** | All evidence on file | `false` | `node tools/build.mjs <slug> --live` |

You stay in stage 2 for as long as it takes. Do not go to stage 3 to "see how it looks":
stage 3 is a public, indexable site for a real trading business.

---

## Stage 1: Demo edits

Goal: a convincing preview of what this prospect's site could be. Invented content is
fine, because the ribbon, the titles, `robots.txt` and `llms.txt` all say so.

### Change these

| Key | Notes |
|---|---|
| `site.baseUrl` | The Pages URL for this demo. No trailing slash. Drives canonical, `og:image`, `sitemap.xml` |
| `meta.description`, `meta.ogDescription`, `meta.ogImageAlt` | **Keep the "design preview / sample business" framing.** This is what people see in a shared link |
| `brand.colors.*` | Match their existing branding if they have any. See the colour notes below |
| `business.name`, `logoLine1`, `logoLine2` | `logoLine1` is the bold first word, `logoLine2` the rest |
| `business.address` | The town or city, used in headings like "Proudly covering X" |
| `business.areasCovered[]` | Renders as the area chips and the schema.org `areaServed` |
| `business.foundedYear`, `business.hours.*` | Plausible for the demo, verified before launch |
| `areas.intro`, `footer.blurb` | One line each |
| `hero.*`, `services[]`, `usps.*` | The main sales copy. Rewrite for their trade |
| `gallery[]`, `beforeAfter.*`, `team.image` | Titles and `alt` text. See the images section |
| `stats.yearsRoofing`, `stats.jobsCompleted` | Plausible for the demo. **Must be evidenced before launch** |
| `testimonials[]` | Keep `name: "Sample review"` and the sample `source` wording. Gate 12 blocks these from ever reaching a live build |

### Must stay as they are

| Key | Why |
|---|---|
| `meta.noindex: true` | A fictional business competing in local search against real traders is the one mistake here with a named victim |
| `business.phoneDisplay`, `business.emergencyPhoneDisplay` | **Ofcom drama-reserved ranges only.** See below |
| `business.email` | Must stay on `example.com`, which is reserved for documentation |
| `forms.turnstileSiteKey` | The shared demo widget key. Add this demo's hostname to that widget in Cloudflare, or the form shows an error |

### Must stay `null` or `[]` until stage 2

`accreditations`, `reviews`, `finance`, `legal.*`, `privacy.*`, `social`,
`business.streetAddress`, `forms.endpoint`.

These are the claims that carry legal weight. Gates 1, 2, 3, 4, 8 and 13 refuse to build
if any of them is present without its evidence, so trying to fill them early fails loudly
rather than quietly.

### Phone numbers: use the drama ranges

Ofcom reserves number ranges specifically so drama and demonstrations never dial a real
person. A demo must use them. The ones this kit has used:

- Mobile: `07700 900000` to `07700 900999`
- Glasgow: `0141 496 0000` to `0141 496 0999`
- London: `020 7946 0000` to `020 7946 0999`

Other area codes follow the same `<area code> 496 0xxx` pattern, but **check Ofcom's
published list before using one that is not above.** Do not guess: a wrong guess puts a
stranger's phone number on a website.

### Colours

`accent` is the brand colour and most of the page follows it. Two need care:

- `accentInk` must be a genuinely **dark** version of `accent`. It is used for section
  labels on the cream background, where the bright accent measures about 2.3:1 and fails
  accessibility contrast. A proper dark version reaches about 6.7:1.
- `logoMarkInk` is the dark ink drawn on top of the accent in the logo and favicon.

---

## Stage 2: Post-sale edits

Only start these once the sale is closed. Each one needs evidence on file first. The
twelve gates in `docs/ONBOARDING.md` tell you what to collect and how to ask for it.

| Key | Evidence required | Gate |
|---|---|---|
| `legal.registeredName`, `jurisdiction`, `companyNumber`, `registeredOffice`, `vatNumber` | Companies House record, or the sole trader's own details | Gate 1 |
| `legal.postalAddress` | Their address for cancellation notices | Gate 10 |
| `legal.lastUpdated` | The date you finalised the legal pages |  |
| `business.streetAddress`, real `email`, real `phoneDisplay` | Confirmed by the client |  |
| `accreditations[]` | Scheme name, membership number, expiry, documentary evidence. Each entry needs a `source` recording where you verified it. **Names only, never scheme logos**, which are registered trade marks | Gate 1 |
| `testimonials[]` | Written permission, or platform plus capture date, in `source`. `rating` must be the whole number of stars the customer actually left | Gate 2 |
| `reviews` | A linkable public profile URL and the date the figure was captured | Gate 3 |
| `finance` | Their FCA Firm Reference Number, in `fcaDisclosure`. No FRN, no finance section | Gate 4 |
| `stats.*`, `business.foundedYear` | The source for each figure, kept on file | Gates 8, 9 |
| `privacy.formProvider`, `dataLocation`, `transferMechanism`, `retentionPeriod` | Their form provider, processor agreement, storage location, retention period | Gate 11 |
| `social[]` | Their real profile URLs. Each entry needs `label`, an `https://` `url` and an `iconSvg` | Gate 13 |
| `forms.endpoint` | A real endpoint that verifies the Turnstile token **server-side** | Gate 8 |
| `forms.turnstileSiteKey` | **This client's own widget**, on their real domain. Do not leave them on the shared demo widget | Gate 8 |

Replace the sample testimonials entirely. Do not edit them into real ones by hand: delete
the array and rebuild it from the reviews you have permission to use.

`meta.noindex` stays `true` through all of this. Build normally and check the result.

---

## Stage 3: Launch

Work through the launch checklist in `docs/ONBOARDING.md`. In this file:

1. `site.baseUrl` becomes their real domain, no trailing slash
2. `meta.description` / `ogDescription` / `ogImageAlt` become real marketing copy with no
   "design preview" or "sample business" wording
3. `meta.noindex` becomes `false`

Then:

```bash
node tools/build.mjs <slug> --live
```

The demo ribbon, the "design preview" page titles, the `llms.txt` framing and the sample
wording all disappear automatically. **Gate 12 fails the build if any of it survives**, so
this is checked rather than remembered.

If gate 12 fires, it will quote the offending text and name the file. Usually it means a
sample testimonial or a piece of `meta.*` copy was left behind.

---

## Images

Every image is a path resolved against `clients/<slug>/assets/`. Any filename, any format.

| Key | Where it lands |
|---|---|
| `hero.image.src` | Hero photo |
| `beforeAfter.before.src` / `.after.src` | The two halves of the slider |
| `team.image.src` | Photo beside the promise list |
| `gallery[].src` | One gallery tile and its lightbox view |

Missing files are safe: each `<img>` collapses to a labelled placeholder showing the path
it wanted, so you can build and preview before the client has sent anything.

**Only ever use the client's own photos.** Not stock, not a competitor's, not something
found in an image search. This is gate 7, and using another roofer's job photos
misattributes the work and infringes copyright.

Write real `alt` text describing what is in the photo. Do not write "roofing image".

---

## Things that are computed for you

Do not add these to `client.json`. The build derives them, and a stored copy would drift:

`phoneHref`, `emergencyPhoneHref`, `phoneIntl`, `areasSentence`, `jobsCompletedFormatted`,
`hours.weekdayDisplay`, `hours.saturdayDisplay`, `avatarInitial`, `starsHtml`,
`legal.year`, `site.canonical`, `site.ogImage`, and the URL-encoded colour variants.

`testimonials[].ratingLabel` also derives from `rating`. Only set it explicitly for a word
label like `Sample`; a number that disagrees with the stars fails gate 2.

---

## If the build fails

The error names the gate, the field and what to do. It is not a suggestion: every gate
exists because the alternative is publishing something untrue about a real business.

**Do not work around a gate.** If a gate is blocking you, the answer is to collect the
evidence or remove the claim, never to soften the check. A failed build writes nothing at
all, so a half-finished site can never reach a client.
