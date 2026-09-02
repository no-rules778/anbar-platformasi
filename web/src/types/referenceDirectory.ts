import type { ReferenceKind } from '../api/referenceDirectory.api'

/* The reference directories the React app has wired up so far. The production
   platform's REF_KINDS (index.html:2934-2943) lists eight; the RPC accepts all
   eight, but only these two have a screen here. Adding another kind means
   adding a row plus its entity fetcher — no structural change. */
export const WIRED_KINDS = [
  { kind: 'warehouse' as const, label: 'Anbar' },
  { kind: 'partner' as const, label: 'Kontragent' },
]

export type WiredKind = (typeof WIRED_KINDS)[number]['kind']

/** REF_KIND_LABEL (index.html:2944). */
export function kindLabel(kind: string): string {
  return WIRED_KINDS.find((k) => k.kind === kind)?.label ?? kind
}

/* One row of the unified Soraqçalar table. Both source tables normalise to
   this shape because their primary keys differ — `warehouses.id` is an
   integer, `partners.id` a uuid — while `manage_reference` takes the id as
   text either way. */
export interface ReferenceEntity {
  kind: WiredKind
  /** Stringified primary key, ready to hand to manage_reference's p_id. */
  id: string
  name: string
  active: boolean
  /** Partner-only fields; empty for other kinds. */
  voen: string
  contract: string
  contractDate: string
}

/** Stable map key — names are only unique within a kind. */
export function usageKey(kind: string, name: string): string {
  return `${kind}|${name}`
}

export type { ReferenceKind }
