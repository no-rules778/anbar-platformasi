export const COND_INPUT_ERROR = 'Miqdar mənfi olmayan düzgün ədəd olmalıdır'

export type CondInputResult =
  | { ok: true; value: number }
  | { ok: false; error: typeof COND_INPUT_ERROR }

/** Normalises one condition-cell value exactly like legacy `saveCond()`. */
export function normaliseCondInput(raw: unknown): CondInputResult {
  const text = String(raw == null ? '' : raw).trim().replace(',', '.')
  const value = text === '' ? 0 : Number(text)
  if (!Number.isFinite(value) || value < 0) return { ok: false, error: COND_INPUT_ERROR }
  return { ok: true, value: Math.round(value * 100) / 100 }
}
