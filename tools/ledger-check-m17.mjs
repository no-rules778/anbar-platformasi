#!/usr/bin/env node
// Phase 17 (Module T) ledger validator — read-only.
//
// Validates the authoritative M17 ledger in
//   docs/superpowers/specs/2026-09-12-phase17-registry-rows.md
// against CLAUDE_RELIABILITY_PROTOCOL.md §10, §15, §17 and §18.
//
// WHY A SEPARATE FILE (recorded for the audit, and raised as D-T8):
// `tools/ledger-check.mjs` is hard-wired to Phase 9 in five places — the
// ledger path, EXPECTED_TOTAL, the `/^\|\s*M9-/` row regex, the M9 range
// regex and the `phase9` summary scope — and carries 27 end-to-end fixtures
// that pin those. Parameterising an ACCEPTED tool is a change to Phase 9's
// evidence base and is outside the approved Phase 17 scope, so this checker
// is additive and leaves that file untouched. Unifying the two is D-T8.
//
// SINGLE SOURCE OF TRUTH (§18): every status total is DERIVED from the
// `| M17-* |` status cells. NOTHING here hardcodes a count. Only structural
// facts are configuration: the ledger path, the status vocabulary and the
// required tally categories. A future promotion edits the ledger alone.
//
// §17: a row is classified by the PRIMARY status at the START of its final
// table cell, never by searching the whole row for status words — an
// explanation may legitimately contain another status phrase.
//
// Usage:
//   node tools/ledger-check-m17.mjs              validate the real ledger
//   node tools/ledger-check-m17.mjs --self-test  run the fixtures
//
// Exit 0 = pass, 1 = fail. No dependencies, no network, no writes.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..')

const LEDGER = 'docs/superpowers/specs/2026-09-12-phase17-registry-rows.md'

/** Longest-first so `LIVE VERIFIED` is never shadowed by a shorter prefix. */
const STATUSES = [
  'CODE VERIFIED',
  'LIVE VERIFIED',
  'NOT STARTED',
  'IN PROGRESS',
  'BLOCKED',
  'ACCEPTED',
]

/** Categories the authoritative tally table must carry exactly once. */
const REQUIRED_TALLY_CATEGORIES = [
  'CODE VERIFIED',
  'NOT STARTED',
  'LIVE VERIFIED',
  'IN PROGRESS',
  'BLOCKED',
  'unclassified',
  'total unique',
]

const ROW_RE = /^\|\s*M17-/

// ---------------------------------------------------------------- parsing

/** Split one markdown table line into trimmed cells. */
export function splitCells(line) {
  return line.split('|').slice(1, -1).map((s) => s.trim())
}

/** §17 — classify by the primary status at the START of the status cell. */
export function primaryStatus(statusCell) {
  const stripped = statusCell.replace(/^[*_\s`]+/, '').toUpperCase()
  for (const s of STATUSES) if (stripped.startsWith(s)) return s
  return null
}

/** Parse `| M17-* |` rows into ordered rows plus an id -> status map. */
export function parseLedger(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!ROW_RE.test(line)) continue
    const cells = splitCells(line)
    const id = cells[0].replace(/[*`]/g, '').trim()
    const statusCell = cells[cells.length - 1]
    rows.push({ id, cells, statusCell, status: primaryStatus(statusCell) })
  }
  const map = new Map()
  const duplicates = []
  for (const r of rows) {
    if (map.has(r.id)) duplicates.push(r.id)
    else map.set(r.id, r.status)
  }
  return { rows, map, duplicates }
}

/** DERIVED totals — the single source of truth for every comparison (§18). */
export function tally(map) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]))
  counts.unclassified = 0
  for (const status of map.values()) {
    if (status) counts[status] += 1
    else counts.unclassified += 1
  }
  return counts
}

/** Parse the `| Category | **n** |` tally table into a category -> n map. */
export function parseTallyTable(text) {
  const found = new Map()
  const dupes = []
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|/.test(line) || ROW_RE.test(line)) continue
    const cells = splitCells(line)
    if (cells.length !== 2) continue
    const label = cells[0].replace(/[*`]/g, '').trim()
    const m = cells[1].replace(/[*`]/g, '').trim().match(/^(\d+)$/)
    if (!m) continue
    if (found.has(label)) dupes.push(label)
    else found.set(label, Number(m[1]))
  }
  return { found, dupes }
}

/** Uniform cell count across every data row — a shape guard, not a total. */
export function cellWidths(rows) {
  return [...new Set(rows.map((r) => r.cells.length))].sort((a, b) => a - b)
}

/** The authoritative Module T ledger claims M17-01…M17-N with no gaps. */
export function missingSequenceIds(map) {
  const nums = [...map.keys()]
    .map((id) => id.match(/^M17-(\d+)$/))
    .filter(Boolean)
    .map((m) => Number(m[1]))
  if (nums.length !== map.size || nums.length === 0) return ['invalid M17 id shape']
  const top = Math.max(...nums)
  const present = new Set(nums)
  const missing = []
  for (let n = 1; n <= top; n += 1) if (!present.has(n)) missing.push(`M17-${String(n).padStart(2, '0')}`)
  return missing
}

// ------------------------------------------------------------- validation

export function validate({ ledgerText }) {
  const failures = []
  const { rows, map, duplicates } = parseLedger(ledgerText)
  const counts = tally(map)

  if (rows.length === 0) failures.push('no `| M17-* |` rows found')
  for (const id of new Set(duplicates)) failures.push(`duplicate row id: ${id}`)
  const missingIds = missingSequenceIds(map)
  if (missingIds.length) failures.push(`non-contiguous M17 id sequence: ${missingIds.join(', ')}`)
  if (counts.unclassified > 0) {
    const bad = rows.filter((r) => !r.status).map((r) => r.id)
    failures.push(`unclassified status cell(s): ${bad.join(', ')}`)
  }

  const widths = cellWidths(rows)
  if (widths.length > 1) {
    failures.push(`non-uniform table rows: cell counts ${widths.join(' / ')}`)
  }

  const statusSum = STATUSES.reduce((a, s) => a + counts[s], 0) + counts.unclassified
  if (statusSum !== map.size) {
    failures.push(`status counts sum to ${statusSum} but there are ${map.size} unique rows`)
  }

  // §18 — the tally table must carry each required category exactly once and
  // agree with the DERIVED totals. Missing, duplicate and unknown all fail.
  const { found, dupes } = parseTallyTable(ledgerText)
  for (const d of new Set(dupes)) failures.push(`tally table repeats category: ${d}`)
  for (const cat of REQUIRED_TALLY_CATEGORIES) {
    if (!found.has(cat)) {
      failures.push(`tally table is missing the category: ${cat}`)
      continue
    }
    const claimed = found.get(cat)
    const derived = cat === 'total unique' ? map.size : counts[cat]
    if (claimed !== derived) {
      failures.push(`tally table claims ${cat} = ${claimed} but rows derive ${derived}`)
    }
  }
  for (const label of found.keys()) {
    if (!REQUIRED_TALLY_CATEGORIES.includes(label)) {
      failures.push(`tally table carries an unknown category: ${label}`)
    }
  }

  // §15 — the ledger's own banner must restate the derived totals. Every
  // "<n> `STATUS`" pair in the banner is compared, plus the unique-row figure.
  const banner = ledgerText.split(/\r?\n/).slice(0, 20).join(' ')
  let bannerClaims = 0
  for (const s of STATUSES) {
    const re = new RegExp(`(\\d+)\\s*\`?${s}\`?`, 'gi')
    let m
    while ((m = re.exec(banner))) {
      bannerClaims++
      if (Number(m[1]) !== counts[s]) {
        failures.push(`banner claims ${s} = ${m[1]} but rows derive ${counts[s]}`)
      }
    }
  }
  const uniq = banner.match(/\*\*(\d+)\s+unique rows\*\*/)
  if (uniq) {
    bannerClaims++
    if (Number(uniq[1]) !== map.size) {
      failures.push(`banner claims ${uniq[1]} unique rows but ${map.size} were parsed`)
    }
  }
  const uncl = banner.match(/(\d+)\s+unclassified/)
  if (uncl) {
    bannerClaims++
    if (Number(uncl[1]) !== counts.unclassified) {
      failures.push(`banner claims ${uncl[1]} unclassified but rows derive ${counts.unclassified}`)
    }
  }
  if (bannerClaims === 0) failures.push('ledger banner restates no numeric tally')

  return { failures, counts, map, rows, bannerClaims }
}

// -------------------------------------------------------------- self-test

function selfTest() {
  const results = []
  const t = (name, fn) => {
    try { fn(); results.push([true, name]) } catch (e) { results.push([false, `${name} — ${e.message}`]) }
  }
  const assert = (c, m) => { if (!c) throw new Error(m) }

  const TABLE = (cv, ns, lv, ip, bl, un, tot) =>
    ['| Status | Rows |', '|---|---|',
      `| \`CODE VERIFIED\` | **${cv}** |`, `| \`NOT STARTED\` | **${ns}** |`,
      `| \`LIVE VERIFIED\` | **${lv}** |`, `| \`IN PROGRESS\` | **${ip}** |`,
      `| \`BLOCKED\` | **${bl}** |`, `| unclassified | **${un}** |`,
      `| **total unique** | **${tot}** |`].join('\n')

  const BANNER = (cv, lv, ip, ns, bl, tot) =>
    `**Current tally:** ${cv} \`CODE VERIFIED\`, ${lv} \`LIVE VERIFIED\`, ${ip} \`IN PROGRESS\`, ` +
    `${ns} \`NOT STARTED\`, ${bl} \`BLOCKED\`, 0 unclassified; **${tot} unique rows**, 0 duplicates.`

  const ROWS = [
    '| ID | Surface | Exact contract | Evidence | Status |', '|---|---|---|---|---|',
    '| M17-01 | A | c | e | CODE VERIFIED |',
    '| M17-02 | A | c | e | CODE VERIFIED |',
    '| M17-03 | A | c | e | NOT STARTED |',
    '| M17-04 | A | c | e | BLOCKED |',
  ].join('\n')

  const good = [BANNER(2, 0, 0, 1, 1, 4), TABLE(2, 1, 0, 0, 1, 0, 4), ROWS].join('\n\n')

  t('a consistent ledger passes', () => {
    const { failures } = validate({ ledgerText: good })
    assert(failures.length === 0, JSON.stringify(failures))
  })

  t('§17: a status cell whose EXPLANATION names another status is not misread', () => {
    const mixed = good.replace(
      '| M17-03 | A | c | e | NOT STARTED |',
      '| M17-03 | A | c | e | NOT STARTED — the CODE VERIFIED sibling row does not cover it |',
    )
    const { counts, failures } = validate({ ledgerText: mixed })
    assert(counts['NOT STARTED'] === 1, `NOT STARTED miscounted: ${counts['NOT STARTED']}`)
    assert(counts['CODE VERIFIED'] === 2, `whole-row search leaked: ${counts['CODE VERIFIED']}`)
    assert(failures.length === 0, JSON.stringify(failures))
  })

  t('a duplicate id fails', () => {
    const dup = good.replace('| M17-04 | A | c | e | BLOCKED |',
      '| M17-04 | A | c | e | BLOCKED |\n| M17-01 | A | c | e | BLOCKED |')
    const { failures } = validate({ ledgerText: dup })
    assert(failures.some((f) => /duplicate row id: M17-01/.test(f)), JSON.stringify(failures))
  })

  t('a gap in the claimed contiguous id sequence fails', () => {
    const gap = good.replace(/\| M17-03 .*\n/, '')
      .replace(BANNER(2, 0, 0, 1, 1, 4), BANNER(2, 0, 0, 0, 1, 3))
      .replace(TABLE(2, 1, 0, 0, 1, 0, 4), TABLE(2, 0, 0, 0, 1, 0, 3))
    const { failures } = validate({ ledgerText: gap })
    assert(failures.some((f) => /non-contiguous M17 id sequence: M17-03/.test(f)), JSON.stringify(failures))
  })

  t('an unclassified status cell fails and is named', () => {
    const bad = good.replace('| M17-03 | A | c | e | NOT STARTED |', '| M17-03 | A | c | e | TODO |')
    const { failures } = validate({ ledgerText: bad })
    assert(failures.some((f) => /unclassified status cell\(s\): M17-03/.test(f)), JSON.stringify(failures))
  })

  t('a stale tally-table figure fails (control: the correct one passes)', () => {
    const stale = [BANNER(2, 0, 0, 1, 1, 4), TABLE(3, 1, 0, 0, 1, 0, 4), ROWS].join('\n\n')
    const { failures } = validate({ ledgerText: stale })
    assert(failures.some((f) => /tally table claims CODE VERIFIED = 3 but rows derive 2/.test(f)),
      JSON.stringify(failures))
  })

  t('an OMITTED tally category fails rather than passing vacuously', () => {
    const missing = good.replace('| `BLOCKED` | **1** |\n', '')
    const { failures } = validate({ ledgerText: missing })
    assert(failures.some((f) => /missing the category: BLOCKED/.test(f)), JSON.stringify(failures))
  })

  t('a stale BANNER figure fails even when the tally table is right', () => {
    const stale = [BANNER(3, 0, 0, 1, 1, 4), TABLE(2, 1, 0, 0, 1, 0, 4), ROWS].join('\n\n')
    const { failures } = validate({ ledgerText: stale })
    assert(failures.some((f) => /banner claims CODE VERIFIED = 3 but rows derive 2/.test(f)),
      JSON.stringify(failures))
  })

  t('a wrong unique-row banner figure fails', () => {
    const stale = [BANNER(2, 0, 0, 1, 1, 9), TABLE(2, 1, 0, 0, 1, 0, 4), ROWS].join('\n\n')
    const { failures } = validate({ ledgerText: stale })
    assert(failures.some((f) => /banner claims 9 unique rows but 4 were parsed/.test(f)),
      JSON.stringify(failures))
  })

  t('a non-uniform row width fails', () => {
    const ragged = good.replace('| M17-02 | A | c | e | CODE VERIFIED |', '| M17-02 | A | c | CODE VERIFIED |')
    const { failures } = validate({ ledgerText: ragged })
    assert(failures.some((f) => /non-uniform table rows/.test(f)), JSON.stringify(failures))
  })

  const failed = results.filter(([ok]) => !ok)
  for (const [ok, name] of results) console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`)
  console.log(`\n${results.length - failed.length}/${results.length} fixtures passed`)
  return failed.length === 0
}

// ------------------------------------------------------------------ main

const INVOKED_DIRECTLY =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (!INVOKED_DIRECTLY) {
  // imported: export-only
} else if (process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1)
} else {
  const ledgerText = readFileSync(resolve(REPO, LEDGER), 'utf8')
  const { failures, counts, map, rows, bannerClaims } = validate({ ledgerText })

  console.log('Phase 17 ledger check —', LEDGER)
  console.log('  parsed rows     :', rows.length)
  console.log('  unique ids      :', map.size)
  console.log('  duplicates      :', rows.length - map.size)
  for (const s of STATUSES) console.log(`  ${s.padEnd(16)}:`, counts[s])
  console.log('  unclassified    :', counts.unclassified)
  console.log('  uniform cells   :', cellWidths(rows).join(' / '))
  console.log('  contiguous ids  :', missingSequenceIds(map).length === 0 ? 'yes' : 'no')

  if (failures.length) {
    console.error('\nFAIL — ledger inconsistencies:')
    for (const f of failures) console.error('  - ' + f)
    process.exit(1)
  }
  console.log(
    `\nPASS — ${map.size} unique contiguous rows parsed, 0 duplicates, 0 unclassified, uniform row shape; ` +
      `the tally table carries each of the ${REQUIRED_TALLY_CATEGORIES.length} required categories ` +
      `exactly once and equals the derived totals; the banner's ${bannerClaims} numeric claim(s) ` +
      `were each compared against those totals.`,
  )
}
