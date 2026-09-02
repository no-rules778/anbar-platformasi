/* Name comparison used across the reference directories, ported 1:1 from
   index.html REF_EQ (line 2970):

     const REF_EQ = (a, b) =>
       String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()

   Both sides are trimmed and lower-cased, so it is insensitive to case and to
   surrounding whitespace on either the stored value or the compared name.
   Keeping the comparison in JavaScript (rather than pushing it into a SQL
   `ilike`) is deliberate: it reproduces the original's exact semantics,
   including its case-folding behaviour, and it cannot be fooled by `%` or `_`
   in a name the way a LIKE pattern can. */
export function refEq(a: unknown, b: unknown): boolean {
  return norm(a) === norm(b)
}

/** `String(x || '')` — mirrors the original, including its falsy handling. */
function norm(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}
