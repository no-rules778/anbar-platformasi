/* The «Hamısını göstər» cut — cut()/cutNote() (index.html:1678-1690).

   Nomenklatura does NOT use the numbered pager that Soraqçalar and Audit
   jurnalı use: it renders the first SHOW_MAX rows and offers one button that
   reveals the rest, with the choice sticky until a filter changes. Approved
   as-is (Phase 5 Q3) — parity outranks internal consistency here. */

/** `SHOW_MAX` — index.html:1678. */
export const SHOW_MAX = 3000

export function applyCut<T>(rows: T[], showAll: boolean): T[] {
  return showAll || rows.length <= SHOW_MAX ? rows : rows.slice(0, SHOW_MAX)
}
