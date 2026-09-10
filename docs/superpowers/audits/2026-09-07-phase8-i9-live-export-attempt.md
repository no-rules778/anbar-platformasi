# I-9 TEST live export attempt — 2026-09-07

## Current result: scoped Chrome download and workbook-content checks PASS

The initial in-app attempt below remains chronological evidence. It was followed by the successful Chrome check recorded at the end. Native Excel verification and broader I-9 gates remain open.

No acceptance or registry-row promotion. Phase 8 remains NOT ACCEPTED.

### Observed

- The existing in-app localhost:5175 tab retained an older running page: it had ordinary Excel but no Silinmə report button. No listener existed on port 5175. Current repository source already contained the new report button.
- Started the existing Vite dev script from the current repository `web/`, using sandbox mode, loopback 127.0.0.1, port 5175, strictPort. Set process-only `VITE_ALLOW_LOCAL_WRITES=false` and `VITE_SUPABASE_URL=https://alkjjbaawmsirsfvqljm.supabase.co`. No environment file edited.
- Reloaded the tab. Observed Supabase resource hosts were exclusively `alkjjbaawmsirsfvqljm.supabase.co`. Soraqçalar displayed its write-blocked notice.
- Current UI now includes Silinmə hesabatı: disabled for all types, enabled after selecting Silinmə and finishing load.
- Visible filtered set: one row, 2026-09-02, Test Anbar, code 0000001, TEST Mal 1, outgoing quantity 3, price and amount shown unavailable, note Synthetic outgoing, recorder anbar-admin-test@example.com.
- Clicked the report. An observed resource request targeted TEST `/rest/v1/stock_layer_allocations`. A subsequent observed toast said `Silinme_hesabati.xlsx yükləndi (1 sətir)`.
- No resulting Silinme workbook was located in Downloads or the scoped temporary/workspace filename search. The browser download-event wait timed out. A control click on ordinary Excel also displayed its success toast without a new file appearing in Downloads. These observations do NOT prove the report itself is defective, nor do success toasts prove a file was saved.
- Opened a separate Chrome localhost test tab to isolate browser download handling. Chrome requires its own login; the existing in-app session is not shared. Stopped at login without attempting an unknown password or copying authentication tokens.

### Boundaries and remaining work

No business write action, fixture, cancellation, correction, SQL, schema/RLS, application-code edit, commit or deployment was performed. Normal app session RPCs (`register_session` / `touch_session`) appeared in the resource inventory; therefore this record does not claim that zero database-side session metadata effects occurred.

Next: user signs in to TEST localhost in the prepared Chrome tab; Codex resumes the real report download and inspects that exact file. Verify the 17-column main sheet, code leading zeros, quantity 3, unavailable numeric cells remaining blank, recorder and optional source-sheet scope. Do not mark I-9 fully LIVE VERIFIED from this single-row admin case. Layered rows, other roles, large pagination and native Excel checks remain separately scoped.

The local server was left running for continuation. The in-app tab remains on filtered Silinmə. Production was not opened or operated.

## Follow-up: Chrome download after user login — PASS, narrow scope

The user completed login in the prepared Chrome localhost tab. Admin UI, write-blocked notice, and observed TEST-only Supabase resource host were verified again. Opened Mal hərəkəti, selected Silinmə and downloaded once through the real report button.

Actual file: `C:/Users/HP/Downloads/Silinme_hesabati_2026-09-07.xlsx`, 18113 bytes, SHA256 `EDDFCEE67D2CBE53E0A1F64167C12EE7590CC69E77832EFFE646716F14082DC1`.

Read-only Artifact Tool import and independent ZIP/XML inspection agree:

- One worksheet, `Silinmə hesabatı`, A1:Q2, 17 headers and one data row.
- A2 `TEST-OUT-1`; B2 `2026-09-02`; C2 `Test Anbar`; D2 text `0000001` (leading zeros retained); E2 `TEST Mal 1`; F2 `ədəd`; G2 numeric 3.
- H2/I2/J2 are omitted cells, not zero. K2 is a genuine numeric 0; L2 numeric 3; M2 `legacy`. N2/O2 omitted. P2 `Synthetic outgoing`; Q2 mapped recorder `anbar-admin-test@example.com`.
- No source-lot worksheet exists in this actual artifact. This does not verify populated/layered source-sheet behavior or prove database-wide absence of allocations.
- No workbook mutation or re-export during inspection. Native Excel opening/rendering was not performed in this follow-up.

Also selected a no-match search under Silinmə, observed zero rows, clicked the report and observed `Seçilmiş filtrlərə uyğun silinmə qeydi yoxdur`. No additional Silinme workbook appeared in Downloads. Cleared the temporary search afterwards.

The successful Chrome download narrows the earlier missing-file symptom to the in-app download path for these attempts; its internal cause is not established. Application code was not changed to work around it.

Remaining after the Chrome check: native Excel readability/no-repair check on this exact file, populated source-lot paths, other roles and existing large-data/concurrency gates. No blanket I-9 LIVE VERIFIED or Phase 8 acceptance. This follow-up supersedes the earlier instruction to log in and perform the first download.

## User-operated native Excel confirmation — PASS (2026-09-07)

The user explicitly identified the downloaded `C:/Users/HP/Downloads/Silinme_hesabati_2026-09-07.xlsx` and confirmed: «всё читается и нет предложения восстановить файл».

This closes native Excel readability/no-repair for this specific one-row report, based on user observation, not Codex-operated Excel inspection. No new hash or screenshot was supplied and no independent native-app observation is claimed. No need to repeat this check on the unchanged artifact.

Populated source-lot paths, other roles and existing large-data/concurrency gates remain open. Phase 8 remains NOT ACCEPTED. Documentation only.
