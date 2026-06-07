# @dbun/observability - AI Agent Instructions

## Overview

@dbun/observability provides OpenTelemetry-based tracing and metrics for the @dbun Discord wrapper. Uses `@opentelemetry/api` for vendor-neutral instrumentation.

## Commands

```bash
bun run build    # tsdown build
bun run dev      # watch mode
bun run lint     # oxlint src
bun run fmt      # oxfmt src
bun run typecheck # tsgo --noEmit
bun run clean    # rm -rf dist .turbo
```

## Key Exports

- `DBunTracer` - Wraps OpenTelemetry tracer with span helpers
- `DBunMetrics` - Provides counters and histograms for events, API calls, cache hits/misses
- `TracerOptions` - Options for configuring the tracer (serviceName, attributes)

## Architecture

- `DBunTracer` creates spans via OpenTelemetry, auto-records errors/exceptions
- `DBunMetrics` tracks counters (events received, REST calls, WS reconnects) and histograms (latency)
- Both are optional - if no exporter is configured, they act as no-ops
- Integrated with `Client` to automatically instrument gateway events and REST calls

## Common Patterns

```typescript
import { DBunTracer, DBunMetrics } from "@dbun/observability";

const tracer = new DBunTracer({ serviceName: "my-bot" });
const span = tracer.startSpan("message.process");
// ... do work
span.end();

// Metrics
const metrics = new DBunMetrics();
metrics.eventsReceived.add(1);
metrics.apiLatency.record(42.5);
```

## Dependencies

- `@dbun/types` (workspace:*)
- `@opentelemetry/api` (catalog)

## Testing

- Test span creation and attribute recording
- Test metric recording increments
- Test no-op behavior without exporter
