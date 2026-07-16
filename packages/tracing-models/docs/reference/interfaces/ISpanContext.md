# Interface: ISpanContext

The context which uniquely identifies a span within a trace, following the W3C Trace Context format.

## Properties

### traceId {#traceid}

> **traceId**: `string`

The id of the trace the span belongs to, as a 16 byte hex string.

***

### spanId {#spanid}

> **spanId**: `string`

The id of the span, as an 8 byte hex string.

***

### traceFlags {#traceflags}

> **traceFlags**: `number`

The trace flags bitfield, where the least significant bit indicates the span is sampled.
