import type { ReferenceKind } from '../api/referenceDirectory.api'

/* Which readiness flag gates a kind's availability.

   This is deliberately NOT derived from the kind's data source. The production
   platform's refServerReady() (index.html:2949-2953) groups `serfiyyat_channel`
   with `project` even though its rows arrive in the same get_reference_values()
   call as channel/unit/category. Deriving readiness from the source would make
   `serfiyyat_channel` visible in a state where the original hides it — see the
   Phase 3 design §4.4 and registry row M3-02a. */
export type ReadinessFlag = 'always' | 'referenceValues' | 'serfiyyat'

export interface KindRule {
  kind: ReferenceKind
  /** Verbatim from REF_KINDS (index.html:2934-2943). */
  label: string
  readiness: ReadinessFlag
  /** True once this kind has a wired-up screen. All eight are wired as of 3b. */
  wired: boolean
  /* The name is read-only once the value is used. True for the accounting keys
     only — warehouse and location (index.html:3085). Every other kind stays
     renameable because manage_reference cascades the rename instead of
     refusing it. */
  nameLockedWhenUsed: boolean
  /* Usage is counted by the row's id, not its name. `project` alone works this
     way: refUsage matches serfiyyat_documents.project_id (index.html:2984),
     so two projects that swap names do not swap counts. */
  usageById: boolean
}

/* Every kind the RPC accepts, in REF_KINDS order, with the per-kind facts that
   differ. */
export const KIND_RULES: readonly KindRule[] = [
  { kind: 'warehouse', label: 'Anbar', readiness: 'always', wired: true, nameLockedWhenUsed: true, usageById: false },
  { kind: 'location', label: 'Ünvan / layihə', readiness: 'always', wired: true, nameLockedWhenUsed: true, usageById: false },
  { kind: 'partner', label: 'Kontragent', readiness: 'always', wired: true, nameLockedWhenUsed: false, usageById: false },
  { kind: 'channel', label: 'Alınma kanalı', readiness: 'referenceValues', wired: true, nameLockedWhenUsed: false, usageById: false },
  { kind: 'unit', label: 'Ölçü vahidi', readiness: 'referenceValues', wired: true, nameLockedWhenUsed: false, usageById: false },
  { kind: 'category', label: 'Mal kateqoriyası', readiness: 'referenceValues', wired: true, nameLockedWhenUsed: false, usageById: false },
  { kind: 'project', label: 'Layihə (Sərfiyyat Materialları)', readiness: 'serfiyyat', wired: true, nameLockedWhenUsed: false, usageById: true },
  { kind: 'serfiyyat_channel', label: 'Alınma kanalı (Sərfiyyat Materialları)', readiness: 'serfiyyat', wired: true, nameLockedWhenUsed: false, usageById: false },
]

/* All eight kinds now have a screen. Registry deviation D-12 ("only two of
   eight kinds wired") is closed by Phase 3b. */
export const WIRED_KINDS = KIND_RULES.filter((r) => r.wired).map((r) => ({ kind: r.kind, label: r.label }))

export type WiredKind = ReferenceKind

/** REF_KIND_LABEL (index.html:2944) — resolves every kind, wired or not. */
export function kindLabel(kind: string): string {
  return KIND_RULES.find((r) => r.kind === kind)?.label ?? kind
}

export function kindRule(kind: string): KindRule | undefined {
  return KIND_RULES.find((r) => r.kind === kind)
}

/** The readiness flags a screen tracks. Phase 3a only ever sets referenceValues. */
export interface ReferenceReadiness {
  referenceValues: boolean
  serfiyyat: boolean
}

/* refServerReady (index.html:2949-2953): is this kind's data available? An
   'always' kind is ready unconditionally; the others follow their own flag. */
export function isKindReady(kind: string, readiness: ReferenceReadiness): boolean {
  const rule = kindRule(kind)
  if (!rule) return false
  if (rule.readiness === 'always') return true
  return readiness[rule.readiness]
}

/* One row of the unified Soraqçalar table. The source tables normalise to this
   shape because their primary keys differ — `warehouses.id` is an integer,
   `partners.id` and `reference_values.id` are uuids — while `manage_reference`
   takes the id as text either way. */
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
  /* Project-only: the warehouse whose anbardar may write to this project.
     '' means "— bağlanmayıb —". Empty for every other kind. */
  linkedWarehouse: string
}

/** Stable map key — names are only unique within a kind. */
export function usageKey(kind: string, name: string): string {
  return `${kind}|${name}`
}

/* The usage-map key for a row. `project` is keyed by id because refUsage
   counts serfiyyat_documents.project_id rather than a name match
   (index.html:2984); every other kind is keyed by name. Renaming a project to
   another project's old name must therefore not transfer its count. */
export function entityUsageKey(entity: { kind: string; id: string; name: string }): string {
  return kindRule(entity.kind)?.usageById ? usageKey(entity.kind, entity.id) : usageKey(entity.kind, entity.name)
}

export type { ReferenceKind }
