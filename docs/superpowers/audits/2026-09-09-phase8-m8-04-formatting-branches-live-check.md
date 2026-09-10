# Phase 8 — M8-04 remaining formatting branches, live check — 2026-09-09

Scope: `M8-04` only — the 15-column table's legacy order and formatting
(`MovementsPage.tsx` `MovementRowCells`, legacy `index.html:1797-1824`).

Read-only against TEST `alkjjbaawmsirsfvqljm`. **No TEST write, no persistent
fixture, no source change, no commit, no deployment, no I-10 row.** TEST
movement count **unchanged at 109**. Çap remains outside acceptance.

Application helpers were **never imported** by the harness: `whLabel`,
`resolveWh`, `normWhName`, `nf`, `money`, `fmtD` and `recorderLabel` were each
reimplemented independently and compared against the DOM. Cells were addressed
by **header-name → column index**, not by class selectors. No screenshots were
used as evidence, and the Zustand store was never touched.

---

## 1. Gap analysis — every M8-04 branch and its prior status

From the current ledger row, the presentation sweep had already promoted these
against **real TEST data**, and they were **not** repeated here except where
noted as a control:

| branch | prior status |
| --- | --- |
| 15 headers in contract order (admin / `anbardar` / `rehber`) | LIVE (real) |
| `fmtD()` `2026-09-03` → `03.09.2026` | LIVE (real) |
| `nf(_,2)` quantities and prices | LIVE (real) |
| `money()` normal **and** its zero → em-dash branch | LIVE (real) |
| `whLabel()` pass-through (`Test Anbar`) | LIVE (real) |
| note ≤40 chars with full `title` | LIVE (real) |
| em-dash fallbacks (empty channel / invoice / route) | LIVE (real) |
| recorder — **known directory id → email**, no raw UUID | LIVE (real) |

Left CODE VERIFIED for want of a fixture — **these are the branches this run
closes**:

1. `Xocahəsən` → `Xocəsən` warehouse alias (the only aliased name; not a
   configured TEST warehouse);
2. transfer channel **hidden** when it resolves to a warehouse;
3. meaningful non-warehouse channel **retained** on a transfer;
4. warehouse-looking channel **retained** on a non-transfer;
5. note >40 chars → 40 + `…` with the full text in `title`;
6. note of **exactly** 40 chars → no ellipsis;
7. recorder «Excel idxalı» for `created_by = null`;
8. recorder «Excel idxalı» for the legacy `'sistem'` sentinel;
9. recorder **current-user name** when the signed-in id is absent from the
   directory;
10. recorder «digər istifadəçi» for an unknown other id;
11. no raw UUID in any recorder branch.

---

## 2. Real TEST baseline

Fresh verified sandbox (`--mode sandbox`, `127.0.0.1:5175`, HTTP 200,
`VITE_ALLOW_LOCAL_WRITES=false`), real React login, «Mal hərəkəti» settled.

- **RAW movements: 109**; rendered rows **3**.
- Headers (15, exact order): `Tarix · Anbar · Kod · Malın adı · Növü ·
  İstiqamət / Kontragent · Kanal · Qaimə № · Giriş · Çıxış · Qiymət · Məbləğ ·
  Qeyd · Qeyd edən · ∅`.
- Warehouses response: `Test Anbar`, `Test Layihə Ünvanı`,
  `CODEX Phase8 Transfer Anbar` — **no `Xocahəsən` and no `Astara` exist on
  TEST**.
- `get_user_directory()`: 4 entries.
- Current user: `aa0fd092-af7d-4e0e-baac-34ce1a0389fa` /
  `anbar-admin-test@example.com`; **profile name `ANBAR Test Admin`** (observed
  from the real profile read, never intercepted).

The snapshot was preserved for the recovery comparison.

---

## 3. Browser-only formatting payload

Only the exact full-column `movements` GET was intercepted. **Auth, sign-in,
`register_session`, `current_user_role`, profile reads, `items`, `warehouses`,
`writeoff_valuations` and every mutation/session RPC were never intercepted.**
StrictMode duplicates were served the identical body. Nothing was sent to
Supabase and nothing was persisted.

12 synthetic rows, unique ids/documents prefixed `M804`. **Row accounting:
12 synthetic → 12 rendered, 0 missing, 0 unexpected.**

### A — warehouse alias

| raw | independently expected | DOM |
| --- | --- | --- |
| `M804-A1` / `M804-DOC-A1`, `warehouse: "Xocahəsən"` | `Xocəsən` | **`Xocəsən`** |

The raw browser payload still carries **`Xocahəsən`** — the alias is
display-only, exactly as `WH_DISPLAY` documents. Note this works even though
`Xocahəsən` is not a configured TEST warehouse, because `whLabel()` is a pure
display map independent of the warehouse list.

### B — channel suppression (three rows differing only in type/channel)

Independently computed, no helper imported:
`normWhName("Test anbar") = "test"` → resolves to the configured **`Test Anbar`**;
`normWhName("Təcili") = "təcili"` → resolves to **null**.

> `"Test anbar"` is a genuine resolution against a real configured name via the
> historical «… anbar» suffix form — **not** the known TEST «… Anbar» naming
> artifact, and not an empty channel mistaken for suppression. Every channel
> value below is non-empty.

| row | type | raw channel | expected Kanal | DOM Kanal |
| --- | --- | --- | --- | --- |
| `M804-B1` | `Yerdəyişmə` | `Test anbar` | `—` (hidden) | **`—`** |
| `M804-B2` | `Yerdəyişmə` | `Təcili` | `Təcili` (shown) | **`Təcili`** |
| `M804-B3` | `Alış` | `Test anbar` | `Test anbar` (shown) | **`Test anbar`** |

B1 vs B2 isolates *resolution*; B1 vs B3 isolates *type* — together they prove
suppression applies only to `Yerdəyişmə` **and** only to a warehouse-resolving
channel.

### C — note boundary

| row | raw note | expected visible | DOM visible | `title` |
| --- | --- | --- | --- | --- |
| `M804-C1` | 41 × `A` | 40 × `A` + `…` | **match** | full 41 chars, byte-for-byte |
| `M804-C2` | 40 × `B` | 40 × `B`, **no ellipsis** | **match** | exact note |
| `M804-C3` | `Uzun qeyd ` + 45 × `z` (55) | first 40 + `…` | **match** | full 55 chars |

C2 asserts the boundary is `> 40`, not `>= 40`.

### D — recorder branches

| row | `created_by` | expected | DOM |
| --- | --- | --- | --- |
| `M804-D1` | `null` | `Excel idxalı` | **`Excel idxalı`** |
| `M804-D2` | `'sistem'` | `Excel idxalı` | **`Excel idxalı`** |
| `M804-D3` | `ffffffff-1111-2222-3333-444444444444` | `digər istifadəçi` | **`digər istifadəçi`** |
| `M804-D4` (control) | current user, in directory | the email | **`anbar-admin-test@example.com`** |

No recorder cell contains a UUID or the literal `sistem`, and the unknown UUID
appears **nowhere in the entire DOM** — the I-2 finding-2 correction, proved
falsifiably on the branches that previously lacked live evidence.

---

## 4. The current-user-name branch (separate leg)

This branch needs `created_by` to equal the signed-in user **while that id is
absent from the warmed directory map**.

**A first attempt failed for a real reason worth recording:** the directory is
warmed **once at boot** (`App.tsx:92-99`), not per navigation, so an override
armed at remount time is too late — the map was already populated and the row
rendered the email. The leg was rerun with the override armed **before login**.

Only `/rpc/get_user_directory` was overridden; sign-in, `register_session`,
`current_user_role`, profile reads and every mutation/session RPC were left
untouched. **Exactly one entry** was removed —
`aa0fd092-…` / `anbar-admin-test@example.com` — and the other 3 real entries
were returned unchanged.

| row | `created_by` | expected | DOM |
| --- | --- | --- | --- |
| `M804-F1` | current user, **absent** from directory | `ANBAR Test Admin` | **`ANBAR Test Admin`** |
| `M804-F2` (control) | `089440eb-…`, still in directory | that email | **`anbar-anbardar-test@example.com`** |

F1 is **not** the email, **not** `Excel idxalı`, **not** `digər istifadəçi`,
**not** a raw UUID — and no UUID appears anywhere in the DOM. The F2 control
proves the trim was surgical: the rest of the directory still resolved
normally, so F1's result cannot be explained by a broken directory response.

**12/12 checks passed in this leg.**

---

## 5. Two harness-side expectation errors, and what they were not

Both were **harness defects, not application defects**, and neither touches a
branch this run needed to close. Recorded because a reader would otherwise see
them in the raw logs:

1. **`nf(1,2)`** — the harness computed `1,00` because **Node's ICU** renders
   `az-AZ` with a decimal comma, while **Chrome** renders `1.00`. The real
   baseline already shows `1.00` and the ledger records `nf(_,2)` as LIVE from
   real data; the expectation was computed in the wrong runtime.
2. **A "zero price" row rendered `12.50`** — `pr = m.price || it.price`
   correctly fell back to the nomenclature price. The app's own `items` query
   selects `price` (`items.api.ts:45`); the narrower items response captured in
   the baseline lacked that column, which is why the fallback looked
   unexplained at first. The row was simply not a valid zero-price fixture. The
   **`money()` zero → em-dash** branch is unaffected: it passed here and is
   already LIVE from real data.

---

## 6. Recovery

Both interceptions removed, real remount triggered:

- real raw counts returned to **109** (`[109, 109]` — one logical load ×
  StrictMode);
- `get_user_directory()` back to the full **4** entries;
- rendered rows back to **3**, **byte-identical to the baseline** (cell-by-cell
  string equality, not merely equal counts);
- **no `M804` id/document/note/channel** anywhere in the DOM; no `Xocəsən`;
- recorder cells back to `anbar-admin-test@example.com`;
- no error banner.

Both sessions ended through the real «Çıxış».

---

## 7. Safety

- 0 production contact attempts; a blanket route aborted anything containing
  `bbjmhaerssakbreykxiw` and the counter stayed **0**.
- Real TEST movement count **unchanged at 109**.
- **No mutation RPC.** Every non-GET database request was a read RPC
  (`get_reference_values`, `stock_layers_supported`), an `audit_log` HEAD count,
  or session bookkeeping (`register_session`) — POST is Supabase's RPC
  transport, not a write.
- No active device session remains.
- localhost `127.0.0.1:5175`, `--mode sandbox`, HTTP **200**,
  `VITE_ALLOW_LOCAL_WRITES=false` (`.env.sandbox.local` never edited).
- Nothing staged; dirty tree preserved; **no application source file touched**;
  no I-10 row.

---

## 8. Acceptance effect

**`M8-04` → LIVE VERIFIED.** Every branch the current ledger names is now
covered by either prior **real-TEST** evidence (headers, `fmtD`, `nf`, `money`
incl. zero, `whLabel` pass-through, ≤40-char note, em-dash fallbacks, recorder
known-directory branch) or this falsifiable **browser-only presentation
harness** (alias, all three channel cases, both note-boundary cases, all three
remaining recorder branches, no-raw-UUID).

The distinction is deliberate and must be preserved when quoting this row: the
`M804` rows existed **only as an intercepted HTTP response body inside one
Chrome context**. The real TEST table held **109** rows before, during and
after. This is **React presentation-contract evidence only** — not stored TEST
data, not backend generation, and not payload/performance evidence.

Phase 8 remains **NOT ACCEPTED**.
