import { create } from 'zustand'

/* M16-11 — the Settings→page export delegation.

   Legacy `rSet()` (index.html:7197) does NOT re-derive any export. Each
   `[data-exp]` button navigates and then clicks the destination page's OWN
   export button:

     mov: () => { go('mov'); setTimeout(() => $('#mov-exp').click(), 50); }

   That `setTimeout` is a DOM-readiness hack, not behaviour: the legacy page
   is rendered synchronously by `go()`, and the 50 ms delay only waits for the
   button to exist. Reproducing the timeout here would reintroduce a race that
   React does not need and that no test could make deterministic.

   Instead this store records a PENDING export target, exactly the way
   `operation.store`'s `pendingPrefill` records a pending item pick (M5-55 /
   M7-115): Settings sets the target FIRST and switches the page SECOND, and
   the destination page consumes it once on arrival by calling the export
   function it already owns.

   Load-bearing consequence: there is no second export implementation. The
   matrices stay in `movementExport`, `balanceExport` and `xls`
   (`nomenclatureExportMatrix`), each still invoked through its own page's
   gating (`canExport`). A Settings-initiated export is therefore identical to
   the user pressing «Excel» on the destination page — including the case
   where that page refuses because no complete snapshot has loaded yet. */

/** The pages whose «Excel» button Settings can reach. */
export type ExportTarget = 'mov' | 'bal' | 'nom'

interface ExportRequestStore {
  /** The page whose export should run once it mounts; null when idle. */
  pending: ExportTarget | null
  /** Settings records the intent before navigating. */
  request: (target: ExportTarget) => void
  /**
   * Clears the intent. The destination page calls this as it runs the export,
   * so a later remount (a rail click, a refresh) does NOT export again — the
   * same one-shot rule `consumePrefill` enforces.
   */
  consume: () => void
}

export const useExportRequestStore = create<ExportRequestStore>((set) => ({
  pending: null,
  request: (target) => set({ pending: target }),
  consume: () => set({ pending: null }),
}))
