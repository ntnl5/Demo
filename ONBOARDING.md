# Client onboarding gates

Twelve things to collect before a client's site goes live. Each one is a **hard
gate**: if the evidence isn't on file, the section doesn't get published.

## How to use this with a client

Keep every conversation **operational**, not legal. You are a web designer, not
a compliance consultant, and the gates work precisely because they collect
evidence and leave responsibility with the client.

| Say this | Not this |
| :--- | :--- |
| "I need your FCA reference number before I can publish a finance section." | "The law requires you to be FCA authorised." |
| "I can't put a badge on without the membership number and expiry — it's how I keep every site I build clean." | "Displaying that is an unfair commercial practice." |
| "Send me your own job photos and I'll build the gallery round them." | "Using stock photos there would be misleading." |

Same outcome, and the second column is you giving regulated advice to a roofer
for £250. Stay in the first column.

Where a client pushes back, "my process doesn't allow it" is a complete answer.
If they want to know why in more detail, that's the point to say their
accountant or solicitor should confirm it — not you.

---

## The twelve gates

| # | Gate | Collect | Blocks |
| :--- | :--- | :--- | :--- |
| 1 | **Company disclosures** | Registered name, company number, place of registration, registered office, VAT number if registered. Sole traders/partnerships: trading name, proprietor's name, address for service. | Footer legal line |
| 2 | **Accreditations** | One row per badge: scheme name, membership number, expiry date, documentary evidence. | Every trust mark, badge and "accredited" claim |
| 3 | **Insurance** | Insurer, policy number, cover level, expiry date. | "Fully insured" / "public liability" claims |
| 4 | **Reviews** | Live, linkable public profile URL + the date you captured the figure. Written permission for any named testimonial. | Rating, review count, testimonials, review schema |
| 5 | **Finance** | FCA Firm Reference Number. | The entire finance section — no FRN, no section |
| 6 | **Drone work** | Operator ID, competency certificate, and their commercial drone insurance. | Any drone survey claim |
| 7 | **Images** | The client's own photos. Licence confirmed. Permission where a property is identifiable. | Gallery, before/after, hero, team |
| 8 | **Trading history** | Incorporation date or trading records. | Any "since 20XX" / "X years" claim |
| 9 | **Job figures** | The source for the number, and keep it on file. | Any "X roofs completed" figure |
| 10 | **Cancellation rights** | Their cancellation notice and early-start waiver wording, as used in their actual paperwork. | Cancellation section in Terms |
| 11 | **Data protection** | Form provider named, processor agreement in place, storage location, transfer mechanism if outside the UK, retention period, ICO registration. | Privacy notice, form consent line |
| 12 | **Guarantee wording** | Confirmation the guarantee is offered *in addition to* statutory rights. | Guarantee copy |

---

## Notes on individual gates

### Gate 2 — accreditations
This is the one to be strictest about. Scheme logos are registered trade marks,
and a "this is a demo" label doesn't help you there the way it helps with
everything else — which is why the demo carries no scheme names or logos at all.

Re-verify annually. Memberships lapse, and a lapsed badge sitting on a site you
maintain becomes your problem, not just the client's.

### Gate 5 — finance
Treat the FRN as non-negotiable. Introducing customers to a lender is a
regulated activity and promoting it is regulated separately, so this is the one
gate where the downside of being wrong lands hardest on you as publisher. No
FRN, no finance block — the demo ships a "Clear Fixed Quotes" card instead,
which answers the same "can I afford this?" objection without going near it.

### Gate 6 — drone work
Collect the Operator ID, competency certificate and insurance, then stop.
The detailed CAA requirements change, and some of the specifics circulating are
hard to verify — **don't restate them to a client as fact.** Their compliance is
their responsibility; your job is to have the evidence on file before the claim
goes on the site.

Once you have it, use it as copy: *"CAA-registered drone operator, Operator ID
[xxx], fully insured"* is a concrete trust signal their competitors won't have.

### Gate 10 — cancellation rights
Most competing web designers will never raise this. Bringing it up early reads
as unusually professional and it's genuinely useful to the client — roofing work
agreed at the customer's door is almost always an off-premises contract, and
getting the cancellation paperwork wrong is expensive for them.

Ask for their existing wording. If they don't have any, that's a conversation
for their solicitor, not something you draft.

---

## Two structural rules

**1. Make the template fail loudly.**
Every unverified value is wrapped in `.ph-flag`, which renders as `[BRACKETED]`
monospace text in a dashed outline — clearly unfinished, but quiet enough not to
pull a prospect's attention off the design.

The risk in a template business isn't that you'd invent a claim — it's that a
*plausible-looking* placeholder survives into a live site because nobody noticed
it was a placeholder. So the rule is about the **class**, not the colour: keep
`.ph-flag` on anything unverified, and never replace a placeholder with a
realistic-looking default. The grep below is what actually catches them.

Before any launch:

```sh
grep -rn "ph-flag" .            # every unverified value
grep -rn "\[.*\]" *.html        # bracketed placeholders
grep -rn "noindex"              # confirm the switch is deliberate
grep -rn "demo-ribbon"          # confirm the demo marker is gone
grep -rn "demo-e00\|demo-b50"   # stale project slugs from an account switch
```

**2. Add a signed verification sheet at the deposit stage.**
The client confirms in writing that accreditations, insurance, review figures and
trading dates are accurate. Five minutes, puts responsibility where it belongs,
and trades clients are entirely used to signing paperwork.

---

## Launch checklist

Repo and content:

- [ ] All twelve gates cleared, evidence on file
- [ ] `grep` sweep above returns nothing unexpected
- [ ] Demo ribbon removed from `index.html`, `privacy.html`, `terms.html`, `404.html`
- [ ] `robots.txt` switched to `Allow: /` with the client's sitemap URL
- [ ] `X-Robots-Tag` removed from `_headers`
- [ ] `noindex, nofollow` → `index, follow` on every page
- [ ] Canonical, `og:url`, `og:image` and JSON-LD all on the client's real domain
- [ ] `og-image.jpg` regenerated without the "design preview" tag
- [ ] Real Turnstile site key wired in, token verified server-side
- [ ] Form endpoint wired in, its origin added to `form-action` in `_headers`
- [ ] A real submission tested end to end — confirm it actually arrives
- [ ] Success message wording restored to a real confirmation
- [ ] Client's own images in `images/`, `og-image.jpg` regenerated
- [ ] JSON-LD address and phone are the client's real details

Account and platform settings — these are **per-zone, not per-repo**, so they
silently affect every client site on the account:

- [ ] Cloudflare → Scrape Shield → **Email Address Obfuscation off**
- [ ] Never commit HTML downloaded back out of Cloudflare — it bakes in
      `/cdn-cgi/` transforms and has already reverted a `noindex` on this build

Verify:

- [ ] Lighthouse, Accessibility + SEO, mobile and desktop
- [ ] axe DevTools for contrast and ARIA
- [ ] Keyboard only: tab the whole page, confirm focus is always visible and the
      before/after slider, filters and swatches all operate
- [ ] JS disabled: counters show real numbers, reviews are present
- [ ] securityheaders.com
- [ ] Share the URL into WhatsApp and confirm the preview card renders
