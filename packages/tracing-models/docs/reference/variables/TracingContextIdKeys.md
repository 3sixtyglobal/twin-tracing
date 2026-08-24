# Variable: TracingContextIdKeys

> `const` **TracingContextIdKeys**: `object`

The context id keys used by tracing.

## Type Declaration

### TraceId {#traceid}

> `readonly` **TraceId**: `"traceId"` = `"traceId"`

The id of the trace the current span belongs to, as a 16 byte hex string.

### SpanId {#spanid}

> `readonly` **SpanId**: `"spanId"` = `"spanId"`

The id of the span currently in scope, which a new span uses as its parent, as an 8 byte hex
string.

### TraceFlags {#traceflags}

> `readonly` **TraceFlags**: `"traceFlags"` = `"traceFlags"`

The trace flags of the current span, as a 2 character hex string, where the least significant
bit indicates the trace is sampled.
