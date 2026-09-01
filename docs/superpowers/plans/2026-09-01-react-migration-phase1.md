# ANBAR React Migration — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Vite + React + TypeScript + Zustand + Tailwind (shadcn/ui-style) skeleton inside the existing repo, and port login/auth (including the device/session-limit mechanism) and warehouse management (create/edit/deactivate/reactivate/delete) from `platform/index.html` with exact behavioral parity, verified locally against the live Supabase project.

**Architecture:** A `web/` folder at the repo root holds a standalone Vite SPA. Supabase access goes through a thin `api/` layer (one file per concern) called only from Zustand stores and pages — never directly from components. Business/permission logic (`effectiveRole`, warehouse scoping) is extracted into pure, unit-tested functions in `lib/`, separated from UI side effects (toasts) — this is a deliberate, disclosed structural improvement over the original inline code; the observable behavior (who can do what, what message they see) is unchanged.

**Tech Stack:** Vite 5, React 18, TypeScript 5 (strict), Zustand 4, `@supabase/supabase-js` 2, Tailwind CSS 3, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-01-react-migration-phase1-design.md`

## Global Constraints

- Branch `react-migration` only. **No `git push`, no PR, no merge to `main`, no deploy** at any point in this plan — every task ends with a local commit only. The final go/no-go for push/deploy is a separate, explicit user decision outside this plan.
- `index.html` at the repo root is never modified by this plan.
- All Supabase reads/writes in Phase 1 hit the **live production project** (`bbjmhaerssakbreykxiw`) — there is no separate test database (explicit user decision). Any write-path testing is limited to one clearly-labeled throwaway record (`TEST_REACT_MIGRATION`), created and immediately deactivated, per the approved design.
- `tsconfig.json` must have `"strict": true`. Every task that touches TypeScript ends with `npm run typecheck` (`tsc --noEmit`) passing clean.
- Business logic ported from `index.html` must match the source line-for-line in *behavior* (not necessarily in code shape — see Architecture note above). Every task that ports logic cites the exact source line range it was ported from.
- Do not trust `ANBAR_SHARED/docs/DB_SCHEMA.md` or `ANBAR_SHARED/docs/RLS_POLICIES.md` — both are confirmed stale. Task 2 pulls the real schema; the `manage_reference` RPC body already confirmed in the spec is the source of truth for warehouse mutation rules.

---

## Task 1: Project Skeleton

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/tsconfig.node.json`
- Create: `web/vite.config.ts`
- Create: `web/vitest.config.ts`
- Create: `web/tailwind.config.ts`
- Create: `web/postcss.config.js`
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`
- Create: `web/src/index.css`
- Create: `web/src/lib/utils.ts`
- Create: `web/src/lib/utils.test.ts`
- Create: `web/.env.example`
- Create: `web/.gitignore`

**Interfaces:**
- Produces: `cn(...classes: (string | false | null | undefined)[]): string` from `src/lib/utils.ts`, used by every UI primitive in later tasks.

- [ ] **Step 1: Scaffold the Vite React-TS project**

```bash
cd "Codex_Code_chat/anbar-platformasi-github"
npm create vite@latest web -- --template react-ts
cd web
npm install
```

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install zustand @supabase/supabase-js clsx tailwind-merge class-variance-authority
npm install -D tailwindcss@3 postcss autoprefixer vitest @vitest/ui jsdom
```

- [ ] **Step 3: Initialize Tailwind config**

```bash
npx tailwindcss init -p
```

Replace the generated `tailwind.config.js` with `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
```

Delete the auto-generated `tailwind.config.js` (superseded by the `.ts` file above).

- [ ] **Step 4: Write `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Confirm `src/main.tsx` imports it (Vite's react-ts template already imports `./index.css` — keep that import, just replace the file contents above).

- [ ] **Step 5: Set `tsconfig.json` to strict mode and write `src/lib/utils.ts`**

Open `web/tsconfig.json`. Under `compilerOptions`, ensure:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

(Vite's react-ts template already sets most of these — just confirm `strict: true` is present; add it if missing.)

`web/src/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 6: Write the failing test for `cn`**

`web/src/lib/utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges class names and drops falsy values', () => {
    expect(cn('a', false, 'b', undefined, null)).toBe('a b')
  })

  it('lets a later Tailwind class win over an earlier conflicting one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
```

- [ ] **Step 7: Configure Vitest**

`web/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

Add scripts to `web/package.json` (`"scripts"` block — merge with what Vite's template already put there):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

- [ ] **Step 8: Run the test suite and typecheck**

Run: `cd web && npm run test`
Expected: PASS (2 tests in `utils.test.ts`)

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 9: `.env.example`, `.gitignore`, and a placeholder `App.tsx`**

`web/.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Append to `web/.gitignore` (Vite's template already creates one — add these lines, don't replace the file):

```
.env
.env.local
```

`web/src/App.tsx` (temporary placeholder — Task 6 replaces this with real routing):

```tsx
function App() {
  return <div className="p-8 text-lg">ANBAR — React migration skeleton</div>
}

export default App
```

- [ ] **Step 10: Run the dev server and confirm it boots**

Run: `npm run dev -- --port 5174` (background it, e.g. `&` or a separate terminal — port 5174 to avoid clashing with the existing static `serve` on 5173)

Poll: `curl -sf http://localhost:5174 >/dev/null` until it succeeds (timeout 30s)

Expected: HTTP 200, and the page (checked via a headless fetch of the built dev HTML or a manual browser open) shows "ANBAR — React migration skeleton". Stop the dev server after confirming (`lsof -ti:5174 -sTCP:LISTEN | xargs -r kill` on the runner's shell, or Ctrl+C if run in foreground).

- [ ] **Step 11: Commit**

```bash
cd "Codex_Code_chat/anbar-platformasi-github"
git add web/
git commit -m "web: Vite+React+TS+Zustand+Tailwind skeleton"
```

---

## Task 2: Supabase Client + Generated Types

**Files:**
- Create: `web/src/api/supabase.ts`
- Create: `web/src/api/supabase.test.ts`
- Create: `web/src/types/database.ts`
- Modify: `web/.env` (local only — not committed; created from `.env.example`, real values filled by the user, not by the implementer)

**Interfaces:**
- Consumes: nothing (this is the base layer).
- Produces: `supabase` (typed `SupabaseClient<Database>`), `setRemember(on: boolean): void`, `rememberOn(): boolean`, `savedEmail(): string`, `saveEmail(v: string): void` — all later `api/*.ts` files import `supabase` from here; `store/auth.store.ts` (Task 4) and `pages/LoginPage.tsx` (Task 6) import the remember/email helpers.

- [ ] **Step 1: Generate real Supabase types (ground truth, not hand-written)**

```bash
cd "ANBAR_SHARED/platform"
set -a && source .env && set +a
supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" > "../../Codex_Code_chat/anbar-platformasi-github/web/src/types/database.ts"
```

This requires network access to the Supabase Management API (uses `SUPABASE_ACCESS_TOKEN`, already linked in the current session) — it does not require Docker. If it fails with an auth error, confirm `supabase projects list` still shows the project as `linked: true` first.

- [ ] **Step 2: Verify the generated file is non-empty and includes `warehouses` and `users`**

Run: `grep -c "warehouses:" web/src/types/database.ts` and `grep -c "users:" web/src/types/database.ts`
Expected: both ≥ 1

- [ ] **Step 3: Write the auth storage helper module**

`web/src/api/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const REMEMBER_KEY = 'anbar:remember'
const EMAIL_KEY = 'anbar:email'

/** Minimal storage shape supabase-js needs — matches the original authStore(). */
interface AuthStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/* Session lives in localStorage when "remember me" is on, otherwise only for
   this tab (sessionStorage). Ported from index.html authStore() (~line 761). */
function authStorage(): AuthStorageLike {
  const pick = (): Storage => {
    try {
      return localStorage.getItem(REMEMBER_KEY) === '1' ? localStorage : sessionStorage
    } catch {
      return sessionStorage
    }
  }
  return {
    getItem(k) {
      try { return pick().getItem(k) } catch { return null }
    },
    setItem(k, v) {
      try { pick().setItem(k, v) } catch { /* ignore quota/denied errors, same as original */ }
    },
    removeItem(k) {
      try {
        localStorage.removeItem(k)
        sessionStorage.removeItem(k)
      } catch { /* ignore */ }
    },
  }
}

export function setRemember(on: boolean): void {
  try {
    if (on) localStorage.setItem(REMEMBER_KEY, '1')
    else localStorage.removeItem(REMEMBER_KEY)
  } catch { /* ignore */ }
}

export function rememberOn(): boolean {
  try { return localStorage.getItem(REMEMBER_KEY) === '1' } catch { return false }
}

export function savedEmail(): string {
  try { return localStorage.getItem(EMAIL_KEY) || '' } catch { return '' }
}

export function saveEmail(v: string): void {
  try {
    if (v) localStorage.setItem(EMAIL_KEY, v)
    else localStorage.removeItem(EMAIL_KEY)
  } catch { /* ignore */ }
}

const SB_URL = import.meta.env.VITE_SUPABASE_URL as string
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SB_URL || !SB_KEY) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — copy web/.env.example to web/.env and fill them in.')
}

export const supabase = createClient<Database>(SB_URL, SB_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: authStorage(),
  },
})
```

- [ ] **Step 4: Write the failing tests for the remember/email helpers**

`web/src/api/supabase.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setRemember, rememberOn, savedEmail, saveEmail } from './supabase'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('remember-me flag', () => {
  it('defaults to false', () => {
    expect(rememberOn()).toBe(false)
  })
  it('turns on and off', () => {
    setRemember(true)
    expect(rememberOn()).toBe(true)
    setRemember(false)
    expect(rememberOn()).toBe(false)
  })
})

describe('saved email', () => {
  it('defaults to empty string', () => {
    expect(savedEmail()).toBe('')
  })
  it('saves and clears', () => {
    saveEmail('a@b.com')
    expect(savedEmail()).toBe('a@b.com')
    saveEmail('')
    expect(savedEmail()).toBe('')
  })
})
```

Note: importing `./supabase` in the test will throw at module load if `web/.env` is missing (the guard in Step 3) — create `web/.env` locally (copy from `.env.example`, fill with the real project URL/anon key — the same public values already in `platform/index.html` `SB_URL`/`SB_KEY`, not new secrets) before running this step.

- [ ] **Step 5: Run the tests**

Run: `npm run test`
Expected: PASS (4 tests)

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add web/src/api/supabase.ts web/src/api/supabase.test.ts web/src/types/database.ts
git commit -m "web: Supabase client, generated types, remember-me storage"
```

(`.env` is not committed — verify with `git status` that only the four tracked files above are staged.)

---

## Task 3: Role Model + Warehouse Scoping (Pure Logic)

**Files:**
- Create: `web/src/lib/roles.ts`
- Create: `web/src/lib/roles.test.ts`
- Create: `web/src/lib/warehouseScope.ts`
- Create: `web/src/lib/warehouseScope.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Role`, `type EffectiveRole`, `ROLES`, `ROLE_PERMS`, `effectiveRole(role)`, `can(me, action)`, `isAdmin(me)`, `isRehber(me)`, `isAnbardar(me)` from `lib/roles.ts`; `sourceGroupWarehouses(wh)`, `allowedWarehouses(me, whs)`, `sourceWarehouses(me, whs)` from `lib/warehouseScope.ts`. `store/auth.store.ts` (Task 4) and `pages/WarehousesPage.tsx` (Task 8) both import from here — never reimplement role logic elsewhere.

- [ ] **Step 1: Write `lib/roles.ts`**

Ported from `index.html` lines 617–643.

```ts
export type Role = 'admin' | 'rehber' | 'anbardar' | 'techizat' | 'muhasib' | 'baxis' | string | null | undefined

export type EffectiveRole = 'admin' | 'rehber' | 'anbardar'

export interface Me {
  id: string
  sbId: string
  email: string
  name: string
  role: Role
  wh: string
}

export const ROLES: Record<string, { name: string }> = {
  admin: { name: 'Admin' },
  rehber: { name: 'Rəhbər' },
  anbardar: { name: 'Anbardar' },
  techizat: { name: 'Təchizatçı' },
  muhasib: { name: 'Mühasib' },
  baxis: { name: 'Müşahidəçi' },
}

/* Permission sets are keyed by EFFECTIVE role only (admin/rehber/anbardar). */
export const ROLE_PERMS: Record<EffectiveRole, string[]> = {
  admin: ['mv.add', 'mv.edit', 'mv.del', 'item.add', 'item.edit', 'partner.edit', 'loc.edit', 'price.edit', 'import', 'category.edit', 'user.manage', 'cancel'],
  rehber: [],
  anbardar: ['mv.add'],
}

/* Legacy DB role values (techizat, muhasib, baxis) are NOT deleted or
   silently promoted — treated as read-only (rehber-equivalent), mirroring
   effective_role() in sql/007_role_security_migration.sql. The server
   enforces the same mapping independently via RLS/RPCs. */
export function effectiveRole(role: Role): EffectiveRole {
  if (role === 'admin') return 'admin'
  if (role === 'anbardar') return 'anbardar'
  return 'rehber'
}

export function can(me: Me | null, action: string): boolean {
  if (!me) return false
  return ROLE_PERMS[effectiveRole(me.role)].includes(action)
}

export const isAdmin = (me: Me | null): boolean => !!me && effectiveRole(me.role) === 'admin'
export const isRehber = (me: Me | null): boolean => !!me && effectiveRole(me.role) === 'rehber'
export const isAnbardar = (me: Me | null): boolean => !!me && effectiveRole(me.role) === 'anbardar'

/* Human-readable denial message — the caller decides how to surface it
   (e.g. a toast), matching the original need()'s message text exactly.
   Ported from index.html line 638. */
export function permissionDeniedMessage(me: Me | null): string {
  const label = me && ROLES[me.role ?? ''] ? ROLES[me.role ?? ''].name : me?.role ?? ''
  return `Bu əməliyyat üçün icazəniz yoxdur (${label})`
}
```

- [ ] **Step 2: Write the failing tests for `lib/roles.ts`**

`web/src/lib/roles.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { effectiveRole, can, isAdmin, isRehber, isAnbardar, permissionDeniedMessage, type Me } from './roles'

const admin: Me = { id: '1', sbId: '1', email: 'a@x.com', name: 'A', role: 'admin', wh: '' }
const anbardar: Me = { id: '2', sbId: '2', email: 'b@x.com', name: 'B', role: 'anbardar', wh: 'Astara' }
const rehber: Me = { id: '3', sbId: '3', email: 'c@x.com', name: 'C', role: 'rehber', wh: '' }
const legacyTechizat: Me = { id: '4', sbId: '4', email: 'd@x.com', name: 'D', role: 'techizat', wh: '' }
const legacyMuhasib: Me = { id: '5', sbId: '5', email: 'e@x.com', name: 'E', role: 'muhasib', wh: '' }
const legacyBaxis: Me = { id: '6', sbId: '6', email: 'f@x.com', name: 'F', role: 'baxis', wh: '' }
const unknownRole: Me = { id: '7', sbId: '7', email: 'g@x.com', name: 'G', role: 'nonsense', wh: '' }

describe('effectiveRole', () => {
  it('passes admin and anbardar through unchanged', () => {
    expect(effectiveRole('admin')).toBe('admin')
    expect(effectiveRole('anbardar')).toBe('anbardar')
  })
  it('collapses legacy and unknown roles to rehber', () => {
    expect(effectiveRole('techizat')).toBe('rehber')
    expect(effectiveRole('muhasib')).toBe('rehber')
    expect(effectiveRole('baxis')).toBe('rehber')
    expect(effectiveRole('rehber')).toBe('rehber')
    expect(effectiveRole('nonsense')).toBe('rehber')
    expect(effectiveRole(null)).toBe('rehber')
    expect(effectiveRole(undefined)).toBe('rehber')
  })
})

describe('isAdmin / isRehber / isAnbardar — never overlap', () => {
  it.each([
    ['admin', admin, true, false, false],
    ['anbardar', anbardar, false, false, true],
    ['rehber', rehber, false, true, false],
    ['legacy techizat', legacyTechizat, false, true, false],
    ['legacy muhasib', legacyMuhasib, false, true, false],
    ['legacy baxis', legacyBaxis, false, true, false],
    ['unknown role', unknownRole, false, true, false],
  ])('%s', (_label, me, wantAdmin, wantRehber, wantAnbardar) => {
    expect(isAdmin(me)).toBe(wantAdmin)
    expect(isRehber(me)).toBe(wantRehber)
    expect(isAnbardar(me)).toBe(wantAnbardar)
  })
  it('all three are false when not logged in', () => {
    expect(isAdmin(null)).toBe(false)
    expect(isRehber(null)).toBe(false)
    expect(isAnbardar(null)).toBe(false)
  })
})

describe('can', () => {
  it('admin can do admin-only actions', () => {
    expect(can(admin, 'user.manage')).toBe(true)
    expect(can(admin, 'cancel')).toBe(true)
  })
  it('anbardar can only mv.add', () => {
    expect(can(anbardar, 'mv.add')).toBe(true)
    expect(can(anbardar, 'mv.edit')).toBe(false)
    expect(can(anbardar, 'user.manage')).toBe(false)
  })
  it('rehber (and legacy-mapped roles) can do nothing', () => {
    expect(can(rehber, 'mv.add')).toBe(false)
    expect(can(legacyTechizat, 'mv.add')).toBe(false)
  })
  it('nobody logged in can do nothing', () => {
    expect(can(null, 'mv.add')).toBe(false)
  })
})

describe('permissionDeniedMessage', () => {
  it('includes the role label', () => {
    expect(permissionDeniedMessage(rehber)).toBe('Bu əməliyyat üçün icazəniz yoxdur (Rəhbər)')
  })
})
```

- [ ] **Step 3: Run and confirm pass**

Run: `npm run test`
Expected: all `roles.test.ts` cases PASS

- [ ] **Step 4: Write `lib/warehouseScope.ts`**

Ported from `index.html` lines 709–723.

```ts
import type { Me } from './roles'
import { isAnbardar } from './roles'

/* Astara/Harmony share a source group; every other warehouse is its own
   group. Mirrors source_group_warehouses() in
   sql/007_role_security_migration.sql. */
export function sourceGroupWarehouses(wh: string): string[] {
  if (wh === 'Astara' || wh === 'Harmony') return ['Astara', 'Harmony']
  return wh ? [wh] : []
}

/* Non-transfer operations (e.g. Silinmə) — an anbardar only sees their own
   assigned warehouse, not the source group. */
export function allowedWarehouses(me: Me | null, whs: string[]): string[] {
  if (isAnbardar(me) && me?.wh) return whs.filter((w) => w === me.wh)
  return whs.slice()
}

/* Transfer (Yerdəyişmə) source options — an anbardar sees every warehouse
   in their source group. */
export function sourceWarehouses(me: Me | null, whs: string[]): string[] {
  if (isAnbardar(me) && me?.wh) {
    const group = sourceGroupWarehouses(me.wh)
    return whs.filter((w) => group.includes(w))
  }
  return whs.slice()
}
```

- [ ] **Step 5: Write the failing tests**

`web/src/lib/warehouseScope.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sourceGroupWarehouses, allowedWarehouses, sourceWarehouses } from './warehouseScope'
import type { Me } from './roles'

const allWhs = ['Elet', 'Astara', 'Xocahesen', 'Harmony', 'Ofis']

const admin: Me = { id: '1', sbId: '1', email: 'a@x.com', name: 'A', role: 'admin', wh: '' }
const anbardarAstara: Me = { id: '2', sbId: '2', email: 'b@x.com', name: 'B', role: 'anbardar', wh: 'Astara' }
const anbardarElet: Me = { id: '3', sbId: '3', email: 'c@x.com', name: 'C', role: 'anbardar', wh: 'Elet' }

describe('sourceGroupWarehouses', () => {
  it('groups Astara and Harmony together', () => {
    expect(sourceGroupWarehouses('Astara')).toEqual(['Astara', 'Harmony'])
    expect(sourceGroupWarehouses('Harmony')).toEqual(['Astara', 'Harmony'])
  })
  it('every other warehouse is its own group', () => {
    expect(sourceGroupWarehouses('Elet')).toEqual(['Elet'])
  })
  it('empty warehouse returns empty group', () => {
    expect(sourceGroupWarehouses('')).toEqual([])
  })
})

describe('allowedWarehouses', () => {
  it('admin sees every warehouse', () => {
    expect(allowedWarehouses(admin, allWhs)).toEqual(allWhs)
  })
  it('anbardar sees only their own assigned warehouse, not the source group', () => {
    expect(allowedWarehouses(anbardarAstara, allWhs)).toEqual(['Astara'])
  })
  it('not-logged-in sees every warehouse (matches original: only isAnbardar gates it)', () => {
    expect(allowedWarehouses(null, allWhs)).toEqual(allWhs)
  })
})

describe('sourceWarehouses', () => {
  it('admin sees every warehouse', () => {
    expect(sourceWarehouses(admin, allWhs)).toEqual(allWhs)
  })
  it('Astara anbardar sees the whole Astara/Harmony source group', () => {
    expect(sourceWarehouses(anbardarAstara, allWhs)).toEqual(['Astara', 'Harmony'])
  })
  it('Elet anbardar sees only Elet', () => {
    expect(sourceWarehouses(anbardarElet, allWhs)).toEqual(['Elet'])
  })
})
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm run test`
Expected: all PASS

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/roles.ts web/src/lib/roles.test.ts web/src/lib/warehouseScope.ts web/src/lib/warehouseScope.test.ts
git commit -m "web: port role model and warehouse-scoping logic with unit tests"
```

---

## Task 4: Auth Store + Auth API

**Files:**
- Create: `web/src/api/auth.api.ts`
- Create: `web/src/api/auth.api.test.ts`
- Create: `web/src/store/auth.store.ts`
- Create: `web/src/store/auth.store.test.ts`

**Interfaces:**
- Consumes: `supabase` from `api/supabase.ts` (Task 2); `Me` type from `lib/roles.ts` (Task 3).
- Produces: `signIn(email, password)`, `signOut()`, `getUser()`, `getSession()`, `changePassword(email, oldPass, newPass)`, `fetchProfile(userId)` from `api/auth.api.ts`; `useAuthStore` (Zustand hook) with state `{ me: Me | null, status: 'idle'|'loading'|'ready'|'error', error: string | null }` and actions `setMe`, `setStatus`, `setError`, `reset` from `store/auth.store.ts`. Task 6 (`LoginPage.tsx`, `App.tsx`) is the only consumer of both.

- [ ] **Step 1: Write `api/auth.api.ts`**

Ported from `index.html` lines 798–820 and the `users` profile fetch inside `enterApp()` (line 7495).

```ts
import { supabase } from './supabase'
import type { Database } from '../types/database'

type UserProfile = Database['public']['Tables']['users']['Row']

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data?.session ?? null
}

/* Current password is re-checked first so an unattended screen can't be
   hijacked. Ported from index.html sbChangePassword (line 798). */
export async function changePassword(email: string, oldPass: string, newPass: string): Promise<{ error: { message: string } | null }> {
  const chk = await supabase.auth.signInWithPassword({ email, password: oldPass })
  if (chk.error) return { error: { message: 'Cari şifrə yanlışdır' } }
  const { error } = await supabase.auth.updateUser({ password: newPass })
  return { error }
}

export async function fetchProfile(userId: string): Promise<{ data: UserProfile | null; error: { message: string } | null }> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
  return { data: data ?? null, error }
}
```

- [ ] **Step 2: Write the failing tests for `api/auth.api.ts` (mocked Supabase client)**

`web/src/api/auth.api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

import { supabase } from './supabase'
import { signIn, signOut, getUser, getSession, changePassword, fetchProfile } from './auth.api'

beforeEach(() => vi.clearAllMocks())

describe('signIn', () => {
  it('delegates to supabase.auth.signInWithPassword', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: null } as never)
    await signIn('a@b.com', 'pw')
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' })
  })
})

describe('changePassword', () => {
  it('rejects with "Cari şifrə yanlışdır" when the old password check fails', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: { message: 'bad creds' } } as never)
    const res = await changePassword('a@b.com', 'wrong', 'new')
    expect(res.error?.message).toBe('Cari şifrə yanlışdır')
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })
  it('updates the password when the old password check succeeds', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: null } as never)
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: {}, error: null } as never)
    const res = await changePassword('a@b.com', 'right', 'new')
    expect(res.error).toBeNull()
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'new' })
  })
})

describe('fetchProfile', () => {
  it('queries users by id and returns a single row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'u1', role: 'admin' }, error: null })
    const eq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq })
    vi.mocked(supabase.from).mockReturnValue({ select } as never)
    const res = await fetchProfile('u1')
    expect(supabase.from).toHaveBeenCalledWith('users')
    expect(select).toHaveBeenCalledWith('*')
    expect(eq).toHaveBeenCalledWith('id', 'u1')
    expect(res.data).toEqual({ id: 'u1', role: 'admin' })
  })
})

describe('getUser / getSession / signOut', () => {
  it('getUser unwraps data.user, defaulting to null', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null } } as never)
    expect(await getUser()).toBeNull()
  })
  it('getSession unwraps data.session, defaulting to null', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never)
    expect(await getSession()).toBeNull()
  })
  it('signOut calls supabase.auth.signOut', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never)
    await signOut()
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run and confirm pass**

Run: `npm run test`
Expected: all `auth.api.test.ts` cases PASS

- [ ] **Step 4: Write `store/auth.store.ts`**

`ME` global from `index.html` (line 636, populated in `enterApp` line 7498–7502) becomes this store.

```ts
import { create } from 'zustand'
import type { Me } from '../lib/roles'

export type AuthStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AuthState {
  me: Me | null
  status: AuthStatus
  error: string | null
  setMe: (me: Me | null) => void
  setStatus: (status: AuthStatus) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  me: null,
  status: 'idle',
  error: null,
  setMe: (me) => set({ me }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  reset: () => set({ me: null, status: 'idle', error: null }),
}))
```

- [ ] **Step 5: Write the failing test for the store**

`web/src/store/auth.store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth.store'
import type { Me } from '../lib/roles'

const sampleMe: Me = { id: '1', sbId: '1', email: 'a@b.com', name: 'A', role: 'admin', wh: '' }

beforeEach(() => useAuthStore.getState().reset())

describe('useAuthStore', () => {
  it('starts idle with no user', () => {
    const s = useAuthStore.getState()
    expect(s.me).toBeNull()
    expect(s.status).toBe('idle')
    expect(s.error).toBeNull()
  })
  it('setMe / setStatus / setError update state independently', () => {
    useAuthStore.getState().setMe(sampleMe)
    useAuthStore.getState().setStatus('ready')
    expect(useAuthStore.getState().me).toEqual(sampleMe)
    expect(useAuthStore.getState().status).toBe('ready')
  })
  it('reset clears everything back to idle', () => {
    useAuthStore.getState().setMe(sampleMe)
    useAuthStore.getState().setStatus('ready')
    useAuthStore.getState().setError('boom')
    useAuthStore.getState().reset()
    const s = useAuthStore.getState()
    expect(s.me).toBeNull()
    expect(s.status).toBe('idle')
    expect(s.error).toBeNull()
  })
})
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm run test`
Expected: all PASS

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add web/src/api/auth.api.ts web/src/api/auth.api.test.ts web/src/store/auth.store.ts web/src/store/auth.store.test.ts
git commit -m "web: auth API wrapper and Zustand auth store"
```

---

## Task 5: Session / Device-Limit Management

**Files:**
- Create: `web/src/api/session.api.ts`
- Create: `web/src/api/session.api.test.ts`

**Interfaces:**
- Consumes: `supabase` from `api/supabase.ts`.
- Produces: `DEVICE_ID: string`, `DEVICE_LABEL: string`, `registerSession(): Promise<RegisterSessionResult>`, `unregisterSession(): Promise<void>`, `touchSession(): Promise<{ alive: boolean } | null>`, `endOtherSessions(): Promise<{ error: unknown }>`, `endSession(deviceId: string): Promise<{ error: unknown }>`. Task 6 (`App.tsx`) uses `registerSession`/`unregisterSession`/`touchSession` to drive the login and heartbeat flow.

- [ ] **Step 1: Write `api/session.api.ts`**

Ported from `index.html` lines 7285–7359 (`DEVICE_ID`, `DEVICE_LABEL`, `registerSession`, `unregisterSession`, `startHeartbeat`/`stopHeartbeat` — the interval-timer part becomes a hook in Task 6, this file keeps only the RPC calls).

```ts
import { supabase } from './supabase'

const DEVICE_ID_KEY = 'anbar_device_id'

function createDeviceId(): string {
  return 'dev_' + Math.random().toString(36).slice(2, 12)
}

export function getDeviceId(): string {
  try {
    let d = localStorage.getItem(DEVICE_ID_KEY)
    if (!d) {
      d = createDeviceId()
      localStorage.setItem(DEVICE_ID_KEY, d)
    }
    return d
  } catch {
    return createDeviceId()
  }
}

function buildDeviceLabel(): string {
  try {
    const ua = navigator.userAgent || ''
    const os = /Windows/i.test(ua) ? 'Windows'
      : /Android/i.test(ua) ? 'Android'
      : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
      : /Mac OS X/i.test(ua) ? 'macOS'
      : /Linux/i.test(ua) ? 'Linux'
      : 'Naməlum'
    const br = /Edg\//i.test(ua) ? 'Edge'
      : /OPR\//i.test(ua) ? 'Opera'
      : /Chrome\//i.test(ua) ? 'Chrome'
      : /Safari\//i.test(ua) ? 'Safari'
      : /Firefox\//i.test(ua) ? 'Firefox'
      : 'brauzer'
    return (br + ' · ' + os).slice(0, 120)
  } catch {
    return 'Naməlum cihaz'
  }
}

export const DEVICE_ID = getDeviceId()
export const DEVICE_LABEL = buildDeviceLabel()

export interface RegisterSessionResult {
  allowed: boolean
  degraded?: boolean
  devices?: { device_id: string; device_label: string; started_at: string; last_seen: string }[]
  limit?: number
}

/* Limit is role-based (admin: 3 devices, others: 1), enforced SERVER-SIDE by
   register_session() under an advisory lock — this client code is only the
   interface. If SQL 026 (register_session) isn't applied yet, the app is
   not blocked: the limit is simply not enforced (degraded: true). Ported
   from index.html registerSession (line 7320). */
export async function registerSession(): Promise<RegisterSessionResult> {
  try {
    const { data, error } = await supabase.rpc('register_session', {
      p_device_id: DEVICE_ID,
      p_device_label: DEVICE_LABEL,
    })
    if (error) throw error
    return (data as RegisterSessionResult) ?? { allowed: true }
  } catch (err) {
    console.warn('register_session', err)
    return { allowed: true, degraded: true }
  }
}

export async function unregisterSession(): Promise<void> {
  try {
    await supabase.rpc('end_session', { p_device_id: DEVICE_ID })
  } catch { /* ignore, matches original */ }
}

export async function touchSession(): Promise<{ alive: boolean } | null> {
  try {
    const { data, error } = await supabase.rpc('touch_session', { p_device_id: DEVICE_ID })
    if (error) throw error
    return (data as { alive: boolean }) ?? null
  } catch {
    return null
  }
}

export async function endOtherSessions() {
  return supabase.rpc('end_other_sessions', { p_keep_device_id: DEVICE_ID })
}

export async function endSession(deviceId: string) {
  return supabase.rpc('end_session', { p_device_id: deviceId })
}
```

- [ ] **Step 2: Write the failing tests**

`web/src/api/session.api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({
  supabase: { rpc: vi.fn() },
}))

import { supabase } from './supabase'
import { registerSession, touchSession, unregisterSession, DEVICE_ID } from './session.api'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('DEVICE_ID', () => {
  it('is a non-empty string persisted across calls', () => {
    expect(DEVICE_ID).toMatch(/^dev_/)
  })
})

describe('registerSession', () => {
  it('returns the server result when the RPC succeeds', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { allowed: true, limit: 1 }, error: null } as never)
    const res = await registerSession()
    expect(res).toEqual({ allowed: true, limit: 1 })
    expect(supabase.rpc).toHaveBeenCalledWith('register_session', expect.objectContaining({ p_device_id: DEVICE_ID }))
  })
  it('degrades to allowed:true when the RPC is missing or errors (SQL 026 not applied)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'function does not exist' } } as never)
    const res = await registerSession()
    expect(res).toEqual({ allowed: true, degraded: true })
  })
})

describe('touchSession', () => {
  it('returns null on error instead of throwing', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'network' } } as never)
    expect(await touchSession()).toBeNull()
  })
  it('signals alive:false when the session was closed elsewhere', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { alive: false }, error: null } as never)
    expect(await touchSession()).toEqual({ alive: false })
  })
})

describe('unregisterSession', () => {
  it('never throws even if the RPC fails', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('offline'))
    await expect(unregisterSession()).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 3: Run tests and typecheck**

Run: `npm run test`
Expected: all PASS

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add web/src/api/session.api.ts web/src/api/session.api.test.ts
git commit -m "web: port device/session-limit RPC wrappers"
```

---

## Task 6: Login Page + App Boot Wiring

**Files:**
- Create: `web/src/components/ui/Button.tsx`
- Create: `web/src/components/ui/Input.tsx`
- Create: `web/src/store/toast.store.ts`
- Create: `web/src/components/ui/Toast.tsx`
- Create: `web/src/hooks/useHeartbeat.ts`
- Create: `web/src/pages/LoginPage.tsx`
- Create: `web/src/components/SessionLimitDialog.tsx`
- Modify: `web/src/App.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2–5 (`supabase.ts`, `auth.api.ts`, `session.api.ts`, `auth.store.ts`, `roles.ts`).
- Produces: `App` default export (root component), rendered by `main.tsx`. Task 8 adds a warehouses route inside this same `App`.

- [ ] **Step 1: Write minimal `ui/Button.tsx` and `ui/Input.tsx`**

`web/src/components/ui/Button.tsx`:

```tsx
import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700',
  secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
```

`web/src/components/ui/Input.tsx`:

```tsx
import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
```

- [ ] **Step 2: Write the toast store and component**

`web/src/store/toast.store.ts` (replaces the global `toast()` function from `index.html`):

```ts
import { create } from 'zustand'

export interface ToastMessage {
  id: number
  text: string
  isError: boolean
}

interface ToastState {
  messages: ToastMessage[]
  show: (text: string, isError?: boolean) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  messages: [],
  show: (text, isError = false) =>
    set((s) => ({ messages: [...s.messages, { id: nextId++, text, isError }] })),
  dismiss: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
}))
```

`web/src/components/ui/Toast.tsx`:

```tsx
import { useEffect } from 'react'
import { useToastStore } from '../../store/toast.store'
import { cn } from '../../lib/utils'

export function ToastHost() {
  const { messages, dismiss } = useToastStore()

  useEffect(() => {
    const timers = messages.map((m) => setTimeout(() => dismiss(m.id), 4000))
    return () => timers.forEach(clearTimeout)
  }, [messages, dismiss])

  if (messages.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn(
            'rounded-md px-4 py-2 text-sm text-white shadow-lg',
            m.isError ? 'bg-red-600' : 'bg-slate-900',
          )}
        >
          {m.text}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Write `hooks/useHeartbeat.ts`**

Ported from `index.html` `startHeartbeat`/`stopHeartbeat` (lines 7343–7359).

```ts
import { useEffect } from 'react'
import { touchSession } from '../api/session.api'
import { signOut } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import { useToastStore } from '../store/toast.store'

const HEARTBEAT_MS = 60 * 1000

export function useHeartbeat(enabled: boolean) {
  const reset = useAuthStore((s) => s.reset)
  const show = useToastStore((s) => s.show)

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(async () => {
      const res = await touchSession()
      if (res && res.alive === false) {
        clearInterval(id)
        show('Bu sessiya başqa cihazdan bağlanıb. Yenidən daxil olun.', true)
        setTimeout(async () => {
          await signOut()
          reset()
        }, 1500)
      }
    }, HEARTBEAT_MS)
    return () => clearInterval(id)
  }, [enabled, reset, show])
}
```

- [ ] **Step 4: Write `components/SessionLimitDialog.tsx`**

Ported from `index.html` `sessionLimitDialog` (lines 7481–7492) — simplified to Phase-1 scope (no "end this device" action yet, matching that the original also just shows info + a close button; ending other sessions is on the in-app session-management screen, out of Phase 1 scope per the design's non-goals).

```tsx
import type { RegisterSessionResult } from '../api/session.api'
import { Button } from './ui/Button'

interface Props {
  info: RegisterSessionResult
  onClose: () => void
}

export function SessionLimitDialog({ info, onClose }: Props) {
  const devices = info.devices ?? []
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-3 text-lg font-semibold">Cihaz limiti doludur</h2>
        <p className="mb-4 text-sm text-slate-600">
          Bu hesab üçün eyni vaxtda <b>{info.limit ?? 1}</b> cihaza icazə verilir və hazırda hamısı doludur.
          Aşağıdakı cihazlardan birində çıxış edin və ya 3 dəqiqə gözləyin — fəaliyyəti dayanmış sessiya avtomatik boşalır.
        </p>
        <ul className="mb-4 space-y-1 text-sm">
          {devices.map((d) => (
            <li key={d.device_id} className="rounded border border-slate-200 px-3 py-2">
              {d.device_label} — son fəaliyyət: {new Date(d.last_seen).toLocaleString()}
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button onClick={onClose}>Bağla</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `pages/LoginPage.tsx`**

Ported from `index.html` `boot()` login handler (lines 7557–7582) and session-restore-on-mount (lines 7584–7595).

```tsx
import { useState } from 'react'
import { signIn } from '../api/auth.api'
import { registerSession, type RegisterSessionResult } from '../api/session.api'
import { setRemember, savedEmail, saveEmail } from '../api/supabase'
import { useAuthStore } from '../store/auth.store'
import { useToastStore } from '../store/toast.store'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { SessionLimitDialog } from '../components/SessionLimitDialog'
import { fetchProfile } from '../api/auth.api'
import type { Me } from '../lib/roles'

interface Props {
  onLoggedIn: (me: Me) => void
}

export function LoginPage({ onLoggedIn }: Props) {
  const [email, setEmail] = useState(savedEmail())
  const [password, setPassword] = useState('')
  const [remember, setRememberState] = useState(false)
  const [busy, setBusy] = useState(false)
  const [limitInfo, setLimitInfo] = useState<RegisterSessionResult | null>(null)
  const setError = useAuthStore((s) => s.setError)
  const show = useToastStore((s) => s.show)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      show('E-poçt və şifrəni daxil edin', true)
      return
    }
    setBusy(true)
    setRemember(remember)
    try {
      const { data, error } = await signIn(email, password)
      if (error) throw error
      const reg = await registerSession()
      if (reg.allowed === false) {
        setLimitInfo(reg)
        setBusy(false)
        return
      }
      saveEmail(remember ? email : '')
      const { data: profile, error: profileErr } = await fetchProfile(data.user.id)
      if (profileErr || !profile) throw new Error('İstifadəçi profili tapılmadı. Rəhbər ilə əlaqə saxlayın.')
      if (!profile.active) throw new Error('Hesabınız deaktiv edilib.')
      const me: Me = {
        id: data.user.id,
        sbId: data.user.id,
        email: data.user.email ?? profile.email ?? '',
        name: profile.name || (data.user.email ?? '').split('@')[0],
        role: profile.role || 'baxis',
        wh: profile.warehouse || '',
      }
      onLoggedIn(me)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Giriş xətası'
      setError(message)
      show(message, true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-xl font-semibold">ANBAR</h1>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-slate-600">E-poçt ünvanı</span>
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-slate-600">Şifrə</span>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={remember} onChange={(e) => setRememberState(e.target.checked)} />
          Məni bu cihazda yadda saxla
        </label>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Yüklənir...' : 'Daxil ol'}
        </Button>
      </form>
      {limitInfo && <SessionLimitDialog info={limitInfo} onClose={() => setLimitInfo(null)} />}
    </div>
  )
}
```

- [ ] **Step 6: Wire `App.tsx`**

Ported from `index.html` `boot()`'s session-restore block (lines 7584–7595) and the top of `enterApp` (lines 7503–7514, minus the DOM/`$()` calls and the parts scoped to later phases — `loadFromDB`/`loadAuditUsers`/`subscribeRealtime`/`restoreDraft` are movements/items screens, out of Phase 1).

```tsx
import { useEffect, useState } from 'react'
import { getSession } from './api/auth.api'
import { registerSession, unregisterSession, type RegisterSessionResult } from './api/session.api'
import { fetchProfile, signOut } from './api/auth.api'
import { useAuthStore } from './store/auth.store'
import { useHeartbeat } from './hooks/useHeartbeat'
import { LoginPage } from './pages/LoginPage'
import { SessionLimitDialog } from './components/SessionLimitDialog'
import { ToastHost } from './components/ui/Toast'
import { WarehousesPage } from './pages/WarehousesPage'
import type { Me } from './lib/roles'

function App() {
  const { me, status, setMe, setStatus } = useAuthStore()
  const [restoreLimitInfo, setRestoreLimitInfo] = useState<RegisterSessionResult | null>(null)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      setStatus('loading')
      const session = await getSession()
      if (!session?.user) {
        if (!cancelled) setStatus('idle')
        return
      }
      const reg = await registerSession()
      if (reg.allowed === false) {
        await signOut()
        if (!cancelled) {
          setRestoreLimitInfo(reg)
          setStatus('idle')
        }
        return
      }
      const { data: profile, error } = await fetchProfile(session.user.id)
      if (error || !profile || !profile.active) {
        await signOut()
        if (!cancelled) setStatus('idle')
        return
      }
      const restored: Me = {
        id: session.user.id,
        sbId: session.user.id,
        email: session.user.email ?? profile.email ?? '',
        name: profile.name || (session.user.email ?? '').split('@')[0],
        role: profile.role || 'baxis',
        wh: profile.warehouse || '',
      }
      if (!cancelled) {
        setMe(restored)
        setStatus('ready')
      }
    }
    restore()
    return () => { cancelled = true }
  }, [setMe, setStatus])

  useHeartbeat(status === 'ready')

  useEffect(() => {
    return () => { if (status === 'ready') unregisterSession() }
  }, [status])

  return (
    <>
      <ToastHost />
      {status === 'ready' && me ? (
        <WarehousesPage me={me} />
      ) : (
        <LoginPage onLoggedIn={(loggedInMe) => { setMe(loggedInMe); setStatus('ready') }} />
      )}
      {restoreLimitInfo && <SessionLimitDialog info={restoreLimitInfo} onClose={() => setRestoreLimitInfo(null)} />}
    </>
  )
}

export default App
```

Note: this task imports `WarehousesPage` from Task 8, which doesn't exist yet — Task 6's own verification step (below) therefore stubs it with a one-line placeholder component (`export function WarehousesPage() { return <div>TODO Task 8</div> }` in `pages/WarehousesPage.tsx`) so the app builds; Task 8 replaces the stub with the real implementation.

- [ ] **Step 7: Create the `WarehousesPage` stub so the build succeeds**

`web/src/pages/WarehousesPage.tsx`:

```tsx
import type { Me } from '../lib/roles'

interface Props {
  me: Me
}

export function WarehousesPage({ me }: Props) {
  return <div className="p-8">Logged in as {me.name} — Warehouses UI comes in Task 8.</div>
}
```

- [ ] **Step 8: Typecheck and build**

Run: `npm run typecheck`
Expected: no errors

Run: `npm run build`
Expected: succeeds, produces `web/dist/`

- [ ] **Step 9: Manual verification (local, against live Supabase)**

Run the dev server: `npm run dev -- --port 5174` (background), poll until `curl -sf http://localhost:5174` succeeds.

Using a real browser (the implementer or the user opens `http://localhost:5174`):
1. Confirm the login form renders (email + password + "Məni bu cihazda yadda saxla" + "Daxil ol").
2. Log in with a real admin account. Confirm no console errors, and the app renders the Task-6-stub "Logged in as …" text with the correct name.
3. Reload the page. Confirm the session restores without needing to log in again (session-restore branch in `App.tsx`).
4. Log in with an account that has an unrecognized/legacy role (or temporarily note the role value if none exists) — not required to fabricate a user for this; if no such account exists, skip and note it as untested in the report.
5. `console --errors` equivalent (browser DevTools console) — confirm no uncaught errors during the whole flow.

Stop the dev server afterward (`lsof -ti:5174 -sTCP:LISTEN | xargs -r kill`).

Report the outcome (pass/fail per step, with screenshots if available) before moving to Task 7.

- [ ] **Step 10: Commit**

```bash
git add web/src/components/ui/Button.tsx web/src/components/ui/Input.tsx web/src/components/ui/Toast.tsx \
        web/src/store/toast.store.ts web/src/hooks/useHeartbeat.ts web/src/pages/LoginPage.tsx \
        web/src/components/SessionLimitDialog.tsx web/src/pages/WarehousesPage.tsx web/src/App.tsx
git commit -m "web: login page, session-limit dialog, heartbeat, app boot wiring"
```

---

## Task 7: Warehouses API (Data + Mutations)

**Files:**
- Create: `web/src/api/warehouses.api.ts`
- Create: `web/src/api/warehouses.api.test.ts`
- Create: `web/src/api/referenceDirectory.api.ts`
- Create: `web/src/api/referenceDirectory.api.test.ts`
- Create: `web/src/store/warehouses.store.ts`

**Interfaces:**
- Consumes: `supabase` from `api/supabase.ts`.
- Produces: `WarehouseRow`, `fetchWarehouses()`, `fetchWarehouseUsage(names: string[])` from `api/warehouses.api.ts`; `manageReference(kind, action, id, name, meta)` from `api/referenceDirectory.api.ts`; `useWarehousesStore` (Zustand: `rows`, `usage`, `loading`, `load()`, `refresh()`) from `store/warehouses.store.ts`. Task 8 (`WarehousesPage.tsx`) is the sole consumer.

- [ ] **Step 1: Write `api/warehouses.api.ts`**

`fetchWarehouses` ports the pagination pattern from `fetchAll('warehouses', [])` (`index.html` lines 848–861, `PAGE_SIZE = 1000`). `fetchWarehouseUsage` is the Phase-1-scoped replacement for `refUsage`'s warehouse/location branch (line 2977–2987) agreed with the user: a lightweight per-name existence/count query against `movements` and `users`, **without** loading the full movements dataset — and, as explicitly agreed, it does **not** exclude cancelled movements (the original's `normalMovements()` filter is out of Phase-1 scope), so the count may run slightly higher than the original for warehouses with cancelled history. This is a disclosed, approved limitation — not a bug to fix silently later without telling the user.

```ts
import { supabase } from './supabase'
import type { Database } from '../types/database'

export type WarehouseRow = Database['public']['Tables']['warehouses']['Row']

const PAGE_SIZE = 1000

export async function fetchWarehouses(): Promise<WarehouseRow[]> {
  const out: WarehouseRow[] = []
  let from = 0
  for (let guard = 0; guard < 200; guard++) {
    const { data, error } = await supabase.from('warehouses').select('*').range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const batch = data ?? []
    out.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return out
}

/* Known, user-approved deviation from the original refUsage(): counts
   movements/users rows referencing this warehouse name WITHOUT excluding
   cancelled movements (normalMovements() filtering is out of Phase 1
   scope). May run slightly higher than the original for warehouses with
   cancelled history. Used only for the "İstifadə sayı" hint and the
   used>0 name-lock decision — both degrade gracefully if the count is an
   overestimate (worst case: a warehouse that's actually free to rename
   shows as locked, which is the safe direction to be wrong in). */
export async function fetchWarehouseUsage(names: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  for (const name of names) {
    const [movWarehouse, movPartner, users] = await Promise.all([
      supabase.from('movements').select('id', { count: 'exact', head: true }).ilike('warehouse', name),
      supabase.from('movements').select('id', { count: 'exact', head: true }).ilike('partner', name),
      supabase.from('users').select('id', { count: 'exact', head: true }).ilike('warehouse', name),
    ])
    const total = (movWarehouse.count ?? 0) + (movPartner.count ?? 0) + (users.count ?? 0)
    result.set(name, total)
  }
  return result
}
```

- [ ] **Step 2: Write the failing tests**

`web/src/api/warehouses.api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchWarehouses, fetchWarehouseUsage } from './warehouses.api'

beforeEach(() => vi.clearAllMocks())

describe('fetchWarehouses', () => {
  it('returns all rows from a single page', async () => {
    const range = vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'Elet', type: 'anbar', active: true }], error: null })
    const select = vi.fn().mockReturnValue({ range })
    vi.mocked(supabase.from).mockReturnValue({ select } as never)
    const rows = await fetchWarehouses()
    expect(rows).toHaveLength(1)
    expect(supabase.from).toHaveBeenCalledWith('warehouses')
  })
  it('throws on error', async () => {
    const range = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const select = vi.fn().mockReturnValue({ range })
    vi.mocked(supabase.from).mockReturnValue({ select } as never)
    await expect(fetchWarehouses()).rejects.toBeTruthy()
  })
})

describe('fetchWarehouseUsage', () => {
  it('sums movements(warehouse) + movements(partner) + users(warehouse) counts per name', async () => {
    const ilike = vi.fn().mockResolvedValue({ count: 2, error: null })
    const select = vi.fn().mockReturnValue({ ilike })
    vi.mocked(supabase.from).mockReturnValue({ select } as never)
    const usage = await fetchWarehouseUsage(['Astara'])
    expect(usage.get('Astara')).toBe(6) // 2 + 2 + 2
  })
})
```

- [ ] **Step 3: Write `api/referenceDirectory.api.ts`**

Ported from `index.html` `refSend` (lines 3152–3183), scoped to the RPC wrapper only (the UI-side name/meta assembly moves to Task 8's dialog component).

```ts
import { supabase } from './supabase'

export type ReferenceKind = 'channel' | 'partner' | 'warehouse' | 'location' | 'unit' | 'category' | 'project' | 'serfiyyat_channel'
export type ReferenceAction = 'create' | 'update' | 'deactivate' | 'activate' | 'delete'

export interface ManageReferenceMeta {
  voen?: string
  contract?: string
  contract_date?: string
  linked_warehouse?: string
}

export interface ManageReferenceResult {
  ok: boolean
  kind: string
  action: string
  id: string
  cascaded_rows: number
}

export async function manageReference(
  kind: ReferenceKind,
  action: ReferenceAction,
  id: string | null,
  name: string | null,
  meta: ManageReferenceMeta = {},
): Promise<{ data: ManageReferenceResult | null; error: { message: string } | null }> {
  const { data, error } = await supabase.rpc('manage_reference', {
    p_kind: kind,
    p_action: action,
    p_id: id,
    p_name: name,
    p_meta: meta,
  })
  return { data: (data as ManageReferenceResult) ?? null, error }
}
```

- [ ] **Step 4: Write the failing tests**

`web/src/api/referenceDirectory.api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))

import { supabase } from './supabase'
import { manageReference } from './referenceDirectory.api'

beforeEach(() => vi.clearAllMocks())

describe('manageReference', () => {
  it('calls manage_reference with p_-prefixed params', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { ok: true, kind: 'warehouse', action: 'create', id: '1', cascaded_rows: 0 }, error: null } as never)
    const res = await manageReference('warehouse', 'create', null, 'TEST_REACT_MIGRATION', {})
    expect(supabase.rpc).toHaveBeenCalledWith('manage_reference', {
      p_kind: 'warehouse', p_action: 'create', p_id: null, p_name: 'TEST_REACT_MIGRATION', p_meta: {},
    })
    expect(res.data?.ok).toBe(true)
  })
  it('surfaces server errors (e.g. non-admin, or name locked) without throwing', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'İcazə yoxdur: Sorğuçaları yalnız Admin idarə edir' } } as never)
    const res = await manageReference('warehouse', 'create', null, 'X', {})
    expect(res.error?.message).toMatch(/Admin/)
  })
})
```

- [ ] **Step 5: Write `store/warehouses.store.ts`**

```ts
import { create } from 'zustand'
import { fetchWarehouses, fetchWarehouseUsage, type WarehouseRow } from '../api/warehouses.api'

interface WarehousesState {
  rows: WarehouseRow[]
  usage: Map<string, number>
  loading: boolean
  load: () => Promise<void>
}

export const useWarehousesStore = create<WarehousesState>((set) => ({
  rows: [],
  usage: new Map(),
  loading: false,
  load: async () => {
    set({ loading: true })
    const rows = await fetchWarehouses()
    const usage = await fetchWarehouseUsage(rows.map((r) => r.name))
    set({ rows, usage, loading: false })
  },
}))
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm run test`
Expected: all PASS

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add web/src/api/warehouses.api.ts web/src/api/warehouses.api.test.ts \
        web/src/api/referenceDirectory.api.ts web/src/api/referenceDirectory.api.test.ts \
        web/src/store/warehouses.store.ts
git commit -m "web: warehouses data layer (fetch, usage count, manage_reference wrapper)"
```

---

## Task 8: Warehouses UI

**Files:**
- Create: `web/src/components/ui/Table.tsx`
- Create: `web/src/components/ui/Dialog.tsx`
- Create: `web/src/components/warehouses/WarehouseFormDialog.tsx`
- Modify: `web/src/pages/WarehousesPage.tsx` (replaces the Task-6 stub)

**Interfaces:**
- Consumes: `useWarehousesStore` (Task 7), `manageReference` (Task 7), `isAdmin` (Task 3), `Me` (Task 3).
- Produces: the real `WarehousesPage` default export used by `App.tsx` (already wired in Task 6).

- [ ] **Step 1: Write `ui/Table.tsx`**

```tsx
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-md border border-slate-200', className)}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50 text-slate-600">{children}</thead>
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-2 font-medium">{children}</th>
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('border-t border-slate-100 px-4 py-2', className)}>{children}</td>
}
```

- [ ] **Step 2: Write `ui/Dialog.tsx`**

```tsx
import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  footer: ReactNode
  onClose: () => void
}

export function Dialog({ title, children, footer, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        <div className="mb-4">{children}</div>
        <div className="flex items-center justify-end gap-2">{footer}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `components/warehouses/WarehouseFormDialog.tsx`**

Ported from `index.html` `refOpen` (lines 3077–3122, `kind === 'warehouse'` path only) and `refRemove` (lines 3125–3150).

```tsx
import { useState } from 'react'
import type { WarehouseRow } from '../../api/warehouses.api'
import { manageReference } from '../../api/referenceDirectory.api'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useToastStore } from '../../store/toast.store'

interface Props {
  warehouse: WarehouseRow | null // null = create
  usedCount: number
  onDone: () => void
  onClose: () => void
}

export function WarehouseFormDialog({ warehouse, usedCount, onDone, onClose }: Props) {
  const [name, setName] = useState(warehouse?.name ?? '')
  const [busy, setBusy] = useState(false)
  const show = useToastStore((s) => s.show)

  /* Name is locked once the warehouse is in use — it's the accounting and
     access-control key. Ported from index.html refOpen (line 3085). */
  const nameLocked = !!warehouse && usedCount > 0

  async function send(action: 'create' | 'update' | 'deactivate' | 'activate' | 'delete') {
    if ((action === 'create' || action === 'update') && name.trim().length < 2) {
      show('Ad ən azı 2 simvol olmalıdır', true)
      return
    }
    setBusy(true)
    const { data, error } = await manageReference('warehouse', action, warehouse?.id != null ? String(warehouse.id) : null, name.trim() || null, {})
    setBusy(false)
    if (error) {
      const msg = error.message || 'server xətası'
      show(/duplicate key|unique/i.test(msg) ? 'Bu ad artıq mövcuddur' : 'Soraqça yenilənmədi: ' + msg, true)
      return
    }
    const cascaded = data?.cascaded_rows ?? 0
    show(
      action === 'delete' ? 'Soraqça silindi'
        : action === 'deactivate' ? 'Soraqça gizlədildi'
        : action === 'activate' ? 'Soraqça aktivləşdirildi'
        : cascaded ? `Soraqça yeniləndi (${cascaded} tarixi qeydin mətni uzlaşdırıldı)`
        : 'Soraqça yadda saxlanıldı',
    )
    onDone()
  }

  return (
    <Dialog
      title={warehouse ? 'Anbar — redaktə' : 'Anbar — yeni dəyər'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          {warehouse && warehouse.active !== false && (
            <Button variant="secondary" disabled={busy} onClick={() => send('deactivate')}>Gizlət</Button>
          )}
          {warehouse && warehouse.active === false && (
            <Button variant="secondary" disabled={busy} onClick={() => send('activate')}>Aktiv et</Button>
          )}
          {!nameLocked && (
            <Button disabled={busy} onClick={() => send(warehouse ? 'update' : 'create')}>Yadda saxla</Button>
          )}
        </>
      }
    >
      <label className="mb-2 block text-sm">
        <span className="mb-1 block text-slate-600">Ad</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} readOnly={nameLocked} />
      </label>
      {warehouse && nameLocked && (
        <p className="rounded bg-slate-50 p-3 text-sm text-slate-600">
          Bu anbar <b>{usedCount}</b> qeyddə istifadə olunub. Adı uçot və giriş hüquqlarının açarıdır, ona görə
          dəyişdirilmir. Siyahılardan çıxarmaq üçün <b>Gizlət</b> seçin — keçmiş əməliyyatlar və hesabatlar
          olduğu kimi qalır.
        </p>
      )}
      {warehouse && !nameLocked && usedCount === 0 && (
        <p className="text-sm text-slate-500">Bu dəyər heç bir qeyddə istifadə olunmayıb — adı dəyişdirilə və ya tamamilə silinə bilər.</p>
      )}
    </Dialog>
  )
}
```

- [ ] **Step 4: Write the real `pages/WarehousesPage.tsx`**

Ported from `index.html` `rRefs()` (lines 3008–3074), filtered to `kind === 'warehouse'` rows only (per the Phase-1 scope decision — other `REF_KINDS` are not wired up yet).

```tsx
import { useEffect, useState } from 'react'
import type { Me } from '../lib/roles'
import { isAdmin } from '../lib/roles'
import { useWarehousesStore } from '../store/warehouses.store'
import type { WarehouseRow } from '../api/warehouses.api'
import { Table, Thead, Th, Td } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { WarehouseFormDialog } from '../components/warehouses/WarehouseFormDialog'
import { useToastStore } from '../store/toast.store'

interface Props {
  me: Me
}

export function WarehousesPage({ me }: Props) {
  const { rows, usage, loading, load } = useWarehousesStore()
  const [editing, setEditing] = useState<WarehouseRow | null | 'new'>(null)
  const show = useToastStore((s) => s.show)

  useEffect(() => { load() }, [load])

  const warehouseRows = rows.filter((r) => r.type === 'anbar')

  function openEdit(row: WarehouseRow) {
    if (!isAdmin(me)) { show('Soraqçalar yalnız Admin üçündür', true); return }
    setEditing(row)
  }

  function openCreate() {
    if (!isAdmin(me)) { show('Soraqçalar yalnız Admin üçündür', true); return }
    setEditing('new')
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Anbarlar</h1>
        {isAdmin(me) && <Button onClick={openCreate}>Əlavə et +</Button>}
      </div>
      {loading ? (
        <p className="text-slate-500">Yüklənir...</p>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Ad</Th>
              <Th>İstifadə</Th>
              <Th>Status</Th>
              <Th>Əməliyyatlar</Th>
            </tr>
          </Thead>
          <tbody>
            {warehouseRows.map((r) => (
              <tr key={r.id}>
                <Td><b>{r.name}</b></Td>
                <Td>{usage.get(r.name) ?? 0}</Td>
                <Td>{r.active !== false ? <span className="text-emerald-600">Aktiv</span> : <span className="text-slate-400">Gizli</span>}</Td>
                <Td>
                  {isAdmin(me) && (
                    <Button variant="secondary" onClick={() => openEdit(r)}>Redaktə et</Button>
                  )}
                </Td>
              </tr>
            ))}
            {warehouseRows.length === 0 && (
              <tr><Td className="text-center text-slate-400">Anbar tapılmadı</Td></tr>
            )}
          </tbody>
        </Table>
      )}
      {editing && (
        <WarehouseFormDialog
          warehouse={editing === 'new' ? null : editing}
          usedCount={editing === 'new' ? 0 : usage.get(editing.name) ?? 0}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Typecheck and build**

Run: `npm run typecheck`
Expected: no errors

Run: `npm run build`
Expected: succeeds

- [ ] **Step 6: Manual read-path verification (local, live Supabase)**

Start dev server on port 5174 as in Task 6. Log in as an admin account.

1. Confirm the "Anbarlar" table renders with the real warehouse list (Elet, Astara, Xocahesen, Harmony, Ofis, or whatever is currently active in the live project) and plausible usage counts.
2. Log in as a `rehber` or `anbardar` account. Confirm "Əlavə et +" and "Redaktə et" are hidden (not just disabled) — matches `isAdmin(me)` gating.
3. Click "Redaktə et" on a warehouse that has `usedCount > 0` (as admin). Confirm the name field is read-only and "Yadda saxla" is absent, only "Gizlət" is offered — matches `nameLocked`.

- [ ] **Step 7: Manual write-path verification — throwaway record (explicitly approved by the user)**

As admin:
1. Click "Əlavə et +", type `TEST_REACT_MIGRATION`, save. Confirm a toast "Soraqça yadda saxlanıldı" and the row appears in the table.
2. Click "Redaktə et" on the new row. Confirm the name is still editable (usedCount should be 0) and "Sil" is not present in this UI (Phase 1 only wires deactivate/activate/save, matching the current `WarehouseFormDialog` — full delete was in the original `refRemove` dialog; note this as a small, disclosed Phase-1 UI gap: delete-when-unused isn't wired up yet, only create/update/deactivate/activate are — flag this for the user rather than silently shipping it, and add a delete button before calling Phase 1 fully done if the user wants full parity here).
3. Click "Gizlət". Confirm the row shows "Gizli" status. This deactivates the throwaway record — leave it deactivated (do not delete it, to keep the audit trail exactly as `manage_reference`'s own logic intends).
4. Confirm in the live Supabase dashboard (Table Editor → `warehouses`) that the row exists with `name = 'TEST_REACT_MIGRATION'`, `active = false` — screenshot or note this for the report.

- [ ] **Step 8: Address the Step-7 delete gap before declaring Task 8 done**

Add a "Sil" (delete) button to `WarehouseFormDialog.tsx`'s footer, shown only when `!warehouse` is false, `usedCount === 0`, matching `refRemove`'s unused-value branch (`index.html` lines 3131–3137):

```tsx
{warehouse && usedCount === 0 && (
  <Button variant="danger" disabled={busy} onClick={() => send('delete')}>Tamamilə sil</Button>
)}
```

Insert this alongside the existing deactivate/activate/save buttons in the footer JSX from Step 3. Re-run `npm run typecheck` and `npm run build`, then repeat Step 7 but this time delete the `TEST_REACT_MIGRATION` record via "Tamamilə sil" instead of leaving it deactivated — confirm it disappears from the table and, in Supabase Table Editor, the row is gone.

- [ ] **Step 9: Commit**

```bash
git add web/src/components/ui/Table.tsx web/src/components/ui/Dialog.tsx \
        web/src/components/warehouses/WarehouseFormDialog.tsx web/src/pages/WarehousesPage.tsx
git commit -m "web: warehouses list, create/edit/deactivate/delete UI"
```

---

## Task 9: Final Integration Report

**Files:** none created — this task produces a written report, not code.

- [ ] **Step 1: Full clean build from scratch**

```bash
cd "Codex_Code_chat/anbar-platformasi-github/web"
rm -rf node_modules dist
npm install
npm run typecheck
npm run test
npm run build
```

Expected: all four commands succeed with no errors.

- [ ] **Step 2: Full manual walkthrough (repeat, end to end, in one sitting)**

Start the dev server, then walk through, in order: login as admin → session persists on reload → log out → log in as `rehber` → confirm read-only (no Anbarlar admin buttons) → log in as `anbardar` → confirm same → back to admin → create `TEST_REACT_MIGRATION` → edit it → deactivate it → reactivate it → delete it. Note pass/fail for each step.

- [ ] **Step 3: Confirm the deploy boundary was respected**

```bash
git log --oneline main..react-migration
git status
```

Expected: a clean list of local-only commits ahead of `main`, nothing staged/uncommitted, and confirm no `git push` was ever run against `react-migration` during this plan (check shell history / this session's tool-call log if executed by an agent).

- [ ] **Step 4: Write the report**

Summarize for the user: what was built (skeleton, auth+session port, warehouses CRUD), what was verified and how (list each manual check's pass/fail from Steps 2 and Task 6/8's manual steps), the known disclosed deviations (warehouse usage-count doesn't exclude cancelled movements — Task 7; delete button was added in Task 8 Step 8), and explicitly state: **nothing has been pushed, merged, or deployed — the branch is local-only, awaiting your decision on next steps** (start Phase 2, or proceed toward push/deploy of Phase 1).

No commit for this task (report only).
