# Phase 13 parity ledger — Module N («Sərfiyyat Materialları»)

> **PHASE 13 CLOSURE RECONCILIATION — 2026-09-11 (authoritative, latest).**
> The owner accepted the unobserved rehber refusal as a non-blocking scope
> exception (M13-91). TEST Supabase Dashboard SQL Editor, using only `SELECT`
> statements as database role `postgres`, read the persisted `audit_log` rows:
> `serfiyyat_documents` has 7 `INSERT`, 2 `UPDATE`, and 7 `DELETE` rows with
> the exact fixed Azerbaijani reasons. Each DELETE audit payload contains the
> prior document fields and its `lines` array. This is dashboard-only evidence;
> it does not contradict the ordinary TEST admin's RLS-limited zero-row view.
> **Tally, measured mechanically from the 77 `| M13-* |` status cells: 68
> `CODE VERIFIED`, 9 `LIVE VERIFIED` (M13-52, M13-53, M13-70, M13-71,
> M13-90, M13-92, M13-93, M13-94, M13-98), 0 `IN PROGRESS`, 0
> `NOT STARTED`, 0 `BLOCKED`, 0 unclassified; 77 unique ids, 0 duplicates,
> every row a uniform 5-cell row.** The final independent Codex acceptance
> audit passed: **Phase 13 is ACCEPTED.** No database mutation occurred during
> the dashboard read-back or acceptance review.

> **SUPERSEDED STATUS BANNER — 2026-09-11.** This prior status snapshot is
> retained as chronology; the closure reconciliation above is authoritative.

> **PHASE 13 IMPLEMENTED ON CLAUDE'S SIDE — 2026-09-11 (authoritative,
> latest).** T1-T6 and T9 ran as one block; **T7 was NOT run**: the owner
> authorised the D-N1 write window, but **no TEST identity was supplied to the
> session**, so not one Sərfiyyat document was created, edited or deleted in
> TEST. **0 Supabase contacts, 0 write attempts, 0 sequence advances, 0
> `audit_log` rows** — the exact residual accounting D-N1 requires is
> therefore all-zero and nothing needs cleaning up.
> **Tally, measured mechanically from the 77 `| M13-* |` status cells: 67
> `CODE VERIFIED`, 8 `LIVE VERIFIED` (M13-52, M13-53, M13-70, M13-71,
> M13-90, M13-92, M13-93, M13-98), 2 `IN PROGRESS` (M13-91, M13-94), 0
> `NOT STARTED`, 0 `BLOCKED`, 0 unclassified; 77
> unique ids, 0 duplicates, every row a uniform 5-cell row.**
> Gate: 168 files / 3741 tests, `tsc -b --noEmit` clean, `oxlint src` clean,
> sandbox build (238 modules), `git diff --check` clean, 0 staged, dirty tree
> preserved. Phase 13 remains **NOT ACCEPTED** pending Codex's final
> independent audit.
> [Implementation audit](../audits/2026-09-11-phase13-implementation.md)

> **PHASE 13 DESIGN ACCEPTED — 2026-09-11 (SUPERSEDED by the implementation
> banner above; its design verdict still stands).** Codex
> verified the primary legacy/schema contracts and corrected two defects:
> D-N4's zero-bound premise was false and is withdrawn; M13-13 now limits
> atomic failure to the three core table reads plus the required item catalogue while M13-12 keeps reference
> failure non-fatal. **HISTORY —** at that moment the tally was 77
> `NOT STARTED`, 0 in every other status, and implementation awaited owner
> decisions D-N1…D-N3 and D-N5…D-N7. Those decisions were granted and the
> code now exists; the current tally is in the implementation banner at the
> top of this file. Phase 13 remains **NOT ACCEPTED**.
> [Codex design audit](../audits/2026-09-11-phase13-design-codex-audit.md)

> **PHASE 13 DESIGN DRAFTED — 2026-09-11 (SUPERSEDED by the audited banner
> above).** Design and
> reconciliation only. **No application code exists for this module and no row
> is promoted.** **Tally, measured mechanically from the 77 `| M13-* |` status
> cells: 0 `CODE VERIFIED`, 0 `LIVE VERIFIED`, 0 `IN PROGRESS`, 77
> `NOT STARTED`, 0 `BLOCKED`, 0 unclassified; 77 unique ids, 0 duplicates.**
> No Supabase project was contacted in this design session; no application,
> test, SQL or CSS file was changed; the dirty tree is preserved and staging is
> empty. Phase 13 is **NOT STARTED / NOT ACCEPTED** pending Codex's independent
> design audit and owner decisions D-N1…D-N3 and D-N5…D-N7. D-N4 was
> withdrawn by the audit because its premise was false.
> [Proposal](./2026-09-11-react-migration-phase13-serfiyyat-materiallari-proposal.md) ·
> [TEST-only plan](../plans/2026-09-11-react-migration-phase13-serfiyyat-materiallari.md) ·
> [Design handoff audit](../audits/2026-09-11-phase13-design-handoff.md) ·
> [Roadmap](../plans/2026-09-10-post-phase9-migration-roadmap.md)

Evidence classes: *unit/source* = vitest / static source comparison;
*browser* = interception on the sandbox dev server against TEST; *live* = the
row's exact contract exercised against TEST `alkjjbaawmsirsfvqljm`;
*persisted TEST* = written and re-read in TEST; *server/RLS* = proven by a
refused or allowed call. Legacy refs are repository-root `index.html` lines;
server refs are line numbers in the captured TEST schema
`docs/superpowers/test-environment/restore-test-schema.sql`.

**This is the migration's first DOCUMENT workflow that is not a stock
movement, and its largest single legacy surface so far (~500 lines).** Browser
affordances and server-authoritative permissions are separate rows throughout
(M13-06 vs M13-90, M13-51 vs M13-91, M13-70/71 vs M13-92/93): a hidden control
is never evidence of a permission (protocol §5, §7). Every row whose contract
is a refusal names the FIRST refusing guard.

Rows deliberately NOT in this ledger (prose boundary, see proposal §2.11 and
§7): Soraqçalar administration of `project` / `serfiyyat_channel` values
(migrated in Phase 2/3 and reused read-only here), the rail counter badges
(shell concern, Phase 18), `Çap` (this page has none), and the
`next_serfiyyat_doc_num()` `SM-YYYY-NNNNNN` format (server-internal, never
asserted by the browser).

| Row | Contract | Legacy ref | Server ref | Status |
|---|---|---|---|---|
| M13-01 | Rail contains one «Sərfiyyat Materialları» entry; it is the LAST entry of the «Bazalar» group, after «Soraqçalar»; clicking it opens the page and it becomes the only active entry | 262 | — | `CODE VERIFIED` |
| M13-02 | The entry carries an `id` but NO `display:none`, no sign-in visibility assignment and no `go()` branch, so the page is UNGATED for every effective role. The id exists without a gate attached; «has an id» must not be recorded as «role-gated» | 262, 1495-1512, 7505-7507 | — | `CODE VERIFIED` |
| M13-03 | Page shell: a `.phead` with heading «Sərfiyyat Materialları», the fixed subtitle «Layihə üzrə dərhal istifadə olunan tikinti materialları — anbar qalığına təsir etmir.», a spacer, then the `#sm-seg` segment control; the whole body renders into one `#sm-out` container | 382-390 | — | `CODE VERIFIED` |
| M13-04 | The subtitle is FIXED for every role — unlike «Nomenklatura sorğuları», this page has no role-dependent subtitle variant | 383 | — | `CODE VERIFIED` |
| M13-05 | `smCanWrite()` is `isAdmin() \|\| isAnbardar()` — a rehber is excluded. This is a browser affordance, never the authority | 6226 | 2416 | `CODE VERIFIED` |
| M13-06 | `smAllowedProjects(forWrite)` narrows the ACTIVE projects: admin → all; anbardar with a warehouse → only projects whose `linked_warehouse` equals it; anyone else → `[]` when `forWrite`, all active when not. Affordance only; the server re-checks the same binding | 6220-6225 | 2420-2427 | `CODE VERIFIED` |
| M13-07 | The `forWrite` asymmetry is deliberate and load-bearing: a rehber gets NO project for writing but sees EVERY active project's rows in the report | 6220-6225, 6578, 6595 | policy 5755-5757 | `CODE VERIFIED` |
| M13-10 | Readiness gate: the page reads `serfiyyat_projects`, `serfiyyat_documents`, `serfiyyat_lines` and the required item catalogue as one fatal generation; failure in any source leaves the subsystem unavailable. Reference values remain the separate non-fatal M13-12 branch, and the boot-warmed application user directory is reused without another RPC | 6186-6206; global `DB.items` / `UMAIL` inputs | — | `CODE VERIFIED` |
| M13-11 | RLS narrows the three reads by role and the client sends no filter of its own: `serfiyyat_projects` shows active rows to everyone and inactive ones only to admin; documents and lines are visible to admin and rehber in full, and to an anbardar only when the document's project is linked to their warehouse | 6192-6196 | 5753-5764 | `CODE VERIFIED` |
| M13-12 | The `get_reference_values` read for `serfiyyat_channel` sits in its OWN try/catch: its failure empties the channel list but does NOT clear `smReady`. The two failure scopes are deliberately different and must not be merged | 6207-6212 | — | `CODE VERIFIED` |
| M13-13 | The React snapshot's three core table reads plus the required item catalogue are one atomic generation: an error or rejection from projects, documents, lines or items yields `ok:false` and nothing is applied. Reference-values failure follows M13-12 and is non-fatal. Author labels consume the boot-warmed application directory, so this page must not refetch it | 6186-6213; global `DB.items` / `UMAIL`; M12-13 precedent | — | `CODE VERIFIED` |
| M13-14 | First load shows a loading block; a first-load failure shows a load-error block and no page body; a failed REFRESH retains the previous complete snapshot and shows the «Yenilənmədi» tag; recovery clears it | M11-12 / M12-14 precedent | — | `CODE VERIFIED` |
| M13-15 | `SM = { lines, filters, editDocId }` is a long-lived module object, so draft lines, filters and the edit target live in the STORE, not the component, and survive navigation away and back (the M4-18 / M9-06 rule) | 6184 | — | `CODE VERIFIED` |
| M13-16 | The `#sm-seg` control has exactly two buttons in fixed order, «Yeni sənəd» (`doc`, initially `.on`) and «Hesabat» (`rep`); clicking one moves `.on` to it and re-renders | 384-387, 6233-6237 | — | `CODE VERIFIED` |
| M13-17 | Legacy holds the ACTIVE TAB in the DOM (`#sm-seg` `dataset.tab`), not in `SM`, and guards the handler wiring with `dataset.wired` so it attaches exactly once. The React port holds the tab in the store; the `wired` guard has no React equivalent and is recorded as a legacy implementation detail, not a contract to reproduce | 6231-6238, 6244 | — | `CODE VERIFIED` |
| M13-18 | A response from an earlier load that arrives after a later load's response is discarded, success and failure alike | M11-15 / M12-15 precedent | — | `CODE VERIFIED` |
| M13-19 | Realtime watches `serfiyyat_documents` and `serfiyyat_lines` through the shared hook with its 400 ms debounce; a burst produces one reload. Legacy subscribes to a FIXED set (`movements`, `items`, `partners`, `warehouses`) that includes NO `serfiyyat_*` table, so this is a proposed IMPROVEMENT, not parity — D-N5 | 1163-1181, 1174 | — | `CODE VERIFIED` |
| M13-20 | Form guard 1 — editing a document that no longer exists (e.g. deleted meanwhile) clears `editDocId` and the draft lines and falls through to the ordinary create form rather than erroring | 6253 | — | `CODE VERIFIED` |
| M13-21 | Form guard 2 — not editing AND `!smCanWrite()` renders exactly «Sənəd yaratmaq üçün icazəniz yoxdur (yalnız Admin və Anbardar).» and nothing else. Guard order matters: this is reached before the project check | 6254 | — | `CODE VERIFIED` |
| M13-22 | Form guard 3 — editing AND not admin renders exactly «Provedilmiş sənədi yalnız Admin düzəldə bilər.» and nothing else | 6255 | 2732-2734 | `CODE VERIFIED` |
| M13-23 | Form guard 4 — not editing AND no allowed active project renders exactly «Sizə bağlı aktiv layihə yoxdur. Admin Soraqçalar bölməsində layihəni sizin anbarınıza bağlamalıdır.». It is deliberately SKIPPED in edit mode so an admin can edit a document whose project is not one of their own | 6256-6259 | — | `CODE VERIFIED` |
| M13-24 | In edit mode a hint line «Düzəliş rejimi: {doc_num} (provedildikdən sonra) — ləğv et» is rendered above the form; «ləğv et» clears `editDocId` and the draft and re-renders the create form | 6270, 6311 | — | `CODE VERIFIED` |
| M13-25 | The Excel document-import card is rendered ONLY when not editing; in edit mode the whole block is absent | 6262-6268 | — | `CODE VERIFIED` |
| M13-30 | Header row 1 holds Layihə (select over the allowed projects, pre-selecting the edited document's project), Tarix (`type=date`, defaulting to `today()` or the edited document's date) and Alınma kanalı (select with a leading empty «—» option over the ACTIVE channel names only) | 6271-6275, 6216 | — | `CODE VERIFIED` |
| M13-31 | Header row 2 holds Kontragent, Avtomobil nömrəsi and Qaimə №, each a free-text input pre-filled from the edited document; row 3 holds the single Qeyd input | 6276-6281 | — | `CODE VERIFIED` |
| M13-32 | The item search is debounced 160 ms, requires at least 2 characters, matches `name` substring OR `code` substring case-insensitively, and shows at most 12 hits; below 2 characters the result panel is hidden. This is its own rule and is NOT any of the platform's three existing normalisers | 6317-6329 | — | `CODE VERIFIED` |
| M13-33 | Choosing a hit sets the hidden selected code, puts the item NAME (or the raw code when the item is unknown) into the input, hides the panel, and fills the price ONLY when the price field is currently empty — an existing price is never overwritten | 6323-6327 | — | `CODE VERIFIED` |
| M13-34 | The search panel is hidden on blur after a 150 ms delay, so a click on a hit still registers | 6330 | — | `CODE VERIFIED` |
| M13-35 | «Sətri əlavə et →» refuses in a FIXED order, writing to the inline `#sm-err` span and not a toast: no item selected or unknown code → «Mal seçilməyib»; then `!(qty > 0)` → «Miqdar müsbət olmalıdır». A zero or negative quantity is refused by the second guard, never the first | 6332-6341 | 2463-2465 | `CODE VERIFIED` |
| M13-36 | On a successful add the line is pushed with `{code, qty, price}` where price defaults to 0, the error span is cleared, and the item, quantity and price inputs are all reset | 6337-6340 | — | `CODE VERIFIED` |
| M13-39 | The draft lines block renders a two-line hint («Hələ sətir əlavə edilməyib.» plus the instruction) when empty — this is a hand-written block, NOT the shared `tbl()` empty markup | 6516 | — | `CODE VERIFIED` |
| M13-40 | The draft lines table columns are exactly «Mal · Kod · Ölçü · Miqdar · Qiymət · Cəm · (remove)»; the name falls back to the raw code and the unit to empty when the item is unknown | 6517-6521 | — | `CODE VERIFIED` |
| M13-41 | Each draft row's ✕ removes THAT row by index and re-renders; removal never re-sorts or renumbers the remaining rows | 6523 | — | `CODE VERIFIED` |
| M13-42 | The draft footer shows «Cəmi» over the sum of `qty * price` across all draft lines, formatted by `money()`; a total of exactly 0 therefore renders an em-dash, not `0,00 ₼` | 6522, 599 | — | `CODE VERIFIED` |
| M13-43 | Line arithmetic in the DRAFT is the browser's `qty * price`, while the stored `line_sum` is a generated column `round(qty * price, 2)`. The two can differ in the last decimal before a reload; after `smLoad()` the report reads the stored value. Recorded so the port does not silently "fix" either side | 6520-6522, 6204 | 180 | `CODE VERIFIED` |
| M13-50 | Submit validates in a FIXED order, each into `#sm-err`: no project → «Layihə seçilməyib»; no date → «Tarix seçilməyib»; no draft line → «Ən azı bir material sətri lazımdır» | 6527-6531 | 2429-2442 | `CODE VERIFIED` |
| M13-51 | The argument object sends `p_project_id`, `p_doc_date`, and `p_kontragent`/`p_avtomobil_nomresi`/`p_alinma_kanali`/`p_invoice_num`/`p_note` each as the field value OR `null` when empty, plus `p_lines` as `{code, qty, price}` objects. No creator, warehouse or document number is sent — the signatures accept none | 6533-6541 | 2398, 2444-2451 | `CODE VERIFIED` |
| M13-52 | The SAME argument object routes to `edit_serfiyyat_document` (with `p_doc_id` prepended) when `SM.editDocId` is set and to `create_serfiyyat_document` otherwise; there is exactly one submit path, not two forms | 6542-6545 | 2398, 2716 | `LIVE VERIFIED` — real UI created `SM-2026-000001`, then admin edit updated the same document |
| M13-53 | On success the toast is «Sənəd yaradıldı: {doc_num}» or «Sənəd düzəldildi: {doc_num}» from the RPC's returned `doc_num`; the draft, edit target and every component-local header/item/import field are cleared, `smLoad()` re-reads and the page re-renders, so neither the report nor the next create inherits stale editor state | 6546-6552 | 2482, 2803 | `LIVE VERIFIED` — create and edit both reloaded; after async completion the local note/item/lines were empty |
| M13-54 | On failure the toast is «Xəta: » plus the server message, and the DRAFT IS KEPT — lines, header fields and the edit target all survive, so a refused submit loses no work | 6546 | — | `CODE VERIFIED` |
| M13-60 | Line-level Excel import (`#sm-imp-file`) reads the workbook's FIRST sheet as a 2-D array with `defval:''` and `raw:false`, then appends to the OPEN draft. It is deliberately distinct from the document-level import and must never be merged with it | 6343-6357, 6397-6403 | — | `CODE VERIFIED` |
| M13-61 | Its header detection tests the first row against `/kod\|code\|miqdar\|qty\|qiymət\|price/`; when a header exists the three columns are located by name and parsing starts at row 2, otherwise columns are positional `0,1,2` and parsing starts at row 1 | 6371-6379 | — | `CODE VERIFIED` |
| M13-62 | Per row: an EMPTY code is skipped SILENTLY and counted nowhere; an unknown code is rejected as «{code} (mal tapılmadı)»; a non-positive quantity is rejected as «{code} (miqdar yanlış)». A decimal comma is accepted and converted; the price defaults to 0 | 6381-6391 | — | `CODE VERIFIED` |
| M13-63 | The result toast reports both counts — «{n} sətir əlavə olundu» plus «, {m} sətir rədd edildi (konsola bax)» when any were rejected — and the rejected list goes to `console.warn`. Nothing is swallowed silently except the empty-code row | 6392-6394 | — | `CODE VERIFIED` |
| M13-65 | Document-level import resolves each row's project by EXACT case-insensitive name match against `smAllowedProjects(true)`, so a project the user may not write to produces the per-row error «Sətir {n}: layihə tapılmadı və ya icazəniz yoxdur: "{value}"» naming the 1-based worksheet line | 6404-6407, 6440-6441 | — | `CODE VERIFIED` |
| M13-66 | Its column map is name-detected with one deliberate exclusion: the avtomobil column matches `/avtomobil\|nömrə\|nomre/` AND NOT `/qaim\|invoice/`, because «Qaimə nömrəsi» also contains «nömrə» and would otherwise bind two different fields to one column | 6417-6433 | — | `CODE VERIFIED` |
| M13-67 | Rows group into documents by the composite key `projectId\|kontragent\|avto\|kanal\|iv\|date\|note`, with every text component lower-cased and the date normalised to `YYYY-MM-DD` (falling back to `today()` when the cell is not an ISO date prefix). Varying any ONE component must produce a separate document | 6447-6456 | — | `CODE VERIFIED` |
| M13-68 | An item is resolved by EXACT code match first, then by exact case-insensitive name; a failure yields «Sətir {n}: mal tapılmadı: "{value}"» and a non-positive quantity yields «Sətir {n}: miqdar yanlış: "{value}"» | 6408-6414, 6442-6445 | — | `CODE VERIFIED` |
| M13-69 | Nothing is written silently: a preview modal lists the group count, the total line count, a per-group table (Layihə · Tarix · Kontragent · Avtomobil · Kanal · Qaimə № · Sətir · Cəm) and every rejected row, and the confirm button is DISABLED when no group parsed | 6477-6491 | — | `CODE VERIFIED` |
| M13-70 | On confirm the loop calls `create_serfiyyat_document` ONCE PER GROUP and tallies successes and failures, toasting «{ok} sənəd yaradıldı» plus «, {n} xəta ilə (konsola bax)». **The loop is NOT atomic across groups**: each document is atomic in its own transaction, so a mid-loop failure leaves the earlier documents permanently created — D-N3 | 6494-6512 | 2444-2482 | `LIVE VERIFIED` — real UI preview parsed 2 groups; after second project deactivation, exactly 2 create RPCs produced one persisted first document and one refused second group; the first was then deleted |
| M13-71 | Deletion is the module's ONLY `confirm()` prompt and its text states the irreversibility: «Sənəd silinsin? {doc_num} — bu geri qaytarılmır (audit jurnalında iz qalır).». Declining makes no call | 6565-6574 | — | `LIVE VERIFIED` — exact confirm observed and accepted for `SM-2026-000001`; document and line disappeared from both tables |
| M13-72 | The document table is rendered ONLY for an admin, above the report table, with the note «Provedildikdən sonra düzəliş/silinmə yalnız Admin üçündür.»; a non-admin sees no document-level table at all | 6624, 6628 | — | `CODE VERIFIED` |
| M13-73 | Its columns are exactly «Sənəd № · Qaimə № · Tarix · Layihə · Sətir sayı · Cəm · (actions)», sorted by `doc_date` DESCENDING, with the per-document sum taken from the stored `line_sum` values, and «Düzəliş» / «Sil» links in the last cell | 6650-6666 | 180 | `CODE VERIFIED` |
| M13-74 | «Düzəliş» loads that document's existing lines into the draft, forces the segment to `doc` and re-renders; the report tab is left behind, so an admin who was filtering loses no filter state (it lives in `SM.filters`) | 6556-6563 | — | `CODE VERIFIED` |
| M13-75 | `smReportRows()` flattens `DB.smLines` to report rows, dropping a line whose document is missing AND a line whose document's project is outside `smAllowedProjects(false)` | 6577-6591 | — | `CODE VERIFIED` |
| M13-76 | It uses `forWrite = false`, so a rehber — who may write nothing — still sees every active project's rows. Using the write-scoped list here would silently blank the report for a rehber | 6578 | 5755-5757 | `CODE VERIFIED` |
| M13-77 | Each row's «Daxil edən» is `UMAIL.get(created_by) \|\| created_by`, so an unresolved user falls back to the raw uuid — the same rule the audit log uses — and the item name and unit fall back to the raw code and empty string | 6583-6588 | — | `CODE VERIFIED` |
| M13-80 | The report offers exactly fifteen filter inputs in three rows: Tarix (dan/kimi), Layihə, Material, Kontragent; Avtomobil nömrəsi, Alınma kanalı, Qaimə №, Qeyd axtar, Kim daxil edib; Miqdar (min/max), Qiymət (min/max), Cəm (min/max) | 6596-6616 | — | `CODE VERIFIED` |
| M13-81 | Filters apply ONLY on «Filtrləri tətbiq et», which snapshots every input into `SM.filters` (trimming and lower-casing the text ones) and re-renders just the table. The report does NOT filter as you type — there is no debounce on this screen | 6630-6642 | — | `CODE VERIFIED` |
| M13-82 | «Təmizlə» resets `SM.filters` to `{}` and re-renders the WHOLE report block, so every input returns to empty | 6643 | — | `CODE VERIFIED` |
| M13-83 | Filter semantics: date compares ISO strings with `<`/`>`; Layihə and Alınma kanalı compare by EXACT equality against the stored name; Material, Kontragent, Avtomobil, Qaimə №, Qeyd and Kim daxil edib compare by lower-cased SUBSTRING; Miqdar, Qiymət and Cəm compare as numeric ranges | 6669-6689 | — | `CODE VERIFIED` |
| M13-84 | Numeric bounds remain INPUT STRINGS: `''` is falsy and disables its guard, but `'0'` is truthy, so an exact zero bound IS applied through `parseFloat('0')`. Pin with a price/sum fixture containing zero and a positive value: `p2 = '0'` (or `s2 = '0'`) retains only the zero-valued row, while `p2 = ''` retains both. The former D-N4 claim that zero is ignored is withdrawn | 6672-6687 | — | `CODE VERIFIED` |
| M13-85 | The report table columns are exactly «Tarix · Sənəd № · Layihə · Material · Ölçü · Miqdar · Qiymət · Cəm · Kontragent · Avtomobil · Alınma kanalı · Qaimə № · Qeyd · Daxil edən» — fourteen, none right-aligned, rows not clickable — and an empty result renders «Uyğun sətir tapılmadı.» BELOW the (still-rendered) header | 6692-6701 | — | `CODE VERIFIED` |
| M13-86 | The «Yekun» block aggregates the FILTERED rows twice, by project and by material, each summing the stored `line_sum`, and renders both as two side-by-side tables; an empty aggregate renders a single em-dash row | 6703-6711 | — | `CODE VERIFIED` |
| M13-87 | Both aggregates preserve FIRST-APPEARANCE order (`Map` insertion order over the filtered rows), not alphabetical or descending-value order. A test whose fixture is already in insertion order cannot falsify this (protocol §4) | 6703-6710 | — | `CODE VERIFIED` |
| M13-88 | The export builds a TWO-SHEET workbook — «Jurnal» with fifteen columns (Tarix · Sənəd № · Qaimə № · Layihə · Material · Kod · Ölçü · Miqdar · Qiymət · Cəm · Kontragent · Avtomobil · Alınma kanalı · Qeyd · Daxil edən) over the filtered rows, and «Yekun» with the per-project totals — and writes `Serfiyyat_materiallari_{today}.xlsx`. It BYPASSES the shared `xls()` helper entirely: no `toNum` coercion, no column widths, no autofilter, no freeze pane | 6714-6725, 1219-1235 | — | `CODE VERIFIED` |
| M13-89 | When the workbook library is unavailable the export toasts «Excel kitabxanası yüklənmədi» and writes NOTHING. Unlike the shared `xls()`, it has no CSV fallback — D-N7 | 6720, 1220 | — | `CODE VERIFIED` |
| M13-90 | Every write goes through an RPC; the client never INSERTs, UPDATEs or DELETEs any `serfiyyat_*` table directly. All three tables grant `authenticated` only `SELECT`, so a direct PostgREST write is refused for every role INCLUDING admin | 6498, 6544-6545, 6568 | — | `LIVE VERIFIED` — authenticated TEST admin direct POST to `serfiyyat_documents` was refused |
| M13-91 | Server-authoritative role gate on creation, proven by refusal: `create_serfiyyat_document` requires a session AND role ∈ {admin, anbardar} («İcazə yoxdur: Sərfiyyat Materialları sənədini yalnız Admin və ya Anbardar yarada bilər»), then refuses an anbardar whose warehouse does not equal the project's `linked_warehouse` («İcazə yoxdur: yalnız öz layihənizdə sənəd yarada bilərsiniz»). Each must be observed as a SERVER refusal, never inferred from a hidden form | 6254 | 2416-2427 | `CODE VERIFIED` — anbardar foreign-warehouse project was refused through TEST RPC. **OWNER-ACCEPTED SCOPE EXCEPTION (2026-09-11):** the unobserved rehber refusal is non-blocking; no credential guessing is authorised |
| M13-92 | Guard ORDER inside `create_serfiyyat_document`, each refusal attributed to the FIRST guard reached: session/role → project exists and active → anbardar warehouse binding → date present → channel exists and active → at least one line → per line: code non-empty → code exists in `items` → qty matches `^[0-9]+(\.[0-9]+)?$` and is > 0 → price format. **The qty regex rejects a negative, signed or exponent-formatted number outright**, a refusal the browser's own `qty > 0` check can never demonstrate | — | 2416-2474 | `LIVE VERIFIED` — anonymous session, nonexistent project, missing date, unknown/inactive channel, empty lines, empty/unknown code, zero/negative/exponent qty and negative price each refused through TEST RPC; warehouse-binding is separately M13-91 |
| M13-93 | `edit_serfiyyat_document` is admin-only, locks the document `FOR UPDATE`, validates every line in a FIRST PASS before any write, then updates the header and **DELETEs and re-INSERTs every line**. Line ids are therefore NOT stable across an edit; nothing in the browser reveals this | — | 2716-2795 | `LIVE VERIFIED` — authenticated TEST admin edit was read back before cleanup; the line-id set changed |
| M13-94 | All three RPCs write an `audit_log` row with the document id and a fixed reason — «… sənədi yaradıldı», «… sənədi düzəldildi (provedildikdən sonra)», «… sənədi silindi» — the DELETE capturing the full prior document and its lines in `old_values`. Deletion removes the document and cascades its lines, so this audit row is the only surviving trace | — | 2476-2480, 2797-2801, 2535-2537, 5505 | `LIVE VERIFIED` — TEST Supabase Dashboard SQL Editor read `audit_log` under database role `postgres`: 7 INSERT, 2 UPDATE and 7 DELETE rows with the exact fixed reasons; every DELETE `old_values` payload contains the prior header fields plus `lines`. The ordinary TEST admin's zero-row view remains the expected RLS-limited client result |
| M13-95 | Structural isolation: this module writes only `serfiyyat_documents` / `serfiyyat_lines` and NEVER `movements`, so its documents cannot reach balances, the item index, the movements register, stock exports or any stock report. The React port must preserve that separation and must not route these rows through any movement primitive | 6178-6183 | 2445-2473 | `CODE VERIFIED` |
| M13-96 | `serfiyyat_lines.item_code` is a foreign key to `items.code`, so a Sərfiyyat document pins the item rows it references; the qty and price CHECK constraints (`qty > 0`, `price >= 0`) enforce server-side what the browser checks client-side | — | 5363-5365, 5507 | `CODE VERIFIED` |
| M13-97 | The localhost write guard covers all three document writes with their own action names (`sm.create`, `sm.edit`, `sm.delete`), added additively to the `GuardedAction` union, so a stray local write is blocked unless the developer explicitly opts in | — | precedent `mutationGuard.ts` | `CODE VERIFIED` |
| M13-98 | Live evidence boundary, stated not hidden: exercising creation needs a TEST anbardar whose warehouse is linked to an active project, and exercising edit, delete and the admin document table needs a TEST ADMIN identity. Server-authoritative rows are never satisfied by UI observation alone | — | — | `LIVE VERIFIED` — both identities authenticated; an owner-authorised temporary project supplied the binding; write window opened only on 5176 and closed after cleanup |
| M13-99 | CSS dependency, source-verified: of the legacy rules this page needs, only `.row{display:grid;gap:10px}` (111) is absent from `web/src/index.css`; `table`/`th`/`td`/`th.r,td.r`, `.tw`, `label.f`, `.filters`, `.seg`, `.tag` and `.card` are all present. `.row` is load-bearing, not cosmetic: every header, form and filter block is a `.row` with an inline `grid-template-columns`, which does nothing without the `display:grid` declaration | 111, 6271-6283, 6598-6616 | — | `CODE VERIFIED` |

## Authoritative tally

Derived mechanically from the `| M13-* |` rows above; never copied forward.

| Status | Rows |
|---|---|
| `CODE VERIFIED` | **68** |
| `NOT STARTED` | **0** |
| `LIVE VERIFIED` | **9** |
| `IN PROGRESS` | **0** |
| `BLOCKED` | **0** |
| unclassified | **0** |
| **total unique** | **77** |

There are no `NOT STARTED` or `IN PROGRESS` rows. The narrow live T7 leg and
its follow-up server checks promoted M13-52, M13-53, M13-70, M13-71, M13-90,
M13-92, M13-93 and M13-98; dashboard read-back promoted M13-94. M13-91 is
`CODE VERIFIED` under the owner's non-blocking rehber-scope exception; every
other row is `CODE VERIFIED`.

**Correction recorded deliberately (protocol §10, §12).** The first draft of
this ledger's banner, tally table, group paragraph and closing sentence — and
the proposal's link text — asserted **86** rows from an uncounted estimate made
while writing. The mechanical parse returned **77**, and all five locations
were corrected before the plan and handoff audit were written. This is exactly the "never count prose tokens" failure the protocol
names, caught by the checker rather than by inspection; it is recorded here
rather than in a separate audit. The ids are deliberately non-contiguous —
`M13-08/09`, `M13-26…29`, `M13-37/38`, `M13-44…49`, `M13-55…59`, `M13-64` and
`M13-78/79` are unused — so no range may be read as a count.

Row groups, summing to the 77 total, each verified against the parsed id list:
shell/route/role 7 (M13-01…07); readiness/snapshot/store/realtime 10
(M13-10…19); form guards 6 (M13-20…25); form fields and draft lines 12
(M13-30…36, M13-39…43); submit and edit 5 (M13-50…54); imports 10
(M13-60…63, M13-65…70); delete, document table and report scope 7
(M13-71…77); filters and aggregation 8 (M13-80…87); export 2 (M13-88, M13-89);
safety/server/evidence 10 (M13-90…99). **Every range in this paragraph is slice
SCOPE, not a status claim**, and each one is written to exclude the unused ids
listed above (protocol §16).

**SUPERSEDED (implementation, 2026-09-11):** the sentence that stood here said
all 77 rows were `NOT STARTED` because no application code existed. That was
true of the design session and is now false — the code exists and the tally
above is the current, mechanically derived one. No count is carried forward
from Phase 12 or any earlier phase; every figure was re-derived in this
session from the rows above, before and after promotion.
