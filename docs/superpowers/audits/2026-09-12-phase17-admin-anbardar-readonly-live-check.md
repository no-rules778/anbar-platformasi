# Phase 17 — admin/anbardar read-only live check

Date: 2026-09-12 · Environment: TEST `alkjjbaawmsirsfvqljm` only · Verdict:
**8 presentation/TEST-state rows LIVE VERIFIED; server/catalog rows unchanged**

## Correction to the earlier boundary report

The preceding identity-boundary report was true only for its Claude process,
not for the project as a whole. The owner had already supplied TEST credentials
in the active conversation, and Codex had browser automation. The password was
used only in browser memory and is not reproduced in this audit, a file, a
command, a screenshot or a log.

## Live observations

The React app ran from this exact tree with `--mode sandbox` on
`127.0.0.1:5176`; `.env.sandbox.local` targeted TEST and kept
`VITE_ALLOW_LOCAL_WRITES=false`.

| Leg | Observed result |
|---|---|
| TEST admin | Authenticated as Admin; the sole «Azpetrol / Araz» entry appeared in its own «Yanacaq» rail group after «Nəzarət və risklər» and before «Sistem». |
| Azpetrol | Exact title/subtitle; empty card, movement and module-audit states; all money figures 0.00 ₼; Azpetrol selected by default. |
| Araz switch | A real click replaced the subtitle and board with Araz; exactly one board remained rendered; the same three collections were empty and the application balance was 0.00 ₼. |
| TEST anbardar | Authenticated as Anbardar; the rail entry was absent. The direct retained `azp` page state showed only «Giriş yoxdur Bu modul yalnız Admin, Rəhbər və Mühasib üçün açıqdır.» and no board or write controls. |
| Session closure | Both authenticated sessions ended through the real «Çıxış» flow. |

Promoted: M17-01, M17-02, M17-06, M17-07, M17-08, M17-09, M17-10 and
M17-110.

## Claims deliberately not made

- M17-17 and M17-19 remain BLOCKED: UI behaviour cannot establish function
  bodies, `SECURITY DEFINER`, grants, revokes or catalog state.
- M17-18 remains BLOCKED: the observed allowed/refused presentation is only a
  behavioural half, not proof of the exact four RLS policies.
- M17-20 remains BLOCKED: the anbardar was rejected by the client role gate.
  Because the gate prevented the four reads, this run did not exercise the
  server refusal contract.
- M17-21 remains BLOCKED: no rehber/muhasib identity and no refused write RPC.
- M17-28 remains BLOCKED: the admin board loaded, but this run did not capture
  a falsifiable network request list. Source/unit evidence remains CODE-level;
  successful rendering is not substituted for network evidence.
- M17-80…M17-89 and M17-100 remain untouched: no mutation, fixture, import,
  deletion or real-data export occurred.

## Safety and reconciliation

No write control was pressed. No mutation RPC, REST write, fixture, import,
delete or export occurred. Production `bbjmhaerssakbreykxiw` was never opened
or contacted. The dedicated dev server was stopped after logout. No secret was
persisted. Staging remained empty and the pre-existing dirty tree was preserved.

Mechanical result after the eight promotions: **85 CODE VERIFIED / 8 LIVE
VERIFIED / 0 IN PROGRESS / 0 NOT STARTED / 17 BLOCKED / 0 unclassified / 110
unique**. Phase 17 remains **NOT ACCEPTED** pending the remaining authority-
gated evidence and final acceptance decision.
