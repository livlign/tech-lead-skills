# tracer-bullet

> Thread a debugTraceId through a new feature's BE + FE call chain and log at every step under a common marker. Use during Phase 7 implementation of any non-trivial feature so production failures can be grepped end-to-end by one id across browser console + your log-search system. The marker enables bulk cleanup before UAT.

<!--
Portable prompt. Use as a system prompt, Cursor rule, Windsurf rule, Aider convention,
custom-GPT instructions, or paste-into-chat block. Generated from SKILL.md
- do not edit directly. Source: https://github.com/livlign/tech-lead-skills
-->

---
# Skill: tracer-bullet

A **tracer bullet** is a unique id minted at the API boundary, returned to the FE in the response, and stamped on every log line emitted during the request's processing. When something fails, the user pastes the id and we grep the log-search system — one keyword, complete call chain.

A common marker on every tracer log line means we can strip them out with one regex before promoting to UAT.

---

## Shape

### 1. Marker

Every tracer log line starts with the literal string:

```
[TRACER]
```

That's the grep token. Used for:

- Log search (whatever your team uses — OpenSearch / Elasticsearch / Kibana / Datadog / Splunk / CloudWatch / Loki / etc.): a `match_phrase` / full-text query on `"[TRACER]"` filters to the tracer-bullet stream.
- Pre-UAT cleanup: a single regex strips every line.

### 2. debugTraceId

A new `Guid` generated at the entry point — controller action, not handler. Pass it through:

- All `MediatR` commands/queries as a property on the request DTO.
- All cross-service HTTP/gRPC calls as a header (`X-Debug-Trace-Id`) OR a payload field.
- All event-aggregator events as a property on the event.

Return it in the API response metadata so the FE shows it in DevTools / pastes it back:

```jsonc
{
  "metadata": { "code": "GEN-0", "message": "Success", "debugTraceId": "..." },
  "data": { ... }
}
```

### 3. Log lines

Every step calls `_logger.LogInformation` (.NET) using the parameterized form:

```csharp
_logger.LogInformation("[TRACER] {debugTraceId} {Stage} — {Detail}", debugTraceId, "ResolveProduct", $"productRequestId={request.ProductRequestId} variantCount={request.Samples.Count}");
```

- `{Stage}` — short identifier, kebab- or PascalCase: `Entry`, `ValidateInput`, `CallDownstream`, `WriteOrder`, `EmitProductUpdated`, `Return`.
- `{Detail}` — short structured info that actually helps narrow the failure: ids, counts, branch taken, key fields. Not the whole DTO.
- Parameterised — don't string-concat. Use your logger's structured form (`ILogger` in .NET, `logger.info({...})` in Node/Python, etc.).

---

## Where to place tracer logs

**At minimum** in any new BE feature:

1. **Entry / exit of every controller action.**
2. **Before and after every external call** — HTTP, gRPC, DB write, Kafka publish, SQS send, cache flush.
3. **At every conditional fork** — auth/gate decision, gate bypass, validation outcome, branch into different paths.
4. **At every `SaveChangesAsync`** — before (count of pending entities), after (rows affected).
5. **At every catch block** — error path; include the exception type and short message.

**Skip** noise traces inside tight loops, mapping code, or pure getters. Tracer bullet should let you reconstruct the *flow*, not the *internals*.

---

## .NET handler template

```csharp
public async Task<List<XOutputDto>> Handle(XCommand request, CancellationToken cancellationToken)
{
    var trace = request.DebugTraceId;
    _logger.LogInformation("[TRACER] {trace} Entry — {Detail}", trace, $"input={request.SomeId}");

    if (somethingInvalid)
    {
        _logger.LogInformation("[TRACER] {trace} ValidateInput — rejected: {Reason}", trace, "missing X");
        throw new ApiException(...);
    }

    _logger.LogInformation("[TRACER] {trace} CallDownstream — start", trace);
    var downstreamResult = await _client.CallAsync(new Y { DebugTraceId = trace, ... }, cancellationToken);
    _logger.LogInformation("[TRACER] {trace} CallDownstream — done count={Count}", trace, downstreamResult.Count);

    _logger.LogInformation("[TRACER] {trace} WriteLocal — staging {Count} rows", trace, items.Count);
    foreach (var item in items) _unitOfWork.Things.Add(item);
    await _unitOfWork.SaveChangesAsync(cancellationToken);
    _logger.LogInformation("[TRACER] {trace} WriteLocal — saved", trace);

    _logger.LogInformation("[TRACER] {trace} Return", trace);
    return downstreamResult;
}
```

---

## Searching logs by tracer id

Whatever log search your team uses (OpenSearch, Elasticsearch, Kibana, Datadog, Splunk, CloudWatch, Loki, etc.), the query shape is the same — filter on the marker AND the id:

```
"[TRACER]" AND "<debugTraceId>"
```

Example for an Elasticsearch-style `_search` API (OpenSearch / Elasticsearch / etc.):

```bash
BASE="<YOUR_LOG_SEARCH_URL>"
curl -s -H 'Content-Type: application/json' -X POST "$BASE/<your-index>/_search" -d '{
  "size": 200,
  "sort": [{"@timestamp": "asc"}],
  "_source": ["@timestamp", "applicationName", "fulllog"],
  "query": {"bool": {"must": [
    {"match_phrase": {"fulllog": "[TRACER]"}},
    {"match_phrase": {"fulllog": "<debugTraceId>"}}
  ]}}
}'
```

For other backends, use the equivalent query DSL (Datadog log query, Splunk SPL, CloudWatch Logs Insights, LogQL, etc.) with the same two filters: `[TRACER]` AND the id.

---

## Pre-UAT cleanup

Before promoting to UAT, strip the tracer-bullet lines so prod logs stay clean.

### What to remove

- **Every `_logger.LogInformation("[TRACER] ...")` call** in handlers, controllers, services that were added during Phase 7.
- **`DebugTraceId` properties** on internal DTOs/commands/events — keep only if they have a non-debug purpose.
- **The header / payload field propagating the id** across service boundaries — keep if you want to keep the id but lose the verbose logs, otherwise remove.

### How to find them

```bash
# Find all tracer log lines across the affected repos
grep -rnE '\[TRACER\]' <repo-a> <repo-b> <repo-c> --include="*.cs"
```

A single shell command sweep finds every site. Remove the line; verify the surrounding closure (delete the variable holding `trace` if it becomes unused, remove the `DebugTraceId` property on the DTO if no longer referenced).

### When to do it

- Author the tracer in Phase 7 (implementation).
- Keep through dev verification + reviewer feedback round.
- **Strip in a dedicated commit** right before promotion to UAT / staging.
- Commit message: `<TICKET-KEY>: strip tracer-bullet logs before UAT promotion`.

---

## Frontend tracer (React / TypeScript / JS)

Apply the same spirit on the FE for any non-trivial new feature: mint a `traceRequestId` at the user-action entry point and `console.log` every step so a failed flow can be reconstructed from the browser console alone.

### Marker

Every FE tracer log starts with the literal token:

```
[TRACER-FE]
```

Distinct from BE's `[TRACER]` so we don't cross-contaminate when grepping. Same regex shape for bulk cleanup.

### Where the id comes from

Two cases:

- **Action originates on the FE** (button click, form submit, scan event) — mint a new id at the handler:
  ```ts
  const traceRequestId = crypto.randomUUID();
  ```
- **Continuation of a BE roundtrip** — read the BE's `X-Debug-Trace-Id` response header from the axios response and log the *same* id on the FE side. Use the BE id rather than minting fresh, so the BE + FE logs line up under one id when the user pastes it.

### Send it to the BE

When calling the API, set the request header `X-Debug-Trace-Id: <traceRequestId>` so the BE picks the same id up (and the BE skips minting a fresh one — see the BE controllers' "prefer inbound header before falling back to `Guid.NewGuid()`" pattern).

```ts
const res = await axios.post(url, payload, {
  headers: { 'X-Debug-Trace-Id': traceRequestId },
});
```

#### Known limitation: API gateway CORS Allow-Headers

If your API gateway enforces a **fixed CORS `Access-Control-Allow-Headers` list** that doesn't include `x-debug-trace-id`, any FE call carrying the header triggers a preflight that the gateway rejects — all calls from that path block with CORS failure.

**When the gateway is not configurable for this feature, do NOT propagate the id via a custom header.** Fall back to:

- Mint and log the id on the FE only (`[TRACER-FE] ${traceRequestId} ...` in the browser console).
- Let the BE mint its own independent `debugTraceId` at controller entry and log under `[TRACER]`.
- Correlate the two streams **manually** by timestamp proximity + tenant id / user id / target entity id — not by shared id.
- If end-to-end correlation is critical, ask infra to add `x-debug-trace-id` to the gateway allow-list **before** wiring the header, and verify a preflight succeeds in dev first.

The header-propagation pattern above is the default in environments where the gateway allows the custom header (custom infra, direct BE calls bypassing the gateway). Drop the header when the gateway blocks it.

### Where to place tracer logs (FE)

At minimum in any new FE feature:

1. **User-action entry** — onClick / onSubmit / scan-event handler enters.
2. **Before every API call** — log path + key payload fields (ids, counts).
3. **After every API call** — log status + key response fields (ids, counts, branch decisions).
4. **At every conditional fork** — auto-select vs picker, validation outcome, branch into different modal steps, retry vs cancel.
5. **In every catch block** — error path; include the axios error code / response body shape.
6. **At UI state transitions** — modal open/close, route change, refetch triggered.

Skip noise inside tight render loops, mapping helpers, or pure getters. Tracer is about user-flow shape, not internal rerenders.

### `console.log` template

```ts
console.log(`[TRACER-FE] ${traceRequestId} ${stage} —`, { detail: 'short', count: items.length });
```

- Stage = short identifier: `Entry`, `CallCreateSampleApi`, `ApiResponse`, `OpenPopup`, `RefetchProductDetail`, `Return`.
- Second argument = an object literal of short structured fields — ids, counts, branch decisions. **Do not log the whole response body** or the whole DTO.
- Use `console.log` for the trace itself. Existing `console.error` in catch blocks gets prefixed with `[TRACER-FE] ${traceRequestId}` and stays as `console.error`.

### React-specific guidance

- For React components, mint the id at the top of the user-action callback (`useCallback` handler), not in a `useEffect` — `useEffect` runs on render and would generate noise.
- Don't `useRef`/`useState` the id unless the chain crosses async boundaries that need it later. Pass it as an arg or capture it in the closure.
- For async chains across multiple API calls within one user action, **reuse the same id across all calls** — that's the whole point.

### Pre-UAT cleanup (FE)

```bash
# Find every FE tracer site
grep -rnE '\[TRACER-FE\]' <frontend-repo> --include="*.{ts,tsx,js,jsx}"
```

Remove:
- Every `console.log(`[TRACER-FE] …`)` line.
- The `[TRACER-FE]` prefix on `console.error` lines.
- `traceRequestId` consts when no longer referenced after the logs go.
- `X-Debug-Trace-Id` headers on API calls — keep ONLY if you have an unrelated need; otherwise strip.

Single grep + one commit per repo, message `<TICKET-KEY>: strip tracer-bullet logs before UAT promotion`. Cover BE + FE in the same commit when the feature spans both.

### When to apply on FE

- Yes: a new user flow with multiple steps, an API chain, or modal/popup state that's hard to inspect.
- Yes: any flow where a BE failure on the user's session needs to be greppable end-to-end (FE shows the id in DevTools → user pastes → backend logs found via same id).
- No: a one-line FE tweak, a CSS change, a typo fix. Don't bolt tracer onto trivial work.

---

## Integration with dev-agent

If you're using the [`dev-agent`](../../../dev-agent) plugin, Phase 7 (Implementation) should:

1. Generate the `debugTraceId` at controller entry of the feature's new endpoint(s).
2. Thread it through every new MediatR command/query/event the slice introduces.
3. Add tracer logs at the points listed in "Where to place tracer logs" above.
4. Return the id in the response metadata.
5. Note in `output/07-impl.md` that the tracer is in place and **flag the pre-UAT cleanup commit** as a pending todo.

Phase 8 (E2E) and Phase 9 (Patch) use the tracer to narrow regressions — when a step fails on dev, the user pastes the id and the agent greps the log-search system by `[TRACER]` + the id.

Phase between dev and UAT promotion: the pre-UAT cleanup commit must land before the UAT deploy job runs.

---

## Anti-patterns

- **Logging the whole request DTO.** Tracer logs are about *flow*, not *content*. Log ids, counts, branch decisions.
- **Forgetting the marker.** A log without `[TRACER]` won't be picked up by either the log-search filter or the cleanup grep.
- **Using a different marker per feature.** One marker for the whole workspace — `[TRACER]` — so the cleanup grep is universal.
- **Logging tracer in third-party libraries / shared infrastructure code.** Trace your slice only. Don't bloat shared code.
- **Letting the tracer survive past UAT.** A noisy info-log in prod is wasted log budget and signal/noise destroyer. Strip before UAT promotion.
