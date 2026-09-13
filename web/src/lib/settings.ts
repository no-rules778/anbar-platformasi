import type { PartnerRow } from '../api/partners.api'

export const PARTNER_EXPORT_HEADER = ['Kontragent', 'VÖEN', 'Müqavilə', 'Tarix'] as const

/** index.html:7197 — the only Settings export that does not delegate to another page. */
export function partnerExportMatrix(partners: readonly PartnerRow[]): unknown[][] {
  return [[...PARTNER_EXPORT_HEADER], ...partners.map((p) => [p.name, p.voen, p.contract, p.contract_date])]
}

/** Values used by the exact source-card sentence (index.html:7195-7196). */
export interface SourceCounts { items: number; partners: number; movements: number }

export function sourceCounts(items: readonly unknown[], partners: readonly unknown[], operational: readonly unknown[]): SourceCounts {
  return { items: items.length, partners: partners.length, movements: operational.length }
}
