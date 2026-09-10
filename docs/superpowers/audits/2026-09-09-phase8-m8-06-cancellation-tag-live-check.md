# Phase 8 — M8-06 «ləğv edilib» tag, live check + contradiction resolved — 2026-09-09

Scope: `M8-06` only — the «ləğv edilib» tag rendered in the İstiqamət cell of
«Mal hərəkəti», driven by `cancelledDocFor()` over the **RAW** movement set
(`MovementsPage.tsx:834`, `:850`; legacy `index.html:1810`, `4900-4909`).

Read-only against TEST `alkjjbaawmsirsfvqljm`. **No TEST write, no database
fixture, no source change, no commit, no deployment, no I-10 row.** Çap remains
outside acceptance.

---

## 1. The contradiction, and which side was right

Two prior statements disagreed:

- **M8-05 (latest)** recommended M8-06 next, on the grounds that cancellation
  markers already exist in TEST.
- **M8-51 handoff** stated no currently surviving operational row carries a
  tag-capable marker relationship.

Both were recomputed from the current raw **109**-row TEST snapshot, without
importing or calling `cancelledDocFor()` or `excludeCancelled()`.

**M8-51 was correct. The M8-05 recommendation was wrong**, and it was wrong for
a specific, structural reason rather than a counting error. M8-05's premise is
true — markers do exist, 53 of them — but the inference from "markers exist" to
"a tag is reachable" does not hold.

### The structural exclusion (derived, then measured)

For a row that **has** a `doc_num`, the two helpers are driven by the *same*
marker:

- `excludeCancelled()` hides the source when a marker `Ləğv: <doc>` exists —
  but only via `if (docMatch && doc)`, where `doc` is the **marker row's own**
  `doc_num` (`operationalMovements.ts:37`).
- `docCancelledBy()` / `cancelledDocFor()` has **no such guard**: it matches the
  marker note alone (`documentCancelState.ts:96`).

So whenever a marker carries its own `doc_num`, it both produces the tag **and**
removes the row that would display it. The row is never rendered, and the tag is
unobservable. A doc'd row cannot be simultaneously operational and tag-positive.

The **only** shape that escapes this is a marker row **without** a `doc_num`:
`hiddenDocs` stays empty so the source survives, while `docCancelledBy()` still
finds it and returns the `'—'` fallback documented at `documentCancelState.ts:64-68`.
That is exactly the "historical marker shape current cancellation RPCs may not
produce" the handoff referred to, and
[the marker-contract cross-check](2026-09-08-phase8-marker-contract-crosscheck.md)
confirms all four server-written shapes carry a generated `doc_num`.

---

## 2. Leg A — real TEST preflight (read-only)

Real React UI, real TEST admin login, «Mal hərəkəti» opened. The full-column
snapshot GET was captured verbatim:

```
GET /rest/v1/movements?select=id,item_code,warehouse,date,in_qty,out_qty,price,
    partner,type,invoice_num,note,doc_num,created_at,channel,contract_num,
    created_by&order=date.asc,created_at.asc&offset=0&limit=1000   → 200, 109 rows
```

> A first pass reconstructed from the **narrow** marker-column response
> (`id,note,doc_num,warehouse,partner,channel`), which has no `type`. That
> silently bypasses the `CANCELLABLE_TYPES` branch, so it could not support a
> negative claim. The run was repeated against the full-column payload; every
> number below is from that payload.

Independently reconstructed (harness reimplementation, application helpers never
imported):

| quantity | value |
| --- | --- |
| RAW rows | **109** |
| OPERATIONAL (independent `excludeCancelled` equivalent) | **3** |
| DOM rendered rows | **3** |
| whole-document markers `Ləğv: <doc>` | 25 |
| row-level markers `Ləğv ID: <uuid>` | 12 |
| transfer reversal markers `Ləğv (əks yerdəyişmə)…` | 16 |
| markers **without** their own `doc_num` (tag-capable) | **0** |

Per-row expected tag, over the three surviving rows:

| id | doc_num | type | expected tag |
| --- | --- | --- | --- |
| `43036d8e-6bfe-421f-a23a-ed7efd77736c` | `TEST-IN-1` | Alış | null |
| `bd8369ee-f802-4cc5-b735-48b784b98b59` | `TEST-OUT-1` | Silinmə | null |
| `27dbfbe2-21a7-4267-a14d-07bba2026816` | `TEST-IN-2` | Alış | null |

**The decisive measurement:** **44** raw rows have a non-null
`cancelledDocFor()` — the markers really are plentiful, as M8-05 said — but
**0 of those 44 are operational**. Every one is removed by the same marker that
tags it.

DOM comparison agreed element-by-element: the tag was scoped to the İstiqamət
cell (`td[5] span.tag.t-rm`), all three route cells read `—` with zero tag
spans.

> Scoping matters: a raw `span.tag.t-rm` query also matches the **type** tag
> («Silinmə» uses the same class), which produced a false positive in the first
> pass. Only the İstiqamət-cell occurrence is the M8-06 tag.

**Explicit answer: no real operational row on the current TEST backend is
tag-positive.** Per instruction, no database fixture was created and no
real-backend branch coverage is claimed.

---

## 3. Leg B — browser-only historical presentation fixture

Only the exact full-column `movements` GET was intercepted. Auth, every `/rpc/`,
`items`, `warehouses` and `writeoff_valuations` were never intercepted. Nothing
was sent to Supabase and nothing was persisted. StrictMode duplicates were
handled by returning the identical body for every request of the logical load
(4 intercepted requests = 2 offsets × StrictMode).

Fixture — two rows, browser-only ids/documents prefixed `M806`:

| role | id | doc_num | type | note | partner |
| --- | --- | --- | --- | --- | --- |
| source | `M806-SRC-0000-0000-000000000001` | `M806-SRC-DOC-1` | İcarə | `M806 source` | `M806 Tərəfdaş` |
| marker | `M806-MRK-0000-0000-000000000002` | **null** | İcarə | `Ləğv: M806-SRC-DOC-1` | `M806 Marker` |

The marker's null `doc_num` is the whole point: it is discoverable in the RAW
set while leaving the source operational, per §1.

### Positive assertions — all held

- Source row **rendered** (1 row in the table).
- Marker row **not rendered** as a live movement (0 rows matching `M806 Marker`).
- Source row's İstiqamət cell rendered exactly **`ləğv edilib`** in a
  `span.tag.t-rm`; full cell text `M806 Tərəfdaş ləğv edilib`.
- **Fallback label `—`** as the ledger specifies: the marker carries no
  `doc_num`, so `docCancelledBy()` returns `'—'` rather than a document number.
- Full rendered row:
  `01.09.2026 · Test Anbar · 0000001 · TEST Mal 1 · İcarə · "M806 Tərəfdaş ləğv edilib" · — · — · 5.00 · — · 10.00 · 50.00 ₼ · M806 source`
- No error banner.
- **Relationship proved by exact values:** the tag depends on the marker note
  `Ləğv: M806-SRC-DOC-1` matching the source's `doc_num` `M806-SRC-DOC-1`
  exactly — see the negative control.

### Negative control — held

The **same** payload with **only the marker relationship removed**: the marker
row's note changed `Ləğv: M806-SRC-DOC-1` → `M806 neytral qeyd`. The source row
is **byte-identical** in every field.

- Source row still visible, same rendered identity
  (`01.09.2026 · Test Anbar · 0000001 · TEST Mal 1 · İcarə`).
- Its tag span count went **1 → 0**: «ləğv edilib» disappeared.
- The marker row now renders as an ordinary movement (2 rows), which is correct —
  a non-marker note is not stripped.

Because the surviving row is the same rendered identity in both legs, the result
cannot be explained by filtering or by a different row.

### RAW-versus-operational contract — held

A third payload contained **only the source row** — i.e. what the screen would
see if the tag lookup were fed the *operational* set instead of the RAW one:

- source row rendered, tag span count **0**.

So the marker row is **required** for the tag, and it is a row that
`excludeCancelled()` would have removed. Demonstrated purely through
payload→DOM correlation; no internal helper was called from the harness.

---

## 4. Recovery

Interception removed, real remount triggered:

- real raw counts returned to **109, 109, 109, 109** (2 logical loads ×
  StrictMode) — the re-measured baseline, matching the expected 109;
- rendered rows back to **3**, **identical to the initial real snapshot**
  (cell-by-cell string equality asserted, not merely equal counts);
- **no `M806` string anywhere in the DOM**;
- **no «ləğv edilib» anywhere in the DOM**;
- no error banner.

Both sessions ended through the real «Çıxış».

---

## 5. Safety

- 0 production contact attempts; a blanket route aborted anything containing
  `bbjmhaerssakbreykxiw` and the counter stayed **0**.
- Real TEST movement count **unchanged at 109** (measured before and after).
- **No mutation RPC.** All non-GET database requests were read RPCs
  (`get_reference_values`, `stock_layers_supported`, `get_user_directory`) or
  session bookkeeping (`register_session`, `touch_session`) — POST is Supabase's
  RPC transport, not a write. No cancellation or posting RPC appears.
- No active device session remains.
- localhost `127.0.0.1:5175`, `--mode sandbox`, HTTP **200**,
  `VITE_ALLOW_LOCAL_WRITES=false` (`.env.sandbox.local` never edited).
- Nothing staged; the 213-entry dirty tree preserved; no application source
  touched; no I-10 row.
- Focused tests: `documentCancelState`, `operationalMovements`, `batchCancel` —
  **78 passed / 3 files**.

---

## 6. Acceptance effect

**`M8-06` → LIVE VERIFIED** for the React presentation contract, recorded on the
same basis as `M8-11`: proved through the real React screen using a **controlled
browser-only presentation fixture**.

Explicitly **not** claimed:

- not a stored TEST fixture and not backend-generation proof;
- **no claim that current RPCs generate this marker shape** — the cross-check
  shows all four server shapes carry a `doc_num`, so the doc-less shape is
  *historical*, and reaching the tag from live data would require such a row to
  exist;
- the real-backend branch remains unexercised, by design: no database fixture
  was created.

The residual real-data gap is recorded rather than closed: on the present TEST
snapshot the tag is **structurally unreachable**, not merely absent.

Phase 8 remains **NOT ACCEPTED**.
