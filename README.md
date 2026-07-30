# Ironside Roofing & Slating — design preview

A single-page roofing website build, used as a design preview in client outreach.

**"Ironside Roofing & Slating" is not a real company.** It is sample content
demonstrating layout and build quality. Every page carries a visible demo ribbon,
is `noindex, nofollow`, and is disallowed in `robots.txt`.

## Files

| File | Purpose |
| :--- | :--- |
| `index.html` | The whole site — markup, CSS and JS in one file |
| `privacy.html`, `terms.html` | Template legal pages, not yet valid notices |
| `404.html` | Not-found page |
| `robots.txt` | Disallows all crawling during the demo phase |
| `_headers` | Cloudflare Pages security headers + `X-Robots-Tag` |
| `sitemap.xml`, `llms.txt` | Site metadata |
| `og-image.jpg` | Social share card (self-labelled as a preview) |
| `ONBOARDING.md` | **The twelve client gates and the launch checklist** |

## Before reusing this for a real client

Read `ONBOARDING.md`. It lists the twelve pieces of evidence to collect before
publishing, and a launch checklist covering the repo, the Cloudflare account
settings, and verification.

Short version: values that need verifying are wrapped in `.ph-flag` and render as
bright red uppercase tags. **Never replace one with a realistic-looking default** —
replace it with confirmed client information, or remove the claim.

## Two workflow rules

**Don't commit HTML downloaded back out of Cloudflare.** It bakes `/cdn-cgi/`
email-obfuscation markup and a decoder script into source, and on this build it
silently reverted a `noindex` when a processed copy was re-uploaded as source.

**Deploy URLs live in one place.** The Pages project slug appears in the
canonical, `og:url`, `og:image`, JSON-LD, `sitemap.xml` and `llms.txt`. When the
project is renamed or moved, grep the whole repo for the old slug — a stale slug
means a blank link-preview card in every shared message.
