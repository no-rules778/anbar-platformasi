/* Azpetrol / Araz — module identity and labels (M17-49, M17-50, M17-51).

   Ported from index.html:8074-8082 and 8112-8121.

   The two boards are separate accounting spaces that happen to share a table.
   Every azp function takes a mandatory module argument and `azpMod()` throws
   on anything else, so a typo can never silently select the wrong board. That
   throw is a CLIENT guard; the server repeats it in `azp_check_module()`
   (sql/020 §5), and only the server one is authoritative. */

export const AZP_MODULES = ['azpetrol', 'araz'] as const

export type AzpModule = (typeof AZP_MODULES)[number]

export interface AzpLabel {
  title: string
  /** The outgoing-operation label: Azpetrol fuels («Y/D»), Araz spends. */
  out: string
  /** The card-total caption, which differs between the two boards. */
  total: string
  /** Araz amounts are recorded VAT-inclusive; Azpetrol's are not. */
  vat: boolean
  /** The first card column's heading. */
  cardHead: string
  unit: string
}

/* Verbatim from index.html:8077-8082. The asymmetry is real and must not be
   "tidied": only `title`, `out`, `total`, `vat` and `cardHead` differ, and
   `vat` additionally drives the written `vat_included` flag and the default
   operation date (Araz defaults to today, Azpetrol stays blank because its
   source sheet has no date column). */
export const AZP_LABEL: Record<AzpModule, AzpLabel> = {
  azpetrol: {
    title: 'Azpetrol',
    out: 'Y/D',
    total: 'Kartların balansı',
    vat: false,
    cardHead: 'Sahib / Layihə',
    unit: '₼',
  },
  araz: {
    title: 'Araz',
    out: 'Məxaric',
    total: 'Kartların cari balansı',
    vat: true,
    cardHead: 'Obyekt / Kart seriyası',
    unit: '₼',
  },
}

/**
 * `azpMod(m)` — index.html:8112-8117.
 *
 * Returns the module when valid and THROWS otherwise, with the exact legacy
 * message. It never falls back to a default: silently choosing a board would
 * mix two separate accounting spaces.
 */
export function azpMod(m: string): AzpModule {
  if ((AZP_MODULES as readonly string[]).indexOf(m) < 0) {
    throw new Error('AZP: yanlış modul: ' + m)
  }
  return m as AzpModule
}

/** True when `m` names a board, without throwing — for guard expressions. */
export function isAzpModule(m: unknown): m is AzpModule {
  return typeof m === 'string' && (AZP_MODULES as readonly string[]).indexOf(m) >= 0
}

/**
 * `azpKindLabel(m, k)` — index.html:8121.
 *
 * `medaxil` is «Mədaxil» on both boards; ANY other value — including an
 * unknown one — yields the module's `out` label. That is the legacy rule
 * verbatim: the function does not validate `k`.
 */
export function azpKindLabel(m: AzpModule, k: string): string {
  return k === 'medaxil' ? 'Mədaxil' : AZP_LABEL[m].out
}
