# Phase 8 M8-53 — TEST payload measurement

Date: 2026-09-08  
Project: TEST `alkjjbaawmsirsfvqljm` only  
Mode: read-only localhost, `VITE_ALLOW_LOCAL_WRITES=false`

## Method

A temporary development-only `fetch` wrapper measured the cloned response
body and read the matching `PerformanceResourceTiming` entry. It logged only
the request URL, row count, response-body byte count and size fields; it did
not read or log request headers, authorization data or API keys. The wrapper
was removed immediately after the run.

The React development build uses `StrictMode`, so it issued the logical
four-read snapshot twice. The figures below describe one identical set.

| Read | Exact selected columns / order | Rows | Decoded JSON bytes | Requests |
|---|---|---:|---:|---:|
| `movements` | `id,item_code,warehouse,date,in_qty,out_qty,price,partner,type,invoice_num,note,doc_num,created_at,channel,contract_num,created_by`; `date,created_at`; page 1000 | 14 | 6,140 | 1 |
| `items` | `code,name,unit,price,category`; `code`; page 1000 | 6 | 598 | 1 |
| `warehouses` | `*`; page 1000 | 2 | 133 | 1 |
| `writeoff_valuations` | `movement_id,source_amount,known_amount,unknown_qty,final_amount,valuation_method,override_reason`; `movement_id`; page 1000 | 0 | 2 | 1 |
| **Logical snapshot total** | — | **22** | **6,873** | **4** |

Actual development-session traffic for the screen was two identical sets:
8 requests and 13,746 decoded JSON bytes. This duplication is a development
`StrictMode` effect, not the production logical load.

## Encoded-body follow-up

A TEST-only HTTP/1.1 follow-up authenticated as the same TEST admin and replayed
the exact four GET contracts above with `Range: 0-999`. Automatic response
decompression was disabled; each encoded body was counted before decoding, and
the decoded JSON was then parsed to re-check both row counts and decoded byte
counts against the browser capture.

| Read | Content encoding | Encoded body bytes | Decoded JSON bytes | Rows |
|---|---|---:|---:|---:|
| `movements` | gzip | 1,194 | 6,140 | 14 |
| `items` | gzip | 226 | 598 | 6 |
| `warehouses` | gzip | 110 | 133 | 2 |
| `writeoff_valuations` | identity | 2 | 2 | 0 |
| **Logical snapshot total** | — | **1,532** | **6,873** | **22** |

The hostname was exactly `alkjjbaawmsirsfvqljm.supabase.co`. No response body,
credential, token, request header or business value was logged. This closes the
encoded-body-size part of `M8-53`; it is not a Chrome `transferSize`
measurement and does not include response headers or connection overhead.

## Protocol-level HTTP/1.1 closeout

A later read-only raw curl capture replayed the same four contracts after the
M8-23/M8-27/M8-28 TEST writes. The current snapshot therefore contained 18
physical movement rows rather than the earlier 14; items, warehouses and
valuations were unchanged. `--http1.1 --raw` preserved the received response
headers and HTTP chunk framing. A paired dechunked capture decoded every body
and re-checked its JSON row count.

| Read | Rows | Response headers | Encoded body | Chunk framing | Raw HTTP/1.1 response |
|---|---:|---:|---:|---:|---:|
| `movements` | 18 | 1,186 | 1,458 | 12 | 2,656 |
| `items` | 6 | 1,043 | 226 | 11 | 1,280 |
| `warehouses` | 2 | 998 | 110 | 11 | 1,119 |
| `writeoff_valuations` | 0 | 1,077 | 2 | 0 | 1,079 |
| **Current logical snapshot** | **26** | **4,304** | **1,796** | **34** | **6,134** |

The decoded bodies in the paired validation were 8,110 + 598 + 133 + 2 =
8,843 bytes. All four responses were HTTP 200; the first three used gzip plus
`Transfer-Encoding: chunked`, and the empty valuation response used identity.
`Content-Range` for movements was `0-17/*`.

The 6,134-byte figure is the exact one-run HTTP/1.1 response transfer measured
by libcurl: response header fields plus the encoded response body and chunk
framing. It excludes request bytes, TLS records and TCP/IP link overhead, which
are not part of the browser Resource Timing definition of `transferSize`.
Response-header values can vary between requests; the paired validation run
reported 4,303 header bytes, one byte less, so 6,134 is evidence for the named
raw capture rather than a timeless constant.

This protocol capture closes the remaining M8-53 measurement gap. The original
browser Resource Timing fields remain zero because the cross-origin server does
not expose them; they are no longer needed to infer the requested transfer
size.

## Safety and cleanup

- No database write or RPC mutation was executed.
- No headers, credentials or tokens were logged.
- The temporary measurement code was removed from `web/src/main.tsx`.
- `Çap` is unrelated and is not an acceptance gate.

Verdict: `M8-53` is **MEASURED for the TEST-admin HTTP/1.1 contract**. Exact
queries, request/row counts, decoded and encoded body sizes, response headers,
chunk framing and raw response transfer are evidenced. This measurement does
not by itself accept Phase 8.
