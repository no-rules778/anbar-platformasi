# Phase 8 M8-21/M8-30 legacy reversal classification — live TEST check

Date: 2026-09-08  
Environment: TEST project `alkjjbaawmsirsfvqljm`, authenticated admin, local
React application on `127.0.0.1:5175`, writes disabled.

## Finding

The real batch-cancellation matrix listed generated legacy-transfer counter
document `SND-LR-AE5EEE3FF0` as selectable with status
`Yerdəyişmə — ləğv edilə bilər`. The document is the already-proved reversal
created by `cancel_legacy_transfer`; both of its rows carry the canonical
server marker `Ləğv (əks yerdəyişmə) ID: <source-id>:<paired-id>`.

The client recognised `Ləğv (əks yerdəyişmə): <doc>` but not the legacy-pair
`... ID:` form in two places:

- `buildBatchDocs()` therefore offered the terminal counter-document for batch
  selection;
- `isReversalDoc()` would report the same numbered counter-document as open in
  a transfer document view.

No cancellation was submitted while diagnosing this finding.

## Correction

The transfer reversal prefix in `documentCancelState.ts` now recognises both
server marker shapes. The batch reversal matcher now recognises ordinary,
numbered-transfer and legacy-transfer counter markers. The ordinary
`Ləğv ID:` row-level marker was deliberately not broadened: it is also used by
same-document row cancellation and cannot by itself classify that whole
document as a reversal.

Regression coverage was added at the state, document-view and batch-matrix
levels.

## Verification

- focused pure tests: 107/107 passed;
- expanded movement/document/batch tests: 270/270 passed;
- production build: PASS (`tsc -b && vite build`); the existing >500 kB chunk
  advisory remains non-fatal;
- real React batch dialog after hot reload: `SND-LR-AE5EEE3FF0` remained
  visible, its checkbox was disabled, its status became
  `Əks/ləğv sənədi — ləğv edilmir`, and `Davam et` remained disabled;
- no submit occurred and no business mutation was made by this check.

## Scope

This closes the observed legacy-transfer reversal-classification gap for the
TEST-admin React matrix and pins the same document-view state in tests. It does
not promote other roles, stale/transport/concurrency paths, server refusal
shapes or Phase 8 as a whole. Phase 8 remains **NOT ACCEPTED**.
