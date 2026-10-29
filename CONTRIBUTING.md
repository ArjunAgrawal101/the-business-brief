# Contributing

Thank you for helping. The Business Brief values accuracy over speed: a smaller change that is right beats a larger one that needs correcting.

## Before you start

- Read [docs/CONTENT_MODEL.md](docs/CONTENT_MODEL.md) and [docs/SOURCE_GOVERNANCE.md](docs/SOURCE_GOVERNANCE.md).
- Run `npm ci`, then `npm run qa` to see a clean baseline.

## Writing content

**Voice.** Plain, precise British English with Oxford spelling: *organization*, *recognize*, *analyse*, *labour*, *programme*. Short sentences. Explain before you name.

**Punctuation.** Never use the en dash or the em dash. Use a comma, a colon, brackets, "to" for ranges ("1 to 2 marks") or a hyphen in compounds. Use the typographic minus (−) for negative numbers in text; the formatting functions do this for figures. The content lint fails on any dash.

**Numbers.** Group thousands with commas (14,080). Money with its symbol before the number (€1,344.80, ₹12.78m). Give units every time.

**Labels.** Every block, exhibit and interaction needs a `provenance` label that is true. Every statement about the IB course needs a verification status and a claim in `data/claims.yaml`. If you cannot source it, do not state it.

**Never:**

- present an original question as an IB or past-paper question;
- invent syllabus content, assessment criteria, mark allocations or past-paper frequencies;
- reproduce text from the Guide, examination papers, markschemes or course books;
- present simulated data as real, or a fictional organization as a real one;
- add a figure to a case that the exhibits cannot produce (the tests recompute them);
- use a pronoun for a real person whose pronouns have not been stated.

## Writing code

- TypeScript in strict mode. Pure functions for anything that calculates, in `src/lib/`, with tests.
- Pages must work without JavaScript. Interactions enhance server-rendered content (see ARCHITECTURE.md).
- Every control must be reachable and usable by keyboard and labelled; every change of result announced; colour never the only signal.
- No new runtime dependencies without a reason. No trackers, analytics or third-party requests.

## Checks

```bash
npm run qa
```

must pass before a change is merged. For visual changes, also run `npm run qa:screens` and look at the four widths.

## Commits

One logical change per commit, with a message that says what changed and why. Update `CHANGELOG.md` for anything a reader would notice.
