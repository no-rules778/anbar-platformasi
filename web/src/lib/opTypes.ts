/* Operation kinds, types and option lists — index.html:3206-3226, 3860-3862.

   `OP_TYPES` is the SINGLE source consumed by the form, the line validator and
   the draft-line editor (the original says so explicitly at 3206-3207). A
   second list anywhere would let a tab offer a type its validator rejects. */

export type OpKind = 'in' | 'out' | 'mv'

/** index.html:3208. «İcarə» is inbound only — the firm TAKES goods on rent, so
    they arrive and sit in stock without being ours. «Qaytarma» exists on both
    tabs: inbound a customer returns to us, outbound we hand goods back to
    their owner — that second one is what lowers the İcarədə figure. */
export const OP_TYPES: Record<OpKind, readonly string[]> = {
  in: ['Satınalma', 'Qaytarma', 'İcarə', 'Əvvələ qalıq'],
  out: ['Sahəyə', 'Silinmə', 'Satış', 'Qaytarma'],
  mv: ['Yerdəyişmə'],
}

/** index.html:3211. Used only when the reference directory failed to load. */
export const DEFAULT_CHANNELS: readonly string[] = [
  'Nağd alış',
  'Kommersiya şirkəti',
  'Köçürmə',
  'Sahə üzrə məsul şəxs',
]

/** The fixed «Təhvil alan» value the outbound tab always offers (3220). */
export const SAHE_MESUL = 'Sahə üzrə məsul şəxs'

export interface ReferenceChannel {
  name: string
  active: boolean
}

/** A row of the warehouses table as the original's `DB.locs` sees it (937). */
export interface LocationEntry {
  name: string
  /** `warehouses.type` — 'anbar' or a project/location kind. */
  kind: string
  active: boolean
}

export interface PartnerEntry {
  name: string
  active: boolean
}

/**
 * `channelOptions()` — index.html:3211-3217.
 *
 * A READY directory yields its active channels only. A directory that FAILED
 * falls back to the built-ins unioned with every channel actually observed in
 * operational movements, so an existing document's channel stays selectable.
 *
 * «failed» and «ready but empty» are different states (Phase 5 A14): a ready
 * directory with no active channel legitimately yields an empty list, and must
 * not silently resurrect the built-ins.
 */
export function channelOptions(
  refs: { ready: boolean; channels: readonly ReferenceChannel[] },
  observedChannels: readonly string[],
): string[] {
  if (refs.ready) return refs.channels.filter((c) => c.active).map((c) => c.name)
  const used = Array.from(new Set(observedChannels.filter(Boolean)))
  return Array.from(new Set([...DEFAULT_CHANNELS, ...used]))
}

/**
 * `partnerOptions(kind)` — index.html:3218-3226.
 *
 * Order is load-bearing on the outbound tab: the fixed «Sahə üzrə məsul şəxs»
 * first, then NON-warehouse locations, then warehouse locations. A value hidden
 * in Soraqçalar is excluded everywhere — it cannot be chosen for a new
 * operation (the original's own comment at 3219-3220).
 */
export function partnerOptions(
  kind: OpKind,
  data: {
    warehouses: readonly string[]
    locations: readonly LocationEntry[]
    partners: readonly PartnerEntry[]
  },
): string[] {
  const activeLocs = data.locations.filter((l) => l.active !== false)
  let names: string[]
  if (kind === 'mv') {
    names = [...data.warehouses]
  } else if (kind === 'out') {
    names = [
      SAHE_MESUL,
      ...activeLocs.filter((l) => l.kind !== 'anbar').map((l) => l.name),
      ...activeLocs.filter((l) => l.kind === 'anbar').map((l) => l.name),
    ]
  } else {
    names = data.partners.filter((p) => p.active !== false).map((p) => p.name)
  }
  return Array.from(new Set(names))
}

/**
 * `optsWith(list, cur)` — index.html:3860-3862.
 *
 * Keeps a value that is no longer in its list (e.g. hidden in Soraqçalar after
 * the line was drafted) so editing an unrelated field cannot silently change
 * it. The exception is granted to THIS value only — appended, never inserted.
 */
export function optsWith(list: readonly string[], cur: string | null | undefined): string[] {
  return cur && !list.includes(cur) ? [...list, cur] : [...list]
}

/**
 * Whether the outbound tab renders the group-write-off layout instead of the
 * single-item block — index.html:3255 (`isWoOut`).
 *
 * Edit mode keeps the ordinary form on purpose: the bulk flow calls
 * `post_movement_document` DIRECTLY and would bypass the `correct_document`
 * transaction, so offering it during a correction would be wrong.
 */
export function isWoOut(kind: OpKind, type: string, editMode: boolean): boolean {
  return kind === 'out' && type === 'Silinmə' && !editMode
}

/** index.html:3260 (`isMvPick`) — transfers keep BOTH paths, single and bulk. */
export function isMvPick(kind: OpKind, editMode: boolean): boolean {
  return kind === 'mv' && !editMode
}

/** True when `type` is valid for `kind` — the check `validateOpLine` makes. */
export function isTypeAllowed(kind: OpKind, type: string): boolean {
  return (OP_TYPES[kind] ?? []).includes(type)
}
