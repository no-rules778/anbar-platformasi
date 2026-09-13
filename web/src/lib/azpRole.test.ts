import { describe, expect, it, vi } from 'vitest'
import {
  AZP_ADMIN_BUTTON_KEYS, AZP_ADMIN_ONLY_MESSAGE, AZP_NO_ACCESS_MESSAGE,
  azpCanRead, azpIsAdmin, azpNeedAdmin, azpRole, azpSyncButtons,
} from './azpRole'
import { effectiveRole } from './roles'

/* T0 — M17-11 … M17-14.

   BROWSER AFFORDANCE EVIDENCE ONLY (protocol §7). Nothing here proves what
   the server allows. The authority is `azp_user_role()` / `azp_is_admin()` /
   `azp_can_read()` in sql/020 plus the sql/021 privilege lockdown, whose
   ledger rows are M17-17 … M17-21 and are BLOCKED — no assertion in this file
   can satisfy them. */

describe('azpRole', () => {
  it('maps admin to admin', () => {
    expect(azpRole({ role: 'admin' })).toBe('admin')
  })

  /* anbardar is refused OUTRIGHT — the one role the module excludes even
     though ANBAR treats it as a real working role. */
  it('refuses anbardar outright', () => {
    expect(azpRole({ role: 'anbardar' })).toBe('none')
  })

  it('maps all four read roles to read', () => {
    expect(azpRole({ role: 'rehber' })).toBe('read')
    expect(azpRole({ role: 'muhasib' })).toBe('read')
    expect(azpRole({ role: 'techizat' })).toBe('read')
    expect(azpRole({ role: 'baxis' })).toBe('read')
  })

  /* Fail-closed: the default is refusal. */
  it('returns none for unknown, empty and absent identities', () => {
    expect(azpRole({ role: 'nonsense' })).toBe('none')
    expect(azpRole({ role: '' })).toBe('none')
    expect(azpRole({ role: null })).toBe('none')
    expect(azpRole({})).toBe('none')
    expect(azpRole(null)).toBe('none')
    expect(azpRole(undefined)).toBe('none')
  })

  /* This module does NOT reuse ANBAR's effectiveRole(). The divergence is the
     point: effectiveRole maps muhasib to rehber and keeps anbardar as itself,
     while azpRole grants muhasib read and refuses anbardar. A future
     "simplification" that routed azpRole through effectiveRole would grant
     warehouse staff access to fuel-card accounting, and this fails first. */
  it('is independent of ANBAR effectiveRole, which keeps anbardar as a working role', () => {
    expect(effectiveRole('anbardar')).toBe('anbardar')
    expect(azpRole({ role: 'anbardar' })).toBe('none')
    expect(effectiveRole('muhasib')).toBe('rehber')
    expect(azpRole({ role: 'muhasib' })).toBe('read')
  })
})

describe('azpCanRead', () => {
  it('is true for admin and every read role', () => {
    expect(azpCanRead({ role: 'admin' })).toBe(true)
    expect(azpCanRead({ role: 'rehber' })).toBe(true)
    expect(azpCanRead({ role: 'muhasib' })).toBe(true)
    expect(azpCanRead({ role: 'techizat' })).toBe(true)
    expect(azpCanRead({ role: 'baxis' })).toBe(true)
  })

  it('is false for anbardar, unknown roles and no identity', () => {
    expect(azpCanRead({ role: 'anbardar' })).toBe(false)
    expect(azpCanRead({ role: 'nonsense' })).toBe(false)
    expect(azpCanRead(null)).toBe(false)
  })
})

describe('azpIsAdmin', () => {
  it('is true only for admin', () => {
    expect(azpIsAdmin({ role: 'admin' })).toBe(true)
    expect(azpIsAdmin({ role: 'rehber' })).toBe(false)
    expect(azpIsAdmin({ role: 'muhasib' })).toBe(false)
    expect(azpIsAdmin({ role: 'anbardar' })).toBe(false)
    expect(azpIsAdmin(null)).toBe(false)
  })

  /* A read role can read but is not an admin — the two predicates must not
     collapse into one another. */
  it('is strictly narrower than azpCanRead', () => {
    expect(azpCanRead({ role: 'rehber' })).toBe(true)
    expect(azpIsAdmin({ role: 'rehber' })).toBe(false)
  })
})

describe('refusal messages', () => {
  it('are the exact legacy strings', () => {
    expect(AZP_ADMIN_ONLY_MESSAGE).toBe('Bu əməliyyat yalnız Admin üçündür')
    expect(AZP_NO_ACCESS_MESSAGE).toBe('Azpetrol / Araz moduluna girişiniz yoxdur')
  })
})

/* M17-16 — index.html:8107-8111. Affordance only: this decides whether the
   browser asks, never whether the server agrees (M17-17…M17-21, BLOCKED). */
describe('azpNeedAdmin', () => {
  it('returns true for an admin and raises NO toast', () => {
    const toast = vi.fn()
    expect(azpNeedAdmin({ role: 'admin' }, toast)).toBe(true)
    expect(toast).not.toHaveBeenCalled()
  })

  /* The refusal is the row: the exact string, the error flag, and false. */
  it('toasts the exact admin-only message and returns false for a read role', () => {
    const toast = vi.fn()
    expect(azpNeedAdmin({ role: 'rehber' }, toast)).toBe(false)
    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast).toHaveBeenCalledWith('Bu əməliyyat yalnız Admin üçündür', true)
  })

  /* A read role is refused just as an anbardar or an absent identity is —
     `azpNeedAdmin` gates on admin, not on read access. */
  it('refuses anbardar, unknown roles and a null identity alike', () => {
    for (const me of [{ role: 'anbardar' }, { role: 'nonsense' }, null]) {
      const toast = vi.fn()
      expect(azpNeedAdmin(me, toast)).toBe(false)
      expect(toast).toHaveBeenCalledWith(AZP_ADMIN_ONLY_MESSAGE, true)
    }
  })
})

/* M17-15 — index.html:8231-8238. */
describe('azpSyncButtons', () => {
  it('governs exactly newcard, newmov and imp, in the legacy order', () => {
    expect(AZP_ADMIN_BUTTON_KEYS).toEqual(['newcard', 'newmov', 'imp'])
    expect(Object.keys(azpSyncButtons({ role: 'admin' })).sort())
      .toEqual(['imp', 'newcard', 'newmov'])
  })

  it('shows all three for an admin', () => {
    expect(azpSyncButtons({ role: 'admin' })).toEqual({ newcard: true, newmov: true, imp: true })
  })

  /* The load-bearing half of the row: a read role loses those THREE and
     nothing else. `azpSyncButtons` never names export or report, so they
     cannot be hidden by it — asserted directly below in the page test. */
  it('hides all three for a read role and for a null identity', () => {
    expect(azpSyncButtons({ role: 'rehber' })).toEqual({ newcard: false, newmov: false, imp: false })
    expect(azpSyncButtons({ role: 'muhasib' })).toEqual({ newcard: false, newmov: false, imp: false })
    expect(azpSyncButtons(null)).toEqual({ newcard: false, newmov: false, imp: false })
  })

  /* Guards the negative half at the contract level: if someone later adds
     'exp' or 'rep' to the governed set, this fails. */
  it('never governs the export or report controls', () => {
    const keys = Object.keys(azpSyncButtons({ role: 'rehber' }))
    expect(keys).not.toContain('exp')
    expect(keys).not.toContain('rep')
    expect(keys).toHaveLength(3)
  })
})
