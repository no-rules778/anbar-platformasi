# Phase 17 export integration — final independent Codex audit

Date: 2026-09-12 · Scope: M17-95, M17-96, M17-98 and M17-99

## Verdict

The orchestration and page wiring match the legacy export contract after one
delivery correction. M17-95/96/98/99 remain CODE VERIFIED. Phase 17 remains
**NOT ACCEPTED** because 17 server/live/egress rows remain BLOCKED.

## Delivery defect corrected

The success path resolved JSZip only from `globalThis`, but the React app
loads no JSZip CDN script and declared no dependency. The template existed at
repository root but not in `web/public`. Thus the shipped app could not enter
the designed path even though injected tests passed.

Codex added `jszip` as a production dependency, changed the default resolver
to that package, and copied the existing template to
`web/public/azpetrol-template.xlsx`. Source and public asset share SHA-256
`0016C7648ACF78D173B1A3F9B158663C0517245092D6D3FF5A7548D3CF976FAE` and
size 21,427 bytes. The sandbox build contains the same asset.

The fallback remains active for failed fetches, malformed/missing workbook
parts, ZIP errors, or download-path errors.

## Earlier payload corrections retained

Card updates use `p_card.id`, manual movement rows support `doc_num` and
`note`, and correction patches support `doc_num`. Their passthrough tests
remain green.

## Verification

- Export/sheet/page/write focused set: 3 files / 112 tests passed.
- Full suite: 205 files / 4330 tests passed.
- Typecheck and sandbox build clean; 271 modules transformed.
- M17 checker PASS, 10/10; Phase 9 checker PASS, 27/27.
- `git diff --check` exit 0; staged files 0.
- `npm audit` reports only the pre-existing direct `xlsx@0.18.5` advisories;
  JSZip introduced no reported vulnerability. The configured registry offers
  no automatic fix for that existing package.

No Supabase contact, TEST mutation, fixture, real-data export, RPC, delete,
import, production contact, stage, commit, push or deploy occurred. Dirty
working state was preserved.

## Status

93 CODE VERIFIED / 0 LIVE VERIFIED / 0 IN PROGRESS / 0 NOT STARTED / 17
BLOCKED / 110 unique. M17-100 remains BLOCKED: synthetic verification is
neither authorisation nor evidence for real-data egress.
