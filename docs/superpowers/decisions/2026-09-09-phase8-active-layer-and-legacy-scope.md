# Phase 8 acceptance scope — active layers and historical legacy transfer

Date: 2026-09-09
Decision maker: product owner
Status: **APPROVED**

The owner explicitly accepted both remaining Phase 8 scope exceptions after
they were explained in operational terms.

1. **M8-39 / M8-46:** Phase 8 acceptance is scoped to the current supported
   configuration with stock layers active. Direct correction and item
   replacement controls do not exist in this configuration; their inactive-layer
   edit-session and double-submit branches remain code-verified but are not a
   Phase 8 live-acceptance requirement. This does not claim those branches were
   executed and does not permit silently removing their tests.
2. **M8-29:** the successful layer-aware cancellation of a historical,
   document-less legacy transfer may remain unexecuted on the current TEST
   baseline. The existing safe atomic refusal is retained as evidence. No new
   cutover, fabricated accounting layer or destructive baseline change is
   required for Phase 8 acceptance.

This decision changes acceptance scope only. It authorises no production
action, database mutation, layer deactivation, deployment or deletion.

