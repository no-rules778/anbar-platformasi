# I-8 TEST-only browser export evidence — 2026-09-07

Executed by Codex under the user's authorization to perform the next read-only/export step, reaffirmed as **anbar-test only**. Phase 8 remains NOT ACCEPTED; Group B writes remain unauthorized.

## Environment and safety

- No server was listening on ports 5173–5180. Started the existing Vite app in sandbox mode on loopback port 5175, with process-local `VITE_ALLOW_LOCAL_WRITES=false`. No env or package file changed. Server left running for the user.
- Opened `http://localhost:5175/` in the in-app browser. Existing admin session restored; no credential entered or reset.
- Confirmed `alkjjbaawmsirsfvqljm.supabase.co` from the browser's observed resource inventory (resource-backed Supabase requests), not merely an env file. No production application was opened for this check.
- UI explicitly displayed the all-writes-blocked notice. No posting, editing, cancellation, SQL, fixture creation or deployment was performed. Ordinary authentication/session activity and application reads occurred.

## Executed results

| Check | Result and evidence scope |
|---|---|
| A1 | PASS for current admin dataset: 5 movements, inbound 17, outbound 3, inbound value 186 AZN. File values reconcile: 1+5+1+10=17; outbound 3; amounts 12.5+62.5+11+100=186. |
| A2 | PASS: actual Excel button downloaded `C:/Users/HP/Downloads/mal_hereketi_2026-09-07.xlsx` (20,034 bytes). One `Hesabat` sheet, A1:O6, 15 exact expected headers and 5 body rows. Browser download-event waiter timed out, but the downloaded file was present with the current timestamp and independently read successfully; no success inferred from the waiter. |
| A4 | PASS at file-content level: displayed codes 0000002/0000001 became numeric 2/1, the documented inherited conversion. |
| A5 | PARTIAL: existing Silinmə row has outbound 3 and blank price/amount in the file, matching the screen's unavailable-value display. No stored non-null valuation branch was established by this check. |
| A6 | PASS: search `CODEX-NO-MATCH-I8-20260907` produced zero rows; clicking Excel downloaded `C:/Users/HP/Downloads/mal_hereketi_2026-09-07 (1).xlsx` (17,418 bytes). One Hesabat sheet with used range A1:O1 and the same 15 headers, no data rows. Browser-added duplicate filename suffix is expected. Search reset afterwards; full 5-row view restored. |

Downloaded files were inspected read-only using the bundled spreadsheet library, with raw XLSX XML inspection for native metadata. The full file has autoFilter A1:O6, 15 column-width records and no pane element (inherited behavior). Files were not rewritten.

SHA256 full: `a0aa03a7aca69732957a69a7360049a457ffb51b0823b0fb13ad593801e9c085`.

SHA256 empty: `8e0e8024c389502fb6ccde29cc954f22c99c46837da34759af0ff8fabc0dec94`.

## Not executed / not claimed

- A3 was initially NOT EXECUTED by Codex; subsequently passed through user execution, screenshots and explicit confirmation, as recorded below.
- A1b: >3000-row live cap scenario NOT EXECUTED; current dataset has five rows.
- A7: other roles NOT EXECUTED. No accounts or roles changed.
- A8: allocation schema/RLS inspection NOT EXECUTED; outside this narrow download check.
- No Group B writes, correction audit check or deployed atomicity verification. No whole-module or whole-row promotion from this partial evidence.

## A3 follow-up — user-executed Microsoft Excel check

The user opened the downloaded files in Microsoft Excel. Screenshot
`codex-clipboard-27ab2b69-cdc0-4661-a3b1-d584fa65e67c.png` shows the header-only
file, Hesabat sheet and open filter menu. Screenshot
`codex-clipboard-d3acb2fe-db2d-4af2-91f9-ac763eaf2085.png` shows the full report,
Hesabat sheet, five body rows, readable visible headers/numbers and filter
buttons. Column O was offscreen in that image; after being asked to check it,
the user explicitly confirmed that everything is readable and Excel did not
offer to restore or repair the file.

**A3 PASS — user-executed, screenshot-supported, with user confirmation for
offscreen readability and absence of a repair prompt.** Not agent-operated
Excel verification. This closes the visual check for the current exported
TEST files only. Other remaining checks and Phase 8 NOT ACCEPTED are unchanged.
