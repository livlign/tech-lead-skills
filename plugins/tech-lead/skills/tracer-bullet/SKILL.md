---
name: tracer-bullet
description: Thread a debugTraceId through any multi-step flow — a feature, a background job, a cross-service request, a CLI pipeline, a UI action chain — and log at every step under a common marker. Use during implementation of any non-trivial flow so production failures can be grepped end-to-end by one id across every surface the flow touches. The marker enables bulk cleanup before promotion.
---

# Skill: tracer-bullet

A **tracer bullet** is a unique id minted at the entry point of a flow and stamped on every log line emitted during that flow's processing. When something fails, the operator pastes the id and we grep the log-search system — one keyword, complete call chain across every component the flow touched.

The pattern is **stack-, surface-, and topology-agnostic**. Apply it to any non-trivial flow that runs through more than one step:

- **BE + FE wired features** — the canonical example below. The id is minted on the FE (or read from the BE response header) and threaded through the API call.
- **BE-only cross-service chains** — service A → service B → service C, with no FE involvement. Mint at A's entry, propagate via header / payload, log at every hop.
- **Background jobs, batch jobs, cron / scheduled tasks** — mint at job start; threading goes through every step the job runs.
- **Lambdas / serverless functions** — mint at the cold-start entry; carry through every downstream invocation.
- **Sagas / orchestrations / state machines** — mint once at saga init; every state transition logs it.
- **Worker queues / message-driven consumers** — mint at the producer (or read off the inbound message); every consumer that handles the message logs it.
- **CLIs, scripts, data pipelines** — mint at script invocation; every external call or pipeline step logs it.

Only the "entry point" and "where the id surfaces" differ. The marker (`[TRACER]`), the placement rules, and the pre-release cleanup all stay the same.

A common marker on every tracer log line means we can strip them out with one regex before promoting to the next environment (UAT, staging, production — whatever your team's pre-release stage is).

---

## Shape

### 1. Marker

Every tracer log line starts with the literal string:

```
[TRACER]
```

That's the grep token. Used for:

- Log search (whatever your team uses — OpenSearch / Elasticsearch / Kibana / Datadog / Splunk / CloudWatch / Loki / etc.): a `match_phrase` / full-text query on `"[TRACER]"` filters to the tracer-bullet stream.
- Pre-release cleanup: a single regex strips every line.

### 2. debugTraceId

A new UUID generated at the entry point — the outermost handler / controller action, not the inner business logic. Pass it through:

- Every internal command / query / request DTO that the flow constructs (in .NET: `MediatR` request DTOs; in other stacks: whatever your dispatcher / handler shape is).
- All cross-service HTTP/gRPC calls as a header (`X-Debug-Trace-Id`) OR a payload field.
- All internal events the flow emits, as a property on the event payload.

Return it in the API response metadata so the FE / caller shows it in DevTools / pastes it back:

```jsonc
{
  "metadata": { "code": "GEN-0", "message": "Success", "debugTraceId": "..." },
  "data": { ... }
}
```

### 3. Log lines

Every step emits a structured info-level log line using the parameterized form of your logger. Example in .NET:

```csharp
_logger.LogInformation("[TRACER] {debugTraceId} {Stage} — {Detail}", debugTraceId, "ResolveOrder", $"orderId={request.OrderId} lineCount={request.Lines.Count}");
```

Same shape in Node.js / TypeScript:

```ts
logger.info({ tracer: '[TRACER]', debugTraceId, stage: 'ResolveOrder', detail: { orderId: request.orderId, lineCount: request.lines.length } });
```

And in Python:

```python
logger.info("[TRACER] %s %s — %s", debug_trace_id, "ResolveOrder", f"order_id={request.order_id} line_count={len(request.lines)}")
```

- `{Stage}` — short identifier, kebab- or PascalCase: `Entry`, `ValidateInput`, `CallDownstream`, `WriteLocal`, `EmitEvent`, `Return`.
- `{Detail}` — short structured info that actually helps narrow the failure: ids, counts, branch taken, key fields. Not the whole DTO.
- Parameterised — don't string-concat. Use your logger's structured form so the fields land in your log-search system as searchable columns.

---

## Where to place tracer logs

**At minimum** in any new backend / service-side flow:

1. **Entry / exit of every public handler.** Whatever your stack calls "the outermost function called by the request" — controller action, route handler, RPC handler, job entry, message-consumer callback.
2. **Before and after every external call** — HTTP, gRPC, DB write, message-broker publish (Kafka / RabbitMQ / SQS / NATS / etc.), cache flush.
3. **At every conditional fork** — auth / gate decision, gate bypass, validation outcome, branch into different paths.
4. **At every transactional commit** — before (count of pending changes), after (rows affected). In ORM terms: `SaveChangesAsync`, `session.commit()`, `tx.commit()`, etc.
5. **At every catch / except block** — error path; include the exception type and short message.

**Skip** noise traces inside tight loops, mapping code, or pure getters. Tracer bullet should let you reconstruct the *flow*, not the *internals*.

---

## Worked handler template (one stack's flavor — adapt to yours)

This example uses C# / .NET with a MediatR-style handler. The same shape applies in any language: extract the trace id from the inbound request, log at each step with the marker + stage name + a short detail, propagate the id to every downstream call.

```csharp
public async Task<List<OrderResultDto>> Handle(SubmitOrderCommand request, CancellationToken cancellationToken)
{
    var trace = request.DebugTraceId;
    _logger.LogInformation("[TRACER] {trace} Entry — {Detail}", trace, $"orderId={request.OrderId}");

    if (somethingInvalid)
    {
        _logger.LogInformation("[TRACER] {trace} ValidateInput — rejected: {Reason}", trace, "missing customer");
        throw new ApiException(...);
    }

    _logger.LogInformation("[TRACER] {trace} CallDownstream — start", trace);
    var downstreamResult = await _client.CallAsync(new DownstreamRequest { DebugTraceId = trace, ... }, cancellationToken);
    _logger.LogInformation("[TRACER] {trace} CallDownstream — done count={Count}", trace, downstreamResult.Count);

    _logger.LogInformation("[TRACER] {trace} WriteLocal — staging {Count} rows", trace, lines.Count);
    foreach (var line in lines) _unitOfWork.OrderLines.Add(line);
    await _unitOfWork.SaveChangesAsync(cancellationToken);
    _logger.LogInformation("[TRACER] {trace} WriteLocal — saved", trace);

    _logger.LogInformation("[TRACER] {trace} Return", trace);
    return downstreamResult;
}
```

In Node.js / TypeScript, Python, Go, etc. the body shape collapses to the same five log points: `Entry`, `ValidateInput` (on rejection), `CallDownstream` (around the network hop), `WriteLocal` (around the commit), `Return`.

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

## Pre-release cleanup

Before promoting to the next environment, strip the tracer-bullet lines so production logs stay clean.

### What to remove

- **Every tracer log call** (`_logger.LogInformation("[TRACER] ...")`, `logger.info({ tracer: '[TRACER]', ... })`, equivalents in your stack) in handlers, controllers, services that were added during the implementation phase.
- **`DebugTraceId` properties** on internal DTOs/commands/events — keep only if they have a non-debug purpose.
- **The header / payload field propagating the id** across service boundaries — keep if you want to keep the id but lose the verbose logs, otherwise remove.

### How to find them

```bash
# Find all tracer log lines across the affected repos.
# Replace --include with your codebase's primary source extensions (--include="*.cs", "*.ts", "*.py", "*.go", etc.).
grep -rnE '\[TRACER\]' <repo-a> <repo-b> <repo-c> --include="*.<ext>"
```

A single shell command sweep finds every site. Remove the line; verify the surrounding closure (delete the variable holding `trace` if it becomes unused, remove the `DebugTraceId` property on the DTO if no longer referenced).

### When to do it

- Author the tracer in Phase 7 (implementation).
- Keep through dev verification + reviewer feedback round.
- **Strip in a dedicated commit** right before the promotion that publishes logs to the team's shared search backend (UAT / staging / production — whichever stage that is in your pipeline).
- Commit message: `<TICKET-KEY>: strip tracer-bullet logs before pre-release promotion`.

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

- Stage = short identifier: `Entry`, `CallCreateRecordApi`, `ApiResponse`, `OpenPopup`, `RefetchItemDetail`, `Return`.
- Second argument = an object literal of short structured fields — ids, counts, branch decisions. **Do not log the whole response body** or the whole DTO.
- Use `console.log` for the trace itself. Existing `console.error` in catch blocks gets prefixed with `[TRACER-FE] ${traceRequestId}` and stays as `console.error`.

### React-specific guidance

- For React components, mint the id at the top of the user-action callback (`useCallback` handler), not in a `useEffect` — `useEffect` runs on render and would generate noise.
- Don't `useRef`/`useState` the id unless the chain crosses async boundaries that need it later. Pass it as an arg or capture it in the closure.
- For async chains across multiple API calls within one user action, **reuse the same id across all calls** — that's the whole point.

### Pre-release cleanup (FE)

```bash
# Find every FE tracer site
grep -rnE '\[TRACER-FE\]' <frontend-repo> --include="*.{ts,tsx,js,jsx}"
```

Remove:
- Every `console.log(`[TRACER-FE] …`)` line.
- The `[TRACER-FE]` prefix on `console.error` lines.
- `traceRequestId` consts when no longer referenced after the logs go.
- `X-Debug-Trace-Id` headers on API calls — keep ONLY if you have an unrelated need; otherwise strip.

Single grep + one commit per repo, message `<TICKET-KEY>: strip tracer-bullet logs before pre-release promotion`. Cover BE + FE in the same commit when the feature spans both.

### When to apply on FE

- Yes: a new user flow with multiple steps, an API chain, or modal/popup state that's hard to inspect.
- Yes: any flow where a BE failure on the user's session needs to be greppable end-to-end (FE shows the id in DevTools → user pastes → backend logs found via same id).
- No: a one-line FE tweak, a CSS change, a typo fix. Don't bolt tracer onto trivial work.

---

## Integration with dev-agent

If you're using the [`dev-agent`](../../../dev-agent) plugin, Phase 7 (Implementation) should:

1. Generate the `debugTraceId` at the outermost entry point of the feature's new endpoint(s) / handler(s) / job(s).
2. Thread it through every new internal request DTO, command, query, or event the slice introduces (whatever your stack's dispatcher shape is — MediatR-style requests, plain function args, RPC payloads, etc.).
3. Add tracer logs at the points listed in "Where to place tracer logs" above.
4. Return the id in the response metadata.
5. Note in `output/07-impl.md` that the tracer is in place and **flag the pre-release cleanup commit** as a pending todo.

Phase 8 (E2E) and Phase 9 (Patch) use the tracer to narrow regressions — when a step fails on dev, the user pastes the id and the agent greps the log-search system by `[TRACER]` + the id.

Phase between dev verification and the next-environment promotion: the pre-release cleanup commit must land before that environment's deploy job runs.

---

## Anti-patterns

- **Logging the whole request DTO.** Tracer logs are about *flow*, not *content*. Log ids, counts, branch decisions.
- **Forgetting the marker.** A log without `[TRACER]` won't be picked up by either the log-search filter or the cleanup grep.
- **Using a different marker per feature.** One marker for the whole workspace — `[TRACER]` — so the cleanup grep is universal.
- **Logging tracer in third-party libraries / shared infrastructure code.** Trace your slice only. Don't bloat shared code.
- **Letting the tracer survive past pre-release verification.** A noisy info-log in prod is wasted log budget and a signal/noise destroyer. Strip before pre-release promotion.
