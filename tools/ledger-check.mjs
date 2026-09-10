#!/usr/bin/env node
// Phase 9 ledger validator — read-only.
//
// Validates the authoritative M9 ledger in
//   docs/superpowers/specs/2026-09-10-phase9-registry-rows.md
// against CLAUDE_RELIABILITY_PROTOCOL.md §10, §15, §16, §17 and §18.
//
// SINGLE SOURCE OF TRUTH (§18): status totals are DERIVED from the `| M9-* |`
// row status cells. They are never hardcoded here. Only structural facts are
// configuration: the ledger path, the allowed status vocabulary, the required
// tally categories and the expected total row count. A future promotion
// changes the ledger only — this checker needs no edit.
//
// Load-bearing design note (§17): a row is classified by the PRIMARY status at
// the start of its final table cell, never by searching the whole row for
// status words. M9-71 is the regression fixture: its status cell begins
// `IN PROGRESS` but legitimately contains the phrase `CODE VERIFIED` for the
// sorting sub-clause. Whole-row substring counting misclassifies it and
// reproduces the stale 38 / 84 / 1 / 1 tally.
//
// Summary strategy (§15, §18 — corrected 2026-09-10): EVERY current numeric
// status claim in each summary file is validated, not only the first
// four-figure match. A claim is a number attached to a status category, a
// slash tuple of four or more figures, or a qualified row total. Claims inside
// HISTORY/SUPERSEDED sentences are excluded sentence-by-sentence; nothing else
// is. Two conflicting current summaries therefore cannot both pass, and a
// claim's BLOCKED / ACCEPTED / unclassified / total / unique figures are
// compared as strictly as its CODE VERIFIED figure.
//
// Usage:
//   node tools/ledger-check.mjs              validate the real ledger
//   node tools/ledger-check.mjs --self-test  run the end-to-end fixtures
//
// Exit 0 = pass, 1 = fail. No dependencies, no network, no writes.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..')

// ------------------------------------------------- structural configuration
// Stable facts about the ledger's SHAPE. No status totals live here (§18).

const LEDGER = 'docs/superpowers/specs/2026-09-10-phase9-registry-rows.md'

/** Total M9 rows the Phase 9 ledger is defined to contain. */
const EXPECTED_TOTAL = 124

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

/**
 * Current authoritative summary locations (§15). Each must either restate the
 * derived totals correctly or explicitly defer to the ledger.
 */
const SUMMARY_FILES = [
  { file: LEDGER, label: 'ledger latest banner' },
  // Multi-phase files: only paragraphs that name Phase 9 / Module J / an M9
  // row are Phase 9 claims. Other modules' tallies are not compared here.
  {
    file: 'docs/superpowers/ANBAR_FUNCTIONAL_PARITY_REGISTRY.md',
    label: 'parity registry banner',
    scope: 'phase9',
  },
  { file: 'docs/superpowers/CLAUDE_NEXT_PROMPT.md', label: 'next-prompt banner', scope: 'phase9' },
  {
    file: 'docs/superpowers/audits/2026-09-10-phase9-t3-balances-page.md',
    label: 'current (T3) audit verdict',
  },
]

// ---------------------------------------------------------------- parsing

/** Split one markdown table line into trimmed cells. */
export function splitCells(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map((s) => s.trim())
}

/**
 * §17 — classify by the primary status at the START of the authoritative
 * status cell. Leading emphasis/backticks are stripped; any explanatory text
 * after the primary token is deliberately ignored.
 */
export function primaryStatus(statusCell) {
  const stripped = statusCell.replace(/^[*_\s`]+/, '').toUpperCase()
  for (const s of STATUSES) if (stripped.startsWith(s)) return s
  return null
}

/** Parse `| M9-* |` rows into an id -> primary-status map. */
export function parseLedger(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|\s*M9-/.test(line)) continue
    const cells = splitCells(line)
    const id = cells[0].replace(/[*`]/g, '').trim()
    const statusCell = cells[cells.length - 1]
    rows.push({ id, statusCell, status: primaryStatus(statusCell) })
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

// ---------------------------------------------------- range expansion (§16)

/** Expand `M9-70…M9-77` into concrete ids, using the ledger's own id order. */
export function expandRange(fromId, toId, orderedIds) {
  const a = orderedIds.indexOf(fromId)
  const b = orderedIds.indexOf(toId)
  if (a === -1 || b === -1 || b < a) return null
  return orderedIds.slice(a, b + 1)
}

const RANGE_RE = /\bM9-[0-9]+[a-z]?\s*(?:…|\.\.\.|—)\s*M9-[0-9]+[a-z]?/g

/** A statement asserts a status only if it names one outside a bare scope mention. */
export function assertsStatus(line) {
  return STATUSES.some((s) => line.toUpperCase().includes(s))
}

/**
 * The statement a line belongs to: the line itself plus following wrapped
 * continuation lines, up to a blank line or paragraph break.
 *
 * Load-bearing: a claim like "**M9-55, M9-70…M9-77, M9-79, M9-79a,\n> M9-79b
 * and M9-84 are `CODE VERIFIED`**" wraps the range onto one line and its
 * status token onto the next. A line-scoped status test returns false for the
 * range line and silently skips the §16 check, so a real inclusive-range
 * defect passes. Ranges must be judged against the whole statement.
 */
export function statementWindow(lines, i) {
  const strip = (s) => s.replace(/^\s*>?\s?/, '')
  let out = strip(lines[i])
  for (let j = i + 1; j < lines.length; j++) {
    const body = strip(lines[j])
    if (body.trim() === '') break
    out += ' ' + body
    if (/[.;]\s*$/.test(body)) break
  }
  return out
}

/**
 * §16 — find claimed ranges whose members do not all share one status.
 *
 * Only statements that actually ASSERT a status are checked. A range named
 * purely as slice scope makes no status claim; HISTORY/SUPERSEDED statements
 * are likewise exempt.
 */
export function findUnsafeRanges(text, map, orderedIds) {
  const problems = []
  const lines = text.split(/\r?\n/)
  lines.forEach((line, i) => {
    if (!RANGE_RE.test(line)) return
    RANGE_RE.lastIndex = 0
    const stmt = statementWindow(lines, i)
    if (/\bHISTORY\b|\bSUPERSEDED\b/i.test(stmt)) return
    // A line that explicitly labels itself as scope makes no status claim,
    // even when the following statement in the window carries a status token.
    if (/not a status claim|rows examined/i.test(line)) return
    if (!assertsStatus(stmt)) return
    for (const match of line.match(RANGE_RE) ?? []) {
      const [fromId, toId] = match.split(/…|\.\.\.|—/).map((s) => s.trim())
      const ids = expandRange(fromId, toId, orderedIds)
      if (!ids) continue
      const statuses = new Set(ids.map((id) => map.get(id)))
      if (statuses.size > 1) {
        const odd = ids.filter((id) => map.get(id) !== map.get(ids[0]))
        problems.push({
          line: i + 1,
          range: match,
          exceptions: odd.map((id) => `${id}=${map.get(id)}`),
        })
      }
    }
  })
  return problems
}

// ------------------------------------------------- authoritative tally table

const TALLY_ROW_RE =
  /^\|\s*\*{0,2}`?(CODE VERIFIED|NOT STARTED|LIVE VERIFIED|IN PROGRESS|BLOCKED|unclassified|total unique)`?\*{0,2}\s*\|\s*\*{0,2}(\d+)\*{0,2}/i

/** Any `| Something | 12 |` row inside the tally table, for unknown-category detection. */
const ANY_TALLY_ROW_RE = /^\|\s*([^|]+?)\s*\|\s*\*{0,2}(\d+)\*{0,2}[^|]*\|/

/**
 * Parse the authoritative tally table (§15).
 *
 * Returns every category occurrence so missing, duplicate and unknown
 * categories are all detectable — `continue`-on-undefined used to make an
 * omitted category pass vacuously.
 */
export function parseTallyTable(text) {
  const occurrences = []
  const unknown = []
  let inTable = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    // The tally table is the one headed `| Status | Rows |`.
    if (/^\|\s*Status\s*\|\s*Rows\s*\|/i.test(line)) {
      inTable = true
      continue
    }
    if (inTable) {
      if (!line.startsWith('|')) break
      if (/^\|[-\s|]+\|$/.test(line)) continue
      const m = line.match(TALLY_ROW_RE)
      if (m) {
        const key = /total unique/i.test(m[1]) ? 'total unique' : m[1].toUpperCase()
        const canonical =
          key === 'UNCLASSIFIED' ? 'unclassified' : key === 'total unique' ? 'total unique' : key
        occurrences.push({ category: canonical, value: Number(m[2]) })
      } else {
        const any = line.match(ANY_TALLY_ROW_RE)
        if (any) unknown.push(any[1].replace(/[*`]/g, '').trim())
      }
    }
  }
  return { occurrences, unknown }
}

/**
 * §15 + §18 — the tally table must carry each required category exactly once,
 * carry nothing else, and every number must equal the DERIVED total.
 */
export function validateTallyTable(text, counts, uniqueCount) {
  const failures = []
  const { occurrences, unknown } = parseTallyTable(text)

  const seen = new Map()
  for (const o of occurrences) {
    if (!seen.has(o.category)) seen.set(o.category, [])
    seen.get(o.category).push(o.value)
  }

  for (const cat of REQUIRED_TALLY_CATEGORIES) {
    const values = seen.get(cat)
    if (!values) {
      failures.push(`authoritative tally table is missing the \`${cat}\` row`)
      continue
    }
    if (values.length > 1) {
      failures.push(
        `authoritative tally table has ${values.length} \`${cat}\` rows (${values.join(', ')}); exactly one is required`,
      )
      continue
    }
    const derived = cat === 'total unique' ? uniqueCount : counts[cat]
    if (values[0] !== derived) {
      failures.push(
        `authoritative tally table says ${cat} = ${values[0]}, rows derive ${derived}`,
      )
    }
  }

  for (const cat of seen.keys()) {
    if (!REQUIRED_TALLY_CATEGORIES.includes(cat)) {
      failures.push(`authoritative tally table has an unknown category \`${cat}\``)
    }
  }
  for (const u of unknown) {
    failures.push(`authoritative tally table has an unknown category \`${u}\``)
  }

  return failures
}

// -------------------------------------------- current summary banners (§15)

/**
 * Strip HISTORY/SUPERSEDED statements so a superseded figure in the same file
 * is never read as a current claim.
 */
/**
 * A genuine HISTORY/SUPERSEDED *label*, not incidental prose.
 *
 * Load-bearing: the registry banner says "the banner below ... is superseded on
 * that point" in ordinary lowercase prose. Treating that as a marker blanked
 * the CURRENT tally three lines below it. Only an uppercase token in a
 * labelling position counts — "**SUPERSEDED TALLY:**", "SUPERSEDED —",
 * "is HISTORY:", "**HISTORY**".
 */
// The token may be followed by a short uppercase label and/or a parenthetical
// before its punctuation: "**SUPERSEDED TALLY (2026-09-10):**", "is HISTORY:",
// "SUPERSEDED —", "**HISTORY**". Lowercase prose ("is superseded on that
// point") must NOT match, so the token itself is matched case-sensitively.
const MARKER_RE =
  /\b(HISTORY|SUPERSEDED)\b(?:\s+[A-Z][A-Z0-9-]*)*(?:\s*\([^)]*\))?\s*(?:[-—:,)]|\*\*|$)/


/**
 * Current statements of one summary file: blockquotes unwrapped, ledger rows
 * and the authoritative tally table removed (they are validated elsewhere),
 * paragraphs joined, split into sentences, HISTORY/SUPERSEDED sentences
 * dropped. With scope 'phase9' only paragraphs that name Phase 9, Module J or
 * an M9 row are kept — the registry and next-prompt carry other phases' tallies
 * that are not Phase 9 claims.
 */
export function currentStatements(text, { scope } = {}) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*>\s?/, ''))
  const statements = []
  let para = []
  let inTally = false

  const flush = () => {
    if (!para.length) return
    const joined = para.join(' ')
    para = []
    if (scope === 'phase9' && !/\bM9-|Phase 9|Module J/i.test(joined)) return
    // Sentence-final punctuation may be followed by closing emphasis or
    // backticks before the space ("... 0 unclassified.**"), so that trailing
    // run is allowed before the split.
    for (const sentence of joined.split(/(?<=[.;][*`_)]*)\s+/)) {
      if (MARKER_RE.test(sentence)) continue
      statements.push(sentence)
    }
  }

  for (const line of lines) {
    const t = line.trim()
    if (t === '') {
      flush()
      inTally = false
      continue
    }
    if (/^\|\s*Status\s*\|\s*Rows\s*\|/i.test(t)) {
      flush()
      inTally = true
      continue
    }
    if (inTally && t.startsWith('|')) continue
    inTally = false
    if (/^\|\s*M9-/.test(t)) continue
    para.push(line)
  }
  flush()
  return statements
}

/** Backward-compatible text form of the current statements. */
export function currentText(text, opts) {
  return currentStatements(text, opts).join('\n')
}

// A figure attached to a category: "37 `CODE VERIFIED`", "**2** IN PROGRESS",
// "0 unclassified". The lookbehinds reject id-adjacent numbers ("M8-04 LIVE
// VERIFIED") and phase numbers ("Phase 8 ACCEPTED"), which are not tallies.
// "12 rows `CODE VERIFIED`" (a slice count) does not match: the word
// "rows" sits between the figure and the category.
const CATEGORY_CLAIM_RE =
  /(?<!\bPhase\s)(?<![\w-])(\d+)\**\s*\**`?(CODE VERIFIED|LIVE VERIFIED|NOT STARTED|IN PROGRESS|BLOCKED|ACCEPTED|unclassified)\b/gi

// A positional tuple "37 / 84 / 1 / 2 / 0" = CODE VERIFIED / NOT STARTED /
// LIVE VERIFIED / IN PROGRESS [/ unclassified]. Two- and three-figure tuples
// ("24/24", "22 / 103") are ambiguous and are not read as claims.
const TUPLE_CLAIM_RE = /(?<![\w/.-])(\d+(?:\s*\/\s*\d+){3,})(?![\w/])/g
const TUPLE_ORDER = ['CODE VERIFIED', 'NOT STARTED', 'LIVE VERIFIED', 'IN PROGRESS', 'unclassified']

// A qualified row total: "124 `| M9-* |` rows", "124 unique ledger rows",
// "124 table rows", "124 unique `M9-*` rows". A bare "12 rows" is a slice
// count, not a total, and is ignored.
const TOTAL_CLAIM_RE =
  /(?<![\w-])(\d+)\**\s*(?:unique\s+)?(?:`?\|?\s*M9-\*\s*\|?`?\s+)?(?:unique\s+)?(?:(?:table|ledger)\s+)?rows\b/gi
const TOTAL_QUALIFIER_RE = /unique|M9-\*|table\s+rows|ledger\s+rows/i

/** Deference is an accepted alternative to restating numbers. */
const DEFERS_RE = /\b(see|per|in|at)\b[^.\n]{0,60}\bledger\b|\bledger\b[^.\n]{0,40}\bauthoritative\b/i

/**
 * Extract EVERY numeric status claim from one current statement.
 * Returns [{ category, value, source }] where category is a status name,
 * 'unclassified', 'total rows' or 'unique rows'.
 */
export function extractClaims(statement) {
  const claims = []
  for (const m of statement.matchAll(CATEGORY_CLAIM_RE)) {
    const raw = m[2]
    const category = /unclassified/i.test(raw) ? 'unclassified' : raw.toUpperCase()
    claims.push({ category, value: Number(m[1]), source: m[0] })
  }
  for (const m of statement.matchAll(TUPLE_CLAIM_RE)) {
    const parts = m[1].split('/').map((x) => Number(x.trim()))
    if (parts.length > TUPLE_ORDER.length) {
      claims.push({ category: 'unrecognised tuple', value: NaN, source: m[0] })
      continue
    }
    parts.forEach((value, i) => claims.push({ category: TUPLE_ORDER[i], value, source: m[0] }))
  }
  for (const m of statement.matchAll(TOTAL_CLAIM_RE)) {
    if (!TOTAL_QUALIFIER_RE.test(m[0])) continue
    const category = /unique/i.test(m[0]) ? 'unique rows' : 'total rows'
    claims.push({ category, value: Number(m[1]), source: m[0] })
  }
  return claims
}

/**
 * §15 — validate EVERY current claim in one summary file against the derived
 * totals. All matches are checked, so a correct first summary cannot mask a
 * conflicting second one, and every category a claim mentions is compared.
 * A file with no numeric claim must defer to the ledger explicitly.
 */
export function validateSummary(text, counts, label, { scope, totalRows, uniqueRows } = {}) {
  const failures = []
  const statements = currentStatements(text, { scope })
  const derived = {
    ...counts,
    'total rows': totalRows ?? uniqueRows,
    'unique rows': uniqueRows ?? totalRows,
  }
  let checked = 0
  for (const stmt of statements) {
    for (const c of extractClaims(stmt)) {
      checked += 1
      if (c.category === 'unrecognised tuple') {
        failures.push(label + ': unrecognised tally tuple "' + c.source + '" (more than five figures)')
        continue
      }
      const want = derived[c.category]
      if (c.value !== want) {
        failures.push(
          label + ': claims ' + c.category + ' = ' + c.value + ' ("' + c.source.trim() + '"), rows derive ' + want,
        )
      }
    }
  }
  if (checked > 0) return { failures, mode: 'restates', checked }
  if (DEFERS_RE.test(statements.join('\n'))) return { failures, mode: 'defers', checked: 0 }
  failures.push(label + ': no current authoritative tally found and no deference to the ledger')
  return { failures, mode: 'missing', checked: 0 }
}

// ------------------------------------------------------------------ checks

/**
 * The whole validation, as a pure function over already-read file contents.
 * The real run and every end-to-end fixture use this same path (§18).
 */
export function validate({ ledgerText, summaries }) {
  const failures = []
  const { rows, map, duplicates } = parseLedger(ledgerText)
  const counts = tally(map)

  if (rows.length !== EXPECTED_TOTAL) {
    failures.push(`expected ${EXPECTED_TOTAL} M9-* rows, found ${rows.length}`)
  }
  if (map.size !== EXPECTED_TOTAL) {
    failures.push(`expected ${EXPECTED_TOTAL} unique ids, found ${map.size}`)
  }
  if (duplicates.length) failures.push(`duplicate ids: ${duplicates.join(', ')}`)
  if (counts.unclassified !== 0) failures.push(`${counts.unclassified} unclassified row(s)`)

  const sum = STATUSES.reduce((a, s) => a + counts[s], 0) + counts.unclassified
  if (sum !== map.size) failures.push(`status counts sum to ${sum}, expected ${map.size}`)

  failures.push(...validateTallyTable(ledgerText, counts, map.size))

  const orderedIds = rows.map((r) => r.id)
  const summaryModes = []
  for (const { label, text, scope } of summaries) {
    const res = validateSummary(text, counts, label, {
      scope,
      totalRows: rows.length,
      uniqueRows: map.size,
    })
    failures.push(...res.failures)
    summaryModes.push({ label, mode: res.mode, checked: res.checked })
    for (const p of findUnsafeRanges(text, map, orderedIds)) {
      failures.push(`${label} line ${p.line}: range ${p.range} contains ${p.exceptions.join(', ')}`)
    }
  }

  return { failures, counts, map, rows, summaryModes }
}

function readSummaries() {
  return SUMMARY_FILES.map(({ file, label, scope }) => ({
    file,
    label,
    scope,
    text: readFileSync(resolve(REPO, file), 'utf8'),
  }))
}

// -------------------------------------------------------------- self-test
// END-TO-END fixtures (§18): each builds a complete synthetic ledger and runs
// the real `validate()` path. A parser test is not a validation test.

const TABLE_HEAD = '| id | Contract | Legacy | Target | Roles | Status |\n|---|---|---|---|---|---|\n'

/** Build a synthetic ledger with a given status distribution and tally table. */
function makeLedger({ rows, tallyTable, banner = '' }) {
  const body = rows.map((r) => `| ${r.id} | c | 1 | x | all | ${r.status} |`).join('\n')
  return `# fixture ledger\n\n${banner}\n\n${TABLE_HEAD}${body}\n\n| Status | Rows |\n|---|---|\n${tallyTable}\n`
}

/** 10 rows: 7 CODE VERIFIED, 1 NOT STARTED, 1 LIVE VERIFIED, 1 IN PROGRESS. */
function fixtureRows() {
  const rows = []
  for (let i = 70; i <= 77; i++) {
    rows.push({
      id: `M9-${i}`,
      // M9-71 carries the mixed wording decoy.
      status:
        i === 71
          ? '`IN PROGRESS` — **sorting clause `CODE VERIFIED`**; source clause OPEN'
          : '`CODE VERIFIED`',
    })
  }
  rows.push({ id: 'M9-90', status: '`NOT STARTED`' })
  rows.push({ id: 'M9-141a', status: '`LIVE VERIFIED`' })
  return rows
}

const GOOD_TALLY = [
  '| `CODE VERIFIED` | **7** |',
  '| `NOT STARTED` | **1** |',
  '| `LIVE VERIFIED` | **1** (M9-141a) |',
  '| `IN PROGRESS` | **1** (M9-71) |',
  '| `BLOCKED` | **0** |',
  '| unclassified | **0** |',
  '| **total unique** | **10** |',
].join('\n')

// Mirrors the REAL banner shape: parentheticals after the figures, and one of
// them containing a comma ("(M9-19, M9-71)"). An earlier fixture used only a
// single-token parenthetical and was too weak to catch a separator regex that
// could not cross an inner comma — the real run failed while the fixture passed.
const GOOD_SUMMARY =
  'Measured mechanically from the 10 `| M9-* |` table rows: **7 `CODE VERIFIED`, ' +
  '1 `NOT STARTED`, 1 `LIVE VERIFIED` (M9-141a), 1 `IN PROGRESS` (M9-71, sorting open), ' +
  '0 unclassified.**'

function selfTest() {
  const results = []
  const t = (name, fn) => {
    try {
      fn()
      results.push([true, name])
    } catch (e) {
      results.push([false, `${name} — ${e.message}`])
    }
  }
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg)
  }
  // The fixture ledger has 10 rows, so the structural 124 check always fires;
  // ignore only that one expected failure and assert on everything else.
  const realFailures = (f) => f.filter((x) => !/^expected \d+ (M9-\* rows|unique ids), found/.test(x))
  const run = (ledgerText, summaryText = GOOD_SUMMARY, scope) =>
    realFailures(
      validate({
        ledgerText,
        summaries: [{ label: 'fixture summary', text: summaryText, scope }],
      }).failures,
    )

  const rows = fixtureRows()

  // 1 — correct complete tally passes.
  t('E2E: correct complete tally passes', () => {
    const f = run(makeLedger({ rows, tallyTable: GOOD_TALLY }))
    assert(f.length === 0, `expected 0 failures, got ${JSON.stringify(f)}`)
  })

  // 2 — stale tally value fails.
  t('E2E: stale tally value fails', () => {
    const stale = GOOD_TALLY.replace('| `CODE VERIFIED` | **7** |', '| `CODE VERIFIED` | **8** |')
    const f = run(makeLedger({ rows, tallyTable: stale }))
    assert(
      f.some((x) => /tally table says CODE VERIFIED = 8, rows derive 7/.test(x)),
      `not detected: ${JSON.stringify(f)}`,
    )
  })

  // 3 — missing tally category fails (the old `continue` bug).
  t('E2E: missing tally category fails', () => {
    const missing = GOOD_TALLY.split('\n').filter((l) => !/BLOCKED/.test(l)).join('\n')
    const f = run(makeLedger({ rows, tallyTable: missing }))
    assert(
      f.some((x) => /missing the `BLOCKED` row/.test(x)),
      `not detected: ${JSON.stringify(f)}`,
    )
  })

  // 4 — duplicate tally category fails.
  t('E2E: duplicate tally category fails', () => {
    const dup = GOOD_TALLY + '\n| `BLOCKED` | **0** |'
    const f = run(makeLedger({ rows, tallyTable: dup }))
    assert(
      f.some((x) => /2 `BLOCKED` rows/.test(x)),
      `not detected: ${JSON.stringify(f)}`,
    )
  })

  // 5 — unknown tally category fails.
  t('E2E: unknown tally category fails', () => {
    const odd = GOOD_TALLY + '\n| `MOSTLY DONE` | **3** |'
    const f = run(makeLedger({ rows, tallyTable: odd }))
    assert(
      f.some((x) => /unknown category/.test(x)),
      `not detected: ${JSON.stringify(f)}`,
    )
  })

  // 6 — stale CURRENT banner fails.
  t('E2E: stale current banner fails', () => {
    const f = run(
      makeLedger({ rows, tallyTable: GOOD_TALLY }),
      'Measured: **8 `CODE VERIFIED`, 1 `NOT STARTED`, 1 `LIVE VERIFIED`, 1 `IN PROGRESS`.**',
    )
    assert(
      f.some((x) => /claims CODE VERIFIED = 8 .*rows derive 7/.test(x)),
      `not detected: ${JSON.stringify(f)}`,
    )
  })

  // 7 — matching current banner passes.
  t('E2E: matching current banner passes', () => {
    const f = run(makeLedger({ rows, tallyTable: GOOD_TALLY }), GOOD_SUMMARY)
    assert(f.length === 0, `expected 0 failures, got ${JSON.stringify(f)}`)
  })

  // 8 — a HISTORY/SUPERSEDED tally is ignored, not read as current.
  t('E2E: HISTORY/SUPERSEDED tally is ignored', () => {
    const withHistory =
      '**SUPERSEDED TALLY:** this banner first claimed 8 `CODE VERIFIED`, 1 `NOT STARTED`, 1 `LIVE VERIFIED`, 1 `IN PROGRESS`.\n\n' +
      GOOD_SUMMARY
    const f = run(makeLedger({ rows, tallyTable: GOOD_TALLY }), withHistory)
    assert(f.length === 0, `history leaked into current: ${JSON.stringify(f)}`)
  })

  // 8b — REGRESSION (real registry shape): the CURRENT tally is followed, in
  // the same wrapped sentence group, by a parenthetical "(An earlier ... is
  // HISTORY: ...)" clause, and an earlier line uses the word "superseded" as
  // ordinary lowercase prose. Both used to blank the current tally.
  t('E2E: current tally survives a trailing HISTORY clause and prose "superseded"', () => {
    const summary =
      'the banner below dating from the design acceptance is superseded on that\n' +
      'point. Measured row-by-row across all 10 ledger rows: **7 `CODE VERIFIED`,\n' +
      '1 `NOT STARTED`, 1 `LIVE VERIFIED` (M9-141a), 1 `IN PROGRESS` (M9-71,\n' +
      'sorting open), 0 unclassified.** (An earlier 8 / 1 / 1 / 1 / 0 figure is HISTORY:\n' +
      'the Codex round demoted M9-71.)\n'
    const f = run(makeLedger({ rows, tallyTable: GOOD_TALLY }), summary)
    assert(f.length === 0, `current tally was suppressed: ${JSON.stringify(f)}`)
  })

  // 8c — the stale figure inside that HISTORY clause must NOT be read as current.
  t('E2E: stale figure inside a HISTORY clause is not read as current', () => {
    const summary =
      'Measured: **8 `CODE VERIFIED`, 1 `NOT STARTED`, 1 `LIVE VERIFIED`, 1 `IN PROGRESS`.**\n' +
      '(An earlier 7 / 1 / 1 / 1 / 0 figure is HISTORY.)\n'
    const f = run(makeLedger({ rows, tallyTable: GOOD_TALLY }), summary)
    assert(
      f.some((x) => /claims CODE VERIFIED = 8 .*rows derive 7/.test(x)),
      `the current (stale) claim was not caught: ${JSON.stringify(f)}`,
    )
  })

  // 9 — a file that defers to the ledger instead of restating numbers passes.
  t('E2E: deference to the ledger is accepted', () => {
    const f = run(
      makeLedger({ rows, tallyTable: GOOD_TALLY }),
      'The authoritative tally lives in the ledger; see the ledger banner.',
    )
    assert(f.length === 0, `deference rejected: ${JSON.stringify(f)}`)
  })

  // 10 — a summary with neither numbers nor deference fails.
  t('E2E: summary with no tally and no deference fails', () => {
    const f = run(makeLedger({ rows, tallyTable: GOOD_TALLY }), 'Phase 9 progresses nicely.')
    assert(
      f.some((x) => /no current authoritative tally/.test(x)),
      `not detected: ${JSON.stringify(f)}`,
    )
  })

  // 11 — M9-71 mixed wording is classified by its primary status cell (§17).
  t('E2E: M9-71 mixed wording classifies as IN PROGRESS', () => {
    const { map } = parseLedger(makeLedger({ rows, tallyTable: GOOD_TALLY }))
    assert(map.get('M9-71') === 'IN PROGRESS', `got ${map.get('M9-71')}`)
    const counts = tally(map)
    assert(counts['CODE VERIFIED'] === 7, `decoy inflated CODE VERIFIED to ${counts['CODE VERIFIED']}`)
    assert(counts['IN PROGRESS'] === 1, `IN PROGRESS = ${counts['IN PROGRESS']}`)
  })

  // 12 — an unsafe inclusive range in a current banner fails (§16).
  t('E2E: unsafe M9-70…M9-77 status range fails', () => {
    const f = run(
      makeLedger({ rows, tallyTable: GOOD_TALLY }),
      GOOD_SUMMARY + '\nM9-70…M9-77 are `CODE VERIFIED`.',
    )
    assert(
      f.some((x) => /range M9-70…M9-77 contains M9-71=IN PROGRESS/.test(x)),
      `not detected: ${JSON.stringify(f)}`,
    )
  })

  // 13 — the split range naming the exception passes (§16).
  t('E2E: split range with M9-71 named IN PROGRESS passes', () => {
    const f = run(
      makeLedger({ rows, tallyTable: GOOD_TALLY }),
      GOOD_SUMMARY + '\nM9-70, M9-72…M9-77 are `CODE VERIFIED`; M9-71 is `IN PROGRESS`.',
    )
    assert(f.length === 0, `expected 0 failures, got ${JSON.stringify(f)}`)
  })

  // 14 — duplicate row id is rejected.
  t('E2E: duplicated row id fails', () => {
    const dupRows = [...rows, { id: 'M9-70', status: '`CODE VERIFIED`' }]
    const f = run(makeLedger({ rows: dupRows, tallyTable: GOOD_TALLY }))
    assert(
      f.some((x) => /duplicate ids: M9-70/.test(x)),
      `not detected: ${JSON.stringify(f)}`,
    )
  })

  // 15 — an unclassified status is rejected.
  t('E2E: unclassified row status fails', () => {
    const oddRows = [...rows, { id: 'M9-99', status: '`MOSTLY DONE`' }]
    const f = run(makeLedger({ rows: oddRows, tallyTable: GOOD_TALLY }))
    assert(
      f.some((x) => /unclassified row/.test(x)),
      `not detected: ${JSON.stringify(f)}`,
    )
  })

  const good = makeLedger({ rows, tallyTable: GOOD_TALLY })

  // 16 — ALL-MATCH: a correct first current summary does not mask a conflicting
  // second current summary in the same file (the old first-match gap).
  t('E2E: correct first summary + conflicting second current summary fails', () => {
    const f = run(
      good,
      GOOD_SUMMARY +
        '\n\nRe-measured: **8 `CODE VERIFIED`, 1 `NOT STARTED`, 1 `LIVE VERIFIED`, 1 `IN PROGRESS`, 0 unclassified.**',
    )
    assert(
      f.some((x) => /claims CODE VERIFIED = 8 .*rows derive 7/.test(x)),
      `second conflicting summary not detected: ${JSON.stringify(f)}`,
    )
  })

  // 16b — positive control: two AGREEING current summaries pass.
  t('E2E: two agreeing current summaries pass', () => {
    const f = run(good, GOOD_SUMMARY + '\n\nRe-measured: ' + GOOD_SUMMARY)
    assert(f.length === 0, `expected 0 failures, got ${JSON.stringify(f)}`)
  })

  // 17 — correct main statuses but a wrong unclassified figure fails.
  t('E2E: correct main statuses + wrong unclassified fails', () => {
    const f = run(
      good,
      'Measured: **7 `CODE VERIFIED`, 1 `NOT STARTED`, 1 `LIVE VERIFIED`, 1 `IN PROGRESS`, 3 unclassified.**',
    )
    assert(
      f.some((x) => /claims unclassified = 3 .*rows derive 0/.test(x)),
      `not detected: ${JSON.stringify(f)}`,
    )
  })

  // 18 — correct main statuses but a wrong TOTAL fails.
  t('E2E: correct main statuses + wrong total rows fails', () => {
    const f = run(
      good,
      'Measured from the 11 `| M9-* |` table rows: **7 `CODE VERIFIED`, 1 `NOT STARTED`, 1 `LIVE VERIFIED`, 1 `IN PROGRESS`.**',
    )
    assert(
      f.some((x) => /claims total rows = 11 .*rows derive 10/.test(x)),
      `not detected: ${JSON.stringify(f)}`,
    )
  })

  // 18b — a wrong UNIQUE figure fails; the right one passes.
  t('E2E: wrong unique-rows figure fails, right one passes', () => {
    const bad = run(good, GOOD_SUMMARY + ' There are 12 unique ledger rows.')
    assert(
      bad.some((x) => /claims unique rows = 12 .*rows derive 10/.test(x)),
      `not detected: ${JSON.stringify(bad)}`,
    )
    const ok = run(good, GOOD_SUMMARY + ' There are 10 unique ledger rows.')
    assert(ok.length === 0, `expected 0 failures, got ${JSON.stringify(ok)}`)
  })

  // 19 — BLOCKED and ACCEPTED figures are compared, not ignored.
  t('E2E: wrong BLOCKED / ACCEPTED figures fail', () => {
    const f = run(good, GOOD_SUMMARY + ' Also 1 `BLOCKED` and 2 `ACCEPTED`.')
    assert(
      f.some((x) => /claims BLOCKED = 1 .*rows derive 0/.test(x)),
      `BLOCKED not detected: ${JSON.stringify(f)}`,
    )
    assert(
      f.some((x) => /claims ACCEPTED = 2 .*rows derive 0/.test(x)),
      `ACCEPTED not detected: ${JSON.stringify(f)}`,
    )
    const ok = run(good, GOOD_SUMMARY + ' Also 0 `BLOCKED` and 0 `ACCEPTED`.')
    assert(ok.length === 0, `expected 0 failures, got ${JSON.stringify(ok)}`)
  })

  // 20 — positional slash tuples: every position compared, including the fifth.
  t('E2E: slash tuple with a wrong fifth (unclassified) figure fails', () => {
    const f = run(good, 'The current authoritative tally is **7 / 1 / 1 / 1 / 2**.')
    assert(
      f.some((x) => /claims unclassified = 2 .*rows derive 0/.test(x)),
      `not detected: ${JSON.stringify(f)}`,
    )
    const ok = run(good, 'The current authoritative tally is **7 / 1 / 1 / 1 / 0**.')
    assert(ok.length === 0, `expected 0 failures, got ${JSON.stringify(ok)}`)
    const four = run(good, 'The current authoritative tally is 7 / 1 / 1 / 2.')
    assert(
      four.some((x) => /claims IN PROGRESS = 2 .*rows derive 1/.test(x)),
      `four-figure tuple not compared: ${JSON.stringify(four)}`,
    )
  })

  // 21 — non-claims are not read as claims: id-adjacent numbers, phase numbers,
  // slice counts ("12 rows CODE VERIFIED") and two-figure ratios ("24/24").
  t('E2E: id-adjacent, phase-number, slice-count and ratio text yield no claims', () => {
    const noise =
      'M8-04 LIVE VERIFIED via a browser leg; Phase 8 ACCEPTED; **12 rows** `CODE VERIFIED` plus ' +
      'M9-71 `IN PROGRESS`; focused tests 24/24; an interim 22 / 103 figure; (12 rows).'
    assert(extractClaims(noise).length === 0, `noise produced claims: ${JSON.stringify(extractClaims(noise))}`)
    const f = run(good, GOOD_SUMMARY + '\n\n' + noise)
    assert(f.length === 0, `noise failed the run: ${JSON.stringify(f)}`)
  })

  // 22 — HISTORY exclusion is sentence-scoped: a labelled sentence is skipped,
  // an unlabelled lowercase "history" sentence with a stale figure still fails.
  t('E2E: HISTORY exclusion applies only to the labelled sentence', () => {
    const ok = run(good, '**HISTORY —** an earlier run measured 8 `CODE VERIFIED`. ' + GOOD_SUMMARY)
    assert(ok.length === 0, `labelled history leaked: ${JSON.stringify(ok)}`)
    const bad = run(good, 'An earlier run measured 8 `CODE VERIFIED`, which is now history. ' + GOOD_SUMMARY)
    assert(
      bad.some((x) => /claims CODE VERIFIED = 8 .*rows derive 7/.test(x)),
      `lowercase prose "history" wrongly excluded a stale claim: ${JSON.stringify(bad)}`,
    )
  })

  // 23 — phase9 scope: another module's tally in a multi-phase file is not a
  // Phase 9 claim, but a Phase 9 paragraph is still compared.
  t('E2E: phase9 scope ignores other modules and still compares M9 paragraphs', () => {
    const other = 'Module I: **40 `LIVE VERIFIED`, 14 `CODE VERIFIED`**, Phase 8 is done.'
    const ok = run(good, other + '\n\n' + GOOD_SUMMARY, 'phase9')
    assert(ok.length === 0, `other module leaked under phase9 scope: ${JSON.stringify(ok)}`)
    const bad = run(
      good,
      other + '\n\nPhase 9: **8 `CODE VERIFIED`, 1 `NOT STARTED`, 1 `LIVE VERIFIED`, 1 `IN PROGRESS`.**',
      'phase9',
    )
    assert(
      bad.some((x) => /claims CODE VERIFIED = 8 .*rows derive 7/.test(x)),
      `Phase 9 paragraph not compared under scope: ${JSON.stringify(bad)}`,
    )
    const unscoped = run(good, other + '\n\n' + GOOD_SUMMARY)
    assert(
      unscoped.some((x) => /claims LIVE VERIFIED = 40/.test(x)),
      `without scope the other module's figure must be compared (control): ${JSON.stringify(unscoped)}`,
    )
  })

  const failed = results.filter(([ok]) => !ok)
  for (const [ok, name] of results) console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`)
  console.log(`\n${results.length - failed.length}/${results.length} end-to-end fixtures passed`)
  return failed.length === 0
}

// ---------------------------------------------------------------- main

// Only run when invoked directly. Importing this module (fixtures, ad-hoc
// probes, future reuse) must have NO side effects — an unguarded main block
// ran the real check on import and exited before the importer's own code.
const INVOKED_DIRECTLY =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (!INVOKED_DIRECTLY) {
  // imported: export-only
} else if (process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1)
} else {
  const ledgerText = readFileSync(resolve(REPO, LEDGER), 'utf8')
  const summaries = readSummaries()
  const { failures, counts, map, summaryModes } = validate({ ledgerText, summaries })

  console.log('Phase 9 ledger check —', LEDGER)
  console.log('  total rows      :', map.size)
  for (const s of STATUSES) console.log(`  ${s.padEnd(16)}:`, counts[s])
  console.log('  unclassified    :', counts.unclassified)
  console.log('  summaries checked:')
  for (const { label, mode, checked } of summaryModes)
    console.log(`    - ${label} (${mode}, ${checked} numeric claim(s) compared)`)

  if (failures.length) {
    console.error('\nFAIL — ledger inconsistencies:')
    for (const f of failures) console.error('  - ' + f)
    process.exit(1)
  }
  const claims = summaryModes.reduce((a, m) => a + m.checked, 0)
  const deferring = summaryModes.filter((m) => m.mode === 'defers').length
  console.log(
    `\nPASS — ${map.size} rows parsed (${EXPECTED_TOTAL} expected, no duplicates, 0 unclassified); ` +
      `tally table carries each required category once and equals the derived totals; ` +
      `${summaryModes.length} summary files scanned with every current numeric claim compared ` +
      `(${claims} claims across ${summaryModes.length - deferring} restating file(s), ${deferring} deferring); ` +
      `every asserted M9 range in those files expanded against the status map.`,
  )
}
