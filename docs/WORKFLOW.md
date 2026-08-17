# Trade website template kit

One audited single-page site, rebranded per client from one JSON file. Used as a design
preview in outreach, then as the client's live site.

**If you are about to edit a client's details, read
[`../clients/_example/EDITING-THIS-FILE.md`](../clients/_example/EDITING-THIS-FILE.md) first.**
That is the field-by-field guide, and it is copied into every client folder.

---

## The one rule

> **Never invent a fact about a real business.**

A demo may contain invented content, because every page is labelled a design preview and
blocked from search engines. The moment a build stops being labelled, every claim on it
has to be true and evidenced.

If you cannot verify a value, leave it `null`. It renders as a visible `[BRACKETED]`
placeholder, which is the correct outcome. Never replace a placeholder with something
plausible.

---

## The three stages

| Stage | When | `meta.noindex` | Build |
|---|---|---|---|
| **1. Demo** | Prospecting. Nothing sold | `true` | `node tools/build.mjs <slug>` |
| **2. Post-sale** | Money taken, evidence arriving | `true` | `node tools/build.mjs <slug>` |
| **3. Launch** | All evidence on file | `false` | `node tools/build.mjs <slug> --live` |

Stage 3 is a public, indexable site for a real trading business. Do not go there to see
how it looks.

### Stage 1: a new demo

```bash
cp -r clients/_example clients/<slug>
```

Edit `clients/<slug>/client.json`, drop their photos into
`clients/<slug>/assets/images/`, then:

```bash
node tools/build.mjs <slug>
```

Two things happen outside this repo: a new Cloudflare Pages project pointed at
`dist/<slug>`, and this demo's hostname added to the shared Turnstile widget. See
[`REBRAND-KIT.md`](REBRAND-KIT.md).

### Stage 2: after a sale

Work through the twelve gates in [`ONBOARDING.md`](ONBOARDING.md), which lists the
evidence to collect and how to ask a client for it without giving regulated advice. Fill
in `legal.*`, `privacy.*`, real accreditations, real testimonials. `meta.noindex` stays
`true` throughout.

### Stage 3: launch

The launch checklist is in [`ONBOARDING.md`](ONBOARDING.md).

---

## What protects you

The build **fails and writes nothing** when a claim lacks its evidence. Thirteen gates,
listed in [`REBRAND-KIT.md`](REBRAND-KIT.md). The ones that matter most:

- An accreditation, testimonial or review figure with no recorded source
- A finance section with no FCA reference number
- A demo that is not `noindex`, or a `--live` build that still is
- Any placeholder string (`TODO`, `YOUR_`, `LOREM`) reaching a prospect
- **Demo wording surviving a `--live` build**, so a real client's site can never describe
  itself as a sample business
- A social icon linking to `#`

A failed build leaves no half-written output, so an unfinished site cannot reach anyone.

**Do not work around a gate.** Collect the evidence or remove the claim.

---

## Layout

| Path | Purpose |
| :--- | :--- |
| `clients/<slug>/client.json` | **The only file edited per client** |
| `clients/<slug>/EDITING-THIS-FILE.md` | Field-by-field guide for that file |
| `clients/<slug>/assets/` | That client's images. Every image path on the site is a JSON key |
| `templates/` | The frozen, audited markup. Never edited per client |
| `tools/build.mjs` | The whole build: template engine, derived values, thirteen gates. No dependencies, Node 18+ |
| `dist/<slug>/` | Build output. Gitignored, never hand-edited |
| [`REBRAND-KIT.md`](REBRAND-KIT.md) | Token syntax, derived values, what each gate catches, Turnstile widget strategy |
| [`ONBOARDING.md`](ONBOARDING.md) | **The twelve client gates and the launch checklist** |

If you find yourself hand-editing a template to fit a client, that is a missing key in
`client.json`, not a template change.

---

## Two workflow rules

**Don't commit HTML downloaded back out of Cloudflare.** It bakes `/cdn-cgi/`
email-obfuscation markup and a decoder script into source, and on this build it silently
reverted a `noindex` when a processed copy was re-uploaded as source.

**Deploy URLs live in one place.** `site.baseUrl` is the single source for the canonical,
`og:url`, `og:image`, JSON-LD, `sitemap.xml` and `llms.txt`. Change it once on a redeploy
and every reference follows. A stale value means a blank link-preview card in every shared
message.
