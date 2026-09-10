# Phase 8 — M8-09 / M8-54 / M8-04 exact-layer transfer fixture live check

Date: 2026-09-09 (Asia/Baku)

Target: TEST Supabase `alkjjbaawmsirsfvqljm`. Production `bbjmhaerssakbreykxiw`
was never contacted — a context-level `route.abort()` guard counted
**0 attempts** in every one of the five browser legs.

One reversible fixture was created and cancelled through the real React UI, as
explicitly authorised. No direct table insert, no SQL fixture, no deletion, no
commit/stage/push/deploy, no I-10 row, no application-code change. `Çap` is
outside acceptance. M8-06 was **not** attempted, per instruction.

## Environment and preconditions

- `web/.env.sandbox.local` → TEST URL only, `VITE_ALLOW_LOCAL_WRITES=false`,
  0 production refs. **The file was never edited.**
- Read-only baseline localhost started as
  `npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175`.
- Write window: that process was stopped, and a temporary process started with
  `VITE_ALLOW_LOCAL_WRITES=true` supplied **only to that process's
  environment**. The in-app banner read `AÇIQDIR`, confirming the flag reached
  the app. It was stopped immediately after closure and the read-only process
  restarted.

Baseline **measured, not assumed**, through the read-only process:

| Precondition | Expected | Measured |
| --- | --- | --- |
| raw movements | ~101 | **101** |
| Test Anbar / `0000001` | 8 | **8** |
| CODEX Phase8 Transfer Anbar / `0000001` | 0 | **0** |
| stock-layer capability | active | **active**, version 36 |
| negative balances | none | **none** |
| İstiqamət selector | empty option only | **1 option, 0 optgroups** |

## The fixture

Created through the real «Yeni əməliyyat» → «Yerdəyişmə» flow. Because layers
are active, the supported flow opened the **LayerPickDialog** and required an
explicit source-layer allocation — so this is a genuine *exact-layer* transfer.

| Field | Value |
| --- | --- |
| RPC | `post_layer_transfer_document`, HTTP **200** |
| document | **`SND-833CFA7E90`** |
| OUT leg (Test Anbar) | `d0f01e27-0f0e-451e-a1aa-37a0720763db` |
| IN leg (CODEX Phase8 Transfer Anbar) | `6c68a39c-181b-4ca5-89c3-51c1edb20d7a` |
| qty | **0.01** (condition bucket `icare`, `step="0.01"`) |
| source layer allocated | `b633360d-5035-4ed2-83c0-90f9d0f7e912`, qty 0.01 |
| request key (idempotency) | `ededd1f6-39b5-4c9a-ae0c-8c2e7284c677` |
| layer_version | 36 |
| unique identity | Qaimə № / note stamp `M851TMTTZY2EN` |

Exactly **one** write RPC was issued in the creation leg. Raw movements
101 → **103**.

---

## M8-09 — grouped selector and invalid-selection reset: **LIVE VERIFIED**

Ledger contract: grouped İstiqamət/kontragent select, rebuilt from the filtered
set, invalid selection reset.

With the transfer active the selector gained **two** options where the baseline
had none — one per leg, since the two legs carry different `partner` texts:

| Optgroup | Option key | Label |
| --- | --- | --- |
| «Tanınmayan / köhnə idxal» | `raw:CODEX Phase8 Transfer Anbar anbarına` | `CODEX Phase8 Transfer Anbar anbarına` |
| «Tanınmayan / köhnə idxal» | `raw:Test Anbar anbarı` | `Test Anbar anbarı` |

The group is `raws`, **not** `routes` — see the M8-54 finding below for the
proved reason. The grouping is itself correct for this data.

| Step | Action | Observed |
| --- | --- | --- |
| 4–5 | selected `raw:CODEX Phase8 Transfer Anbar anbarına` through the real control | table narrowed to **exactly 1 row**, the OUT leg, invoice `M851TMTTZY2EN`, `doc_num SND-833CFA7E90` — identity matches the new document |
| 6–7 | applied type filter `Silinmə`, which legitimately removes that key from the option source | selector **auto-reset to `""`**, all optgroups disappeared, and the table re-filtered on the **resolved** value — 1 `Silinmə` row, NOT an empty result |
| 8 | cleared the type filter and reselected the route | selection restored, 1 row again |

Step 6–7 is the contract's core claim: the control and the rows never disagree.
Had the stale key still been applied while the select rendered «all», the table
would have shown 0 rows. It showed the correctly resolved set instead.

## M8-54 — `transferRoute` / `movKey` / `movKeyLabel`: promoted per branch

Expectations were computed **independently** in the harness by reimplementing
`normWhName` / `resolveWh` / `transferRoute` / `movKey` / `movKeyLabel` from the
legacy rules. The application helpers were **never imported or called**.

| Leg | independently expected `transferRoute` | DOM «İstiqamət / Kontragent» cell | equal |
| --- | --- | --- | --- |
| `d0f01e27…` (OUT) | `Test Anbar → —` | `Test Anbar → —` | **YES** |
| `6c68a39c…` (IN) | `— → CODEX Phase8 Transfer Anbar` | `— → CODEX Phase8 Transfer Anbar` | **YES** |

| Leg | expected `movKey` | selector option key | equal |
| --- | --- | --- | --- |
| `d0f01e27…` | `raw:CODEX Phase8 Transfer Anbar anbarına` | same | **YES** |
| `6c68a39c…` | `raw:Test Anbar anbarı` | same | **YES** |

`movKeyLabel()` equality was proved through the rendered option text
(`CODEX Phase8 Transfer Anbar anbarına`), and the key was proved to *drive
filtering*, not merely to display — selecting it produced the expected
single row.

### Why the route resolved to `—`, proved rather than assumed

`normWhName()` strips ONE trailing «anbar / anbarı / anbarına» token. Both TEST
warehouses are themselves **named** «… Anbar», so the warehouse's own name loses
its last word while the partner text keeps one:

| Input | normalised |
| --- | --- |
| warehouse `Test Anbar` | `test` |
| partner `Test Anbar anbarı` | `test anbar` |
| warehouse `CODEX Phase8 Transfer Anbar` | `codex phase8 transfer` |
| partner `CODEX Phase8 Transfer Anbar anbarına` | `codex phase8 transfer anbar` |

So `resolveWh()` returns null for the far side and the route half-resolves,
which `movKey()` deliberately routes to the `raw:` bucket rather than merging
under «—». **This is a TEST-data naming artifact, not a production defect:** the
five real warehouses (`Ələt`, `Astara`, `Xocahəsən`, `Harmony`, `Ofis`) do not
end in «Anbar», and the same independent computation resolves
`Ələt` ↔ `Ələt anbarına` correctly. No application code was changed to force a
`route:` result, and no warehouse was renamed to manufacture one.

**Promoted to LIVE VERIFIED by this fixture:**

- `transferRoute()` — both **half-resolved** branches (`own → —` and
  `— → own`), which is exactly what this data exercises;
- `movKey()` — the `raw:` branch, including its deliberate refusal to merge a
  half-resolved route;
- `movKeyLabel()` — via the rendered option label, and as the live filter value.

**Still CODE VERIFIED, deliberately NOT promoted:** `transferRoute()`'s
**fully-resolved** `A → B` branch and `movKey()`'s `route:` branch. They need a
warehouse whose name does not end in «Anbar», which TEST does not have. No such
warehouse was created.

## M8-04 — channel suppression: stays **PARTIAL**, honestly

Both legs render `—` in the «Kanal» cell. But the raw response carries
`channel: ""` on both, and the posting payload sent `channel: ""` — the
supported transfer flow has no channel input.

The ledger's rule (`index.html:1811-1814`) suppresses a channel that is
**non-empty AND resolves to a warehouse** on a `Yerdəyişmə` row. An empty
channel renders `—` through the ordinary empty-value path, which is a different
branch. Per instruction, **suppression of a non-empty warehouse-valued channel
is NOT claimed** and M8-04 retains its PARTIAL status for that exact branch.
The em-dash outcome is consistent with the contract but does not prove it.

## Net-zero closure

Cancelled through the real document card control «Yerdəyişməni ləğv et».

| Proof | Observed |
| --- | --- |
| RPC routed | **`cancel_layer_transfer_document`**, HTTP **200** |
| argument name | **`p_doc_num`** (not `p_original_doc_num`) — deviation `D-I1` confirmed live |
| reversal document | **`SND-R-0F906E6B89`**, `row_count` 2 |
| reversal legs | `36565406…` (dest OUT 0.01), `ccec25a0…` (source IN 0.01) |

| Balance check | Baseline | Final | Restored |
| --- | --- | --- | --- |
| Test Anbar / `0000001` | 8 | **8** | YES |
| CODEX Phase8 Transfer Anbar / `0000001` | 0 | **0** | YES |
| negative balances | none | **none** | — |

**Raw movements 101 → 105 (+4), and that is correct.** Movement rows are
immutable audit history: the 2 original legs and the 2 reversal legs are all
retained. Net-zero means inventory/layers/balances, **not** row deletion. No row
was deleted and no count was claimed to return to 101.

Post-cancellation refresh (step 6–7 of the closure): the selector fell back to
**0 optgroups and the empty option only**, its value `""`, and the table
returned to the baseline **3** operational rows — so the cancelled fixture no
longer supplies an active route option, and the now-invalid key resolved to all
without leaving the control and the rows disagreeing.

## Dataset separation

| Dataset | Baseline | With fixture | After cancellation |
| --- | --- | --- | --- |
| RAW movements | 101 | 103 | **105** |
| OPERATIONAL / RENDERED rows | 3 | 5 | **3** |
| selector options (excl. empty) | 0 | 2 | **0** |

## Reconciliation

- Write RPCs, total: **exactly two** — `post_layer_transfer_document` and
  `cancel_layer_transfer_document`, both HTTP 200. No other mutation, no direct
  table write, no fixture SQL.
- Production contact attempts: **0** across all five browser legs.
- Every session ended through the real «Çıxış»; no active device session.
- `web/.env.sandbox.local` never edited: `VITE_ALLOW_LOCAL_WRITES=false`,
  TEST ref, 0 production refs.
- Localhost restarted read-only, `--mode sandbox`, HTTP **200**, no write flag
  in the process command line.
- Nothing staged; 24 modified tracked files, identical to the pre-run list; no
  application source file touched (verified by mtime).

## Verdict

- **M8-09 → LIVE VERIFIED** (grouping, selection, invalid-selection reset, and
  the resolved-value re-filter).
- **M8-54 → PARTIAL, advanced.** `transferRoute()` half-resolved branches,
  `movKey()`'s `raw:` branch and `movKeyLabel()` are now live; the
  fully-resolved `route:` branch remains CODE VERIFIED and is unreachable with
  current TEST warehouse names.
- **M8-04 → PARTIAL, unchanged** for channel suppression: the supported flow
  produces an empty channel, so the non-empty suppression branch is not proved.
