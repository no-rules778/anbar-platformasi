# I-8 A8 — TEST allocation metadata inspection

Codex executed a single SELECT of PostgreSQL metadata in the Supabase SQL
Editor for **anbar-test / alkjjbaawmsirsfvqljm**, under the user's next-step
authorization and reaffirmed TEST-only restriction. No business rows, schema,
policies, roles or functions were changed. The dashboard automatically saved
the query text as a private snippet; this is not a database schema change.

Source: https://supabase.com/dashboard/project/alkjjbaawmsirsfvqljm/sql/4dc9303c-fc35-4e26-9eb2-931a0a4d798c

## Observed metadata

`public.stock_layer_allocations` exists. RLS enabled=true, forced=false.
`has_table_privilege('authenticated', table, 'SELECT')` returned true.

| Column | Type | Nullable |
|---|---|---|
| id | uuid | no |
| writeoff_movement_id | uuid | no |
| layer_id | uuid | no |
| qty | numeric | no |
| source_movement_id | uuid | yes |
| source_doc_num_snapshot | text | yes |
| source_invoice_snapshot | text | yes |
| source_date_snapshot | date | yes |
| price_status_snapshot | text | no |
| unit_price_snapshot | numeric | yes |
| source_amount_snapshot | numeric | yes |
| created_by | uuid | no |
| created_at | timestamp with time zone | no |
| reversed_at | timestamp with time zone | yes |

One policy returned: `stock_layer_allocations_select`, SELECT, roles
`{authenticated}`, WITH CHECK null. USING expression:

```sql
EXISTS (
  SELECT 1 FROM movements m
  WHERE m.id = stock_layer_allocations.writeoff_movement_id
)
```

This policy ties allocation visibility to a referenced movement. The actual
effective role visibility depends on movement permissions/RLS and was NOT
tested by the SQL Editor metadata query. No authenticated React allocation
read, business-row count, populated fixture or production comparison occurred.

**A8 metadata check completed for TEST only.** This supplies the schema/policy
evidence for planning the separate Silinmə export. It neither authorizes a
production read nor proves report functionality or role-level live parity.
Group B remains unauthorized; Phase 8 remains NOT ACCEPTED.
