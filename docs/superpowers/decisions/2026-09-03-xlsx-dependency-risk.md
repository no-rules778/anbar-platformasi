# Decision & risk record — `xlsx@0.18.5`

Date: 2026-09-03. Status: **ACCEPTED RISK, carried forward. Not silently
dismissed.** Raised by the Codex Phase 5 audit (§2 of
[`audits/2026-09-03-phase5-codex-audit.md`](../audits/2026-09-03-phase5-codex-audit.md)).
Registry: `R-F7`.

Nothing was upgraded, removed or replaced. This record exists because the
audit's objection was correct: matching production is a reason to keep the
version, but it is **not** evidence that the version is safe, and the previous
note in `lib/xls.ts` came close to reading as though it were.

## What is actually installed

| | |
|---|---|
| Declared in `web/package.json` | `"xlsx": "^0.18.5"` |
| Installed | `0.18.5` |
| Production (`index.html:5`) | `cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js` |
| Newest version **on the npm registry** | `0.18.5` (`npm view xlsx version`, checked 2026-09-03) |

The React app and the production platform therefore load the same library
version, from the same npm-published artefact.

## The advisories — verified, not taken on trust

`npm audit` reports one vulnerable dependency with two high-severity
advisories. Both were re-checked directly rather than quoted from the audit:

| Advisory | Affected | Installed | Exposed? |
|---|---|---|---|
| [Prototype pollution (GHSA-4r6h-8v6p-xvw6)](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) | `< 0.19.3` | 0.18.5 | **Yes** |
| [ReDoS (GHSA-5pgg-2g8v-p4x9)](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) | `< 0.20.2` | 0.18.5 | **Yes** |

`npm audit` reports `fixAvailable: false`. The audit rightly warned that this
is not proof no vendor-fixed release exists — so it was checked separately.
The finding is that **both statements are true at once**:

- fixed releases (`0.19.3+`, `0.20.2+`) **do** exist; but
- they are published **only from SheetJS's own CDN**, not to npm, whose newest
  version is still `0.18.5`.

So `fixAvailable: false` is accurate *for the npm registry*, and a fix is
genuinely unavailable through the current dependency channel. Obtaining one
means changing where the dependency comes from — a platform-wide supply-chain
decision, not a version bump.

## Why it is exposed, and how much

Both advisories concern **parsing** an attacker-influenced workbook.

- **Export** (`xls()`, the Nomenklatura «Excel» button) is generation-only. It
  builds a sheet from data already in memory and never parses input. Not
  exposed by either advisory.
- **Import** (`ImportItemsDialog`, `.xlsx`/`.xls` via `XLSX.read`) **does**
  parse a file. This is the exposed path.

The mitigating facts, stated plainly rather than as reassurance:

- the file is chosen by an authenticated, already-authorised user, not
  supplied by an anonymous visitor;
- parsing happens in that user's own browser tab, not on a server, so the blast
  radius is the session that opened the file;
- the old platform has exactly the same exposure today, on the same version.

The residual risk is real and is **not** zero: a user can be socially
engineered into opening a hostile workbook, and a hostile workbook is the
precise input both advisories describe. "User-selected" narrows the attacker's
reach; it does not make the parser safe.

## Decision

**Keep `0.18.5`. Do not upgrade, remove or replace it as part of Phase 5.**

Reasoning, in the order the migration principles require:

1. **Parity is the phase's mandate.** The behavioural reference runs this exact
   build. A different Excel engine could change output formatting, type
   coercion or parsing tolerance — the very things Phase 5 must preserve — and
   would invalidate the export comparison that has not yet been run.
2. **The only fixed builds are off-registry.** Adopting them changes the
   project's supply chain, not just a version number.
3. **It is not this module's decision to take.** `xlsx` is loaded by the
   production platform for every screen that exports. Changing it is a
   platform-wide change requiring explicit user approval (principles §4, §8).

This is an **accepted, documented risk**, not an assessment that the dependency
is safe.

## What would change this decision

Any of the following should reopen it:

- an advisory that reaches the **export** path, or one exploitable without the
  user opening a file;
- a fixed release published **to npm**, removing the supply-chain objection;
- the user authorising a move to the SheetJS CDN build or to a different
  library, with a re-run of the Excel output comparison.

## Explicitly NOT done

- No upgrade, no removal, no replacement, no lockfile change.
- No `npm audit fix`, and no suppression or allow-listing of the advisory.
- No change to `index.html`, production, Supabase or deployment.

## Related

- Bundle size: the dependency is why the build warns at ~930 kB (was 476 kB).
  Tracked separately; it is a performance item, not a security one.
- `toNum` and zero-padded codes: a **different** inherited issue, corrected in
  `lib/xls.ts` and pinned by a test — see the audit's §3 and registry `R-F9`.
