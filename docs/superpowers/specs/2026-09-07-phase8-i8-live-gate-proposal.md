# Phase 8 milestone I-8 — live gate: proposal

**Status: PROPOSAL. Nothing here has been executed.** No authenticated
application read, no database read, no live write, no browser download and no
deployment was performed while writing it.

**Corrected 2026-09-07** after review. The corrections are listed in §0; they
change the export contract this document asserts, withdraw a categorical claim
about the running environment, and remove two invented reversal guarantees.
Phase 8 remains **NOT ACCEPTED**.

This document does **not** promote Phase 8. Module I stays one acceptance
boundary; nothing in it is `LIVE VERIFIED` and nothing is `ACCEPTED`.

Related: [`2026-09-05-react-migration-phase8-movements-proposal.md`](2026-09-05-react-migration-phase8-movements-proposal.md)
(§6 milestone table, `D5`), [`2026-09-05-phase8-registry-rows.md`](2026-09-05-phase8-registry-rows.md),
[`2026-09-07-phase8-i7-export-proposal.md`](2026-09-07-phase8-i7-export-proposal.md).
The open checks below are **reused** from those documents, not restated in full.

---

## 0. What was corrected

| # | Earlier claim | Corrected to | Evidence |
|---|---|---|---|
| 1 | Export produces `Mal_hereketi_<date>.xlsx`, sheet «Mal hereketi» | **`mal_hereketi_<date>.xlsx`, sheet `Hesabat`** — the caller passes no sheet override | `MovementsPage.tsx:280-283`; `xls()` default `(sheet \|\| 'Hesabat')` |
| 2 | Excel shows a freeze pane below row 1 | **No freeze pane.** `xlsx@0.18.5` ignores `!freeze`; inherited from legacy, **not** a migration regression | Serialized + unzipped `sheet1.xml`: no `<pane>`; with/without `!freeze` byte-identical (md5). Legacy sets the same property: `index.html:1230` |
| 3 | The app runs against production; a write "would write to production" | **Running target UNVERIFIED**; observed browser hostname required. The mutation guard's **runtime state is likewise UNVERIFIED** — its behaviour is conditional and must be described as such, not asserted as closed | Vite also loads `.env.local`/`.env.[mode]`; process env overrides; `--mode` needs no script. `mutationGuard.ts` keys on runtime `location.hostname` and on build-time `import.meta.env` |
| 4 | KPI matches the visible set | **KPI and export cover the FULL filtered set**, not the capped rows | `MovementsPage.tsx:238-258` — export passes `all`, never `page` |
| 5 | B3 proves atomicity; B4's cancel-and-repost is its reversal | A successful batch proves **nothing about failure atomicity**; client tests do not prove **deployed server** atomicity, which stays **UNVERIFIED**; `correct_document`'s cancel-and-repost **is the correction**, and B4 has **no reversal** | `correctionReconcile.ts:22-40`; `correctionOutcome.ts:5-12`; `sql/030` |
| 6 | "No live read" alongside a recorded unauthenticated HTTP probe | Probe **distinguished and not repeated**; it is not an authenticated application or database read and proves nothing about I-8 | §1 capability table |

Also corrected: cap and role checks now require suitable data and accounts, or
are recorded **NOT EXECUTED**; export comparison is against the exact
formatting and null rules rather than visual equality; Group B's write actions
remain **BLOCKED** pending review of their exact effects and cleanup limits.

This proposal is **TEST-only**. Production is never substituted for TEST.

---

## 1. Execution capability — established first, before any scenario

The milestone table assigns I-8 "individually approved TEST reads, then
individually approved paired write+reversal checks". Who can actually run
those was verified in this session rather than assumed, because it changes
what may sensibly be proposed:

| Capability | State | How it was determined |
|---|---|---|
| Supabase MCP / SQL connector in Claude's toolset | **Absent** | Not present in the session toolset |
| Network egress to the TEST host | **Not re-tested; treat as unknown** | An earlier draft recorded an unauthenticated `GET` against the TEST REST root returning **401**. That was an outbound network request, and recording it while the header claimed "no live read" was inconsistent. It is **not repeated**, and it proves nothing about I-8: a 401 from an unauthenticated probe shows only that a host answers, not that any authenticated read or write is possible. Reachability will be established, if at all, by the user's own authenticated session |
| Browser automation (Playwright/Puppeteer/Cypress) | **Absent** | Not in `web/package.json`, not in `node_modules` |
| Credentials | **Not read, deliberately** | `.env` files are never opened (§6). Only the `https://…supabase.co` host substring was extracted, never a key |

**Consequence, stated plainly: Claude cannot execute any part of I-8.** Every
authenticated read, every write and every browser download in §3–§5 must be run
by the user (or by Codex where it holds a read-only SQL path, as it did for
`D2` and the RPC catalogue). Claude's role in I-8 is to specify each check, to
predict its expected result beforehand, and to record the outcome as reported.

A proposal that assumed Claude could run these would be unexecutable, which is
why capability is settled here rather than at the end.

### 1a. The running target is UNVERIFIED

**Corrected.** An earlier draft stated categorically that the app runs against
production and that "running the app as it stands and approving a write would
write to production." That claim was not supported by the evidence behind it.

What is actually established, without reading any secret (only host substrings
and a grep count):

- `web/.env` carries the PRODUCTION host `bbjmhaerssakbreykxiw`.
- The TEST host `alkjjbaawmsirsfvqljm` appears only in `web/.env.sandbox.local`.
- `VITE_ALLOW_LOCAL_WRITES` is **absent** from `web/.env` (grep count 0).
- `package.json` scripts are `dev: vite`, `build`, `preview`, `lint`,
  `typecheck`, `test` — none names a mode.

Why that does **not** determine the running target:

1. **Vite loads more than `.env`.** The installed Vite (`^8.2.2`) also loads
   `.env.local` and the mode-specific `.env.[mode]` / `.env.[mode].local`,
   with later files overriding earlier ones. A file's presence in `.env` is
   not the last word on what a running process resolved.
2. **The process environment overrides all of them.** A `VITE_*` variable
   exported in the shell wins over every file.
3. **A dedicated npm script is not required to select a mode.** `npx vite
   --mode sandbox`, or `npm run dev -- --mode sandbox`, selects
   `.env.sandbox*` with no script change. The absence of a script proves only
   that the choice is not *recorded*, not that it cannot be *made*.

**Therefore: the target of any given run is UNVERIFIED from the repository
alone.** It is a property of the command actually used and the environment it
ran in, and it must be read off the running app, not inferred from files.

**Required before any check (A or B):** the user reports the **actual hostname
of the browser's requests** — the Supabase project host seen in DevTools →
Network on a real request from the running app. That observed hostname, not a
file, is what establishes the target.

This is a **precondition, not a labelling rule**: if the observed host is not
the TEST project `alkjjbaawmsirsfvqljm.supabase.co`, execution stops. Nothing
here is run against production.

#### The mutation guard — conditional behaviour, runtime state UNVERIFIED

**Corrected again.** An earlier revision of this document stated the guard is
CLOSED because `VITE_ALLOW_LOCAL_WRITES` is absent from `web/.env` (grep count
0). That inference does not hold, and it repeats the very error corrected
above for the Supabase host: it reads one file and concludes a runtime state.

`localWritesAllowed()` returns `import.meta.env.VITE_ALLOW_LOCAL_WRITES ===
'true'` (`mutationGuard.ts:77-78`). Vite resolves `import.meta.env` at **build
time** from the whole env chain — `.env`, `.env.local`, `.env.[mode]`,
`.env.[mode].local` — and a variable exported in the process environment
overrides all of them. **The absence of the variable from `.env` therefore
proves nothing about the value a running build actually resolved.**

What can be stated is the guard's **conditional behaviour**, which is a
property of the code and is verifiable by reading it:

- `isLocalhost()` (`:72`) tests `location.hostname` at **runtime** against
  `localhost`, `127.0.0.1`, `::1`, `[::1]`.
- A guarded action is refused when the page **is** on such a host **and**
  `localWritesAllowed()` is false; it proceeds otherwise (`:89-90`).
- Every `doc.cancel*` action Group B needs is in `WRITE_ACTIONS`, so all of
  them sit under this condition.
- A deployed build on any other hostname is not gated by this guard at all.

**Neither input is observed.** The hostname is unknown until a run is
inspected, and the resolved flag is unknown until the same run is inspected.
So whether a Group B write would be refused or would proceed is **UNVERIFIED**,
and this document asserts neither.

The practical consequence is unchanged and does not depend on resolving it:
**Group B stays unauthorized and BLOCKED.** A guard whose state is unknown is
not a safety argument, and it is not being used as one — the block rests on
the missing authorization (§4a), not on an assumed refusal.

`mutationGuard.ts`'s header comment still says localhost talks to the same
production project. That comment is a stale statement about project setup, not
runtime evidence, and it does not establish the target either.

**Group B stays BLOCKED** (§4) — now for reasons stated accurately: the target
is unverified, the guard's runtime state is unverified, and the write actions
themselves have not been authorized. **No environment file and no launch configuration is changed
by this document.**

---

## 2. How the checks are split

Three groups, by what each actually requires. The split exists so the safe
group can proceed on its own if the write group stays blocked.

- **A — read-only and browser-download** (§3): no row is created, changed or
  deleted. Safe to run once an authenticated session exists.
- **B — requires a TEST write** (§4): each is a paired write **and** its
  reversal, individually authorized. Blocked by §1a.
- **C — deferred or blocked** (§5): not proposed for execution now.

---

## 3. Group A — read-only and browser-download checks

No writes. Each is one action, reported as run. Expected results are stated in
advance so a deviation is visible rather than rationalized after the fact.

**TEST-only.** Every check below is specified against TEST. If TEST is not
available, the check is recorded **NOT EXECUTED** — production is never
silently substituted for it.

**Prerequisite for all of them — a hard stop.** The browser's actual request
hostname must be observed (DevTools → Network, on a real request from the
running app) and must be **`alkjjbaawmsirsfvqljm.supabase.co`**.

- If it is that host, Group A may proceed.
- If it is **anything else** — including the production host
  `bbjmhaerssakbreykxiw.supabase.co` — **stop**. Run nothing, and report the
  observed host.
- If it has not been observed at all, **stop**. An unobserved target is not a
  reason to proceed and record it afterwards.

This plan is **TEST-only**. Production is never substituted for TEST, not for
a read and not for a download. A check run against any other project is not a
weaker version of these checks; it is outside this plan entirely.

**Prerequisite data/accounts.** A1's cap case needs a filter matching **more
than 3000 rows**; A7 needs real `rehber` and `anbardar` accounts on the
project under test, the `anbardar` scoped to a warehouse holding rows. Where
the data or the account does not exist, the check is **NOT EXECUTED** — not
approximated, and not reported as passed.

| # | Check | Why it needs live/browser | Expected result |
|---|---|---|---|
| **A1** | Open «Mal hərəkəti» as `admin`; confirm the screen loads, and check the KPI line and row count | The snapshot read is live | Rows load. **KPI is computed over the full filtered set, not over the displayed rows** — see the note below |
| **A1b** | *(only if a >3000-row filter exists)* Exercise the soft cap and «Hamısını göstər» | Cap behaviour needs real volume | Table displays the cap; «Hamısını göstər» lifts it. **If no such filter exists: NOT EXECUTED** |
| **A2** | Click «Excel»; save the file | **The only check that exercises the real download path.** The local suite intercepts `XLSX.writeFile`; nothing has exercised the browser's own save | A file named **`mal_hereketi_<yyyy-mm-dd>.xlsx`** downloads (lower-case; `MovementsPage.tsx:280-283` passes `'mal_hereketi'`) |
| **A3** | Open A2's file **in Microsoft Excel** | Closes the gap the serialization suite does not cover: SheetJS reading its own output proves nothing about Excel rendering | Opens with no repair prompt; **a single sheet named `Hesabat`** (the caller passes no sheet override, so `xls()`'s default applies); the exact 15-column header; autofilter on the header; readable column widths. **No freeze pane is expected — see the note below** |
| **A4** | In that file, inspect a zero-padded item code | Confirms the inherited `R-F9` conversion in the artifact a user actually receives | Code appears as a NUMBER with padding lost (e.g. `1`, not `0000001`). **Expected, not a defect** — pinned behaviour |
| **A5** | Compare a Silinmə row's «Vahid qiyməti» / «Məbləğ» in the file against the same row on screen | The stored valuation map is live data; local tests use synthetic rows | Values match **under the export's own formatting and null rules** — see the note below. Not a blanket "looks the same" |
| **A6** | Apply a filter matching **no** rows, then export | Header-only workbook against live data | A valid one-row file, header only, sheet `Hesabat`; no error |
| **A7** | *(only with suitable accounts)* Repeat A1–A2 as `rehber` and as `anbardar` | RLS scope is server-side (`D2`, `M8-42`); only live can show it | Both get «Excel»; neither gets «Qrup üzrə ləğv». An `anbardar`'s file contains **only their warehouse**. **Without such accounts: NOT EXECUTED** |
| **A8** | Read-only: does `stock_layer_allocations` exist on TEST, and what are its shape and RLS? | The deferred Silinmə report depends on it; `D1` cannot be closed without this | A definitive answer either way. **This is a read, not a build** |

A1–A7 need an authenticated browser session; A8 needs a read-only SQL path
(Codex's route for `D2`). None writes.

### A1 — KPI and export cover the FULL filtered set

**Corrected.** The 3000-row soft cap is a **display** bound. The KPI line and
the «Excel» export are both computed over the full filtered set: `exportXls()`
passes `all` — the complete filtered array — into `movementExportMatrix()`,
not the capped slice the table renders.

So the check is **not** "KPI matches the visible set." It is:

- the KPI totals reflect **every filtered row**, including rows beyond the cap;
- the exported file's body row count equals the **full filtered count**, which
  above the cap is deliberately **greater** than the number of rows on screen.

An export that stopped at 3000 rows while the filter matched more would be a
real defect. Confirming "the file matches what I can see" would hide exactly
that, which is why the expectation is written this way.

### A3 — no freeze pane is expected

**Corrected: the earlier draft promised "freeze pane below row 1" and was
wrong.** Verified locally against the installed `xlsx@0.18.5` by serializing a
workbook with `!freeze` set, unzipping it and reading
`xl/worksheets/sheet1.xml`: the file contains `<sheetView workbookViewId="0"/>`
with **no `<pane>` child**, and a workbook built with `!freeze` set is
**byte-identical (same md5)** to one built without it. The 0.18.5 writer does
not consume `!freeze` at all.

**This is an inherited limitation, not a migration regression.** The legacy
platform sets the identical `ws['!freeze'] = { xSplit: 0, ySplit: 1 }`
(`platform/index.html:1230`) and loads the same 0.18.5 build from its CDN
(`index.html:5`), so legacy exports carry no freeze pane either. The React port
reproduces legacy output exactly.

**No change is proposed** to `lib/xls.ts` or to the xlsx dependency. Moving to
a build that supports panes is a dependency and export-contract decision under
§7 of the migration principles (see `R-F7`), not something to slip into a live
gate. Registered as an inherited limitation; the local suite pins the absence
so a future dependency change surfaces it deliberately.

If Excel *does* show a frozen header in A3, that is the finding to report — it
would contradict the local probe and would need explaining before anything is
concluded from it.

### A5 — compare against the exact rules, not visual equality

The screen and the file are produced by different formatters, so "they look
the same" is not the test. Compare against the export's own contract:

- **Silinmə valuation** comes from the **stored** map, not `qty × price`: the
  amount is the stored `final_amount` and the unit price is `final / qty`
  rounded to 4 dp.
- **A null stored final** exports an **empty** «Məbləğ» cell — never `0` — and
  the unit price falls back to the row's own price.
- **Absent quantities** are empty cells, never `0`.
- **The date** is the raw ISO value, unformatted.
- **The warehouse** is the DISPLAY alias (stored «Xocahəsən» → «Xocəsən»).

A divergence from *these* rules is the defect. A cosmetic difference in how a
number is rendered on screen versus in a cell is not.

## 4. Group B — checks requiring a TEST write

**BLOCKED. Not authorized, and not to be attempted.** Nothing in this section
may run until every item in §4a is reviewed and each individual action is
explicitly approved. This document requests no approval for any of it.

The block has three independent causes, each sufficient on its own:

1. the running target is **unverified** (§1a);
2. the localhost mutation guard's **runtime state is unverified** (§1a) — it
   is not known whether a write would be refused or would proceed, and an
   unknown guard state is not a safety argument;
3. the **exact actions, lasting effects, evidence checks and cleanup limits**
   below have not been reviewed.

### 4a. What must be settled before any of it is proposed for approval

For **each** write, in writing, before approval is even sought:

- the **exact RPC and arguments**, including which document it touches;
- its **lasting effect** — what permanent rows remain afterwards;
- the **evidence check** that decides pass or fail, stated in advance;
- the **cleanup limitation** — precisely what cannot be undone;
- the **fixture** it runs against (§4b).

### 4b. Fresh fixtures, owned by the check — mandatory

**No check may select an arbitrary existing document.** An existing document
belongs to real warehouse history; cancelling one to observe a UI tag corrupts
that history for a test.

Every cancellation check must operate on a document **created by that check**,
in the same session, for the purpose. This makes the check's own posting step
its first authorized write, and it is why the sequence starts at B1.

### 4c. The checks

| # | Write | Lasting effect | What it proves |
|---|---|---|---|
| **B1** | Post one ordinary movement document, purpose-created as the fixture | A real document, permanently in the registry | The export reflects a genuinely new live row |
| **B2** | Cancel **B1's** document via the row action | A counter-document; **both** rows stay permanently | The «ləğv edilib» tag (`M8-06`) and `cancelledDocFor()` against real cancellation state |
| **B3** | *(needs 2–3 further purpose-created fixtures)* One batch cancellation | Counter-documents for each | See the atomicity note below — **less than it appears** |
| **B4** | One `correct_document` correction against a purpose-created fixture | The original **stays cancelled**; a replacement document exists permanently | I-6's caller and `M7-109`; also whether `correct_document` writes its audit row — still `OPEN` |

### 4d. Two claims withdrawn

**Corrected — an earlier draft asserted reversal guarantees that do not hold.**

**B3 does not demonstrate atomicity.** The draft called a batch cancellation a
test of "I-5's atomic all-or-none guarantee." It is not. A **successful** batch
shows only that a batch that succeeds, succeeds. Atomicity is a claim about
**failure**: that a batch failing partway leaves **no** document cancelled.
Observing that requires inducing a genuine mid-batch failure on the server —
which is not something to arrange against a live project, and is not proposed.

The honest scope of B3 is: a successful batch cancels every document named and
reports counts consistently. **Atomicity under failure remains untested.**

**Client tests do not prove deployed server atomicity.** The local suites
exercise the client-side matrix in `batchCancel.ts` — how the app *classifies
and reports* an outcome the server hands it. They mock or synthesize that
outcome. They therefore establish nothing about whether the deployed
`cancel_documents_batch` function actually commits all-or-none inside one
database transaction: that guarantee lives in the SQL function on the server,
and no client-side test can reach it.

**The deployed atomicity guarantee is UNVERIFIED and stays that way.** It is
not established by:

- the passing client test suites (they test the caller, not the function);
- a successful live batch (success is not failure behaviour);
- the SQL source in `sql/`, which is evidence of intent but not proof of what
  is deployed on any given project — per §7 of the project rules, a migration
  is unapplied until its live status is verified.

Closing it would require inspecting the deployed function definition and
inducing a genuine mid-batch failure. Neither is proposed, neither is
authorized, and I-8 must not be read as having closed it.

**B4's cancel-and-repost is the correction, not a reversal.** The draft listed
"its own cancel-and-repost is the reversal." That inverts what
`correct_document` does. It is **one transaction** whose two halves —
`cancel_document`, then `post_movement_document` — **are the correction
itself** (`sql/030`; `correctionReconcile.ts:22-40`). They do not restore the
prior state: afterwards the original is **cancelled** and a **replacement**
exists, both permanently.

So **B4 has no reversal.** Running it changes the registry for good. It must be
treated as a one-way write, not as a paired write-and-undo, and approved on
that basis or not at all.

### 4e. On "reversal" generally

Cancellation in this domain is **counter-posting, not deletion**. Every check
here adds rows; none removes any. There is no state in which the project is
returned to how it was before. Any framing that suggests otherwise is wrong,
and the `D5` phrase "paired write+reversal" must be read as "write plus
counter-entry, both permanent" — never as cleanup.

**Phase 7 `S-6` stays BLOCKED and is not reopened by anything here.**

## 5. Group C — deferred or blocked

Unchanged from the existing plans; listed so nothing is silently dropped.

| Item | State | Reason |
|---|---|---|
| **«Çap» (printing)** | **DEFERRED** | `D1` never approved it; unbuilt and unrendered. Not an I-8 check |
| **Separate Silinmə report (`xlsWriteOff`)** | **DEFERRED** | Unbuilt. Depends on `stock_layer_allocations` — A8 is the read that informs it, and A8 does **not** authorize building it |
| **`U2` — valuations read while layers inactive** | **OPEN, inherited** | React reads `writeoff_valuations` unconditionally; legacy gates on `DB.layerActive`. Inherited from I-2, not introduced by I-7. Needs its own decision, not a live check |
| **`U1` — no CSV fallback in `lib/xls.ts`** | **OPEN, pre-existing** | The shared helper was deliberately not modified |
| **Phase 7 `S-6`** | **BLOCKED** | A server/RPC gap; not reopened by Phase 8 |
| **`M7-120` audit row for `correct_document`** | **OPEN** | Partially addressed by B4 if that runs |
| **Production writes of any kind** | **PROHIBITED** | Out of scope for I-8 entirely |

---

## 6. Open question for the user

**`Q1` — how should I-8 reach the TEST project, and how will that be
verified?** Restated: the earlier version presented this as fixing a `.env`
that points at production. That framing was wrong (§1a) — the running target
was never established, so the question is how to make it **deliberate and
observable**, not how to correct a known-bad value.

Two parts:

**(i) Selection.** Options, no action taken on any:

- **(a)** Add an explicit sandbox-targeted script (e.g. a `--mode sandbox`
  dev script). *Recommended* — it makes the target auditable rather than
  dependent on remembering how the process was started. Note this is a
  convenience, not a necessity: `--mode sandbox` can already be passed on the
  command line without any script.
- **(b)** Select the mode ad hoc per run. Works, but leaves the target
  unrecorded.
- **(c)** Keep Group B blocked indefinitely and run Group A only.

**(ii) Verification, required regardless of (i).** Whichever is chosen, the
**observed browser request hostname** must be reported before a check is
labelled TEST. Selection is an intention; the observed hostname is the
evidence.

**This document changes no environment file and no launch configuration.**
`Q1` is the user's decision.

Group A does **not** depend on which option is chosen — but it does depend on
part (ii): the user confirms the observed project before A1, and A1b/A7
additionally need suitable data and accounts or are recorded NOT EXECUTED.

## 7. What this proposal does not do

It executes nothing, promotes nothing, and changes no status. I-7 remains
`CODE VERIFIED`; Module I remains one acceptance boundary and is **not
`ACCEPTED`**; **Phase 8 is NOT ACCEPTED**; `D1` remains partially resolved and
`D5` remains **undecided**.

No application behaviour was changed. No SQL was written or run, no credential
was read, no fixture was created, no live access was made, no dependency or
environment file was touched, nothing was committed and nothing was deployed.

The only file changed alongside this correction is the local test suite
`web/src/lib/movementExportWorkbook.test.ts`, which now mirrors the real export
call (`mal_hereketi`, sheet `Hesabat`), keeps the sheet-override cases in a
separate block, and pins the inherited freeze-pane absence. `web/src/lib/xls.ts`
and the xlsx dependency are unchanged.
