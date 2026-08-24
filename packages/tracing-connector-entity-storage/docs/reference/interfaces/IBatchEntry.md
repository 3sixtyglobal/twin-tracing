# Interface: IBatchEntry

A pending span held in the batch cache, preserving the tenant context
captured at submission time so it can be faithfully replayed on flush.

## Properties

### entity {#entity}

> **entity**: [`Span`](../classes/Span.md)

The storage entity built from the span at the time it was submitted.

***

### contextIds {#contextids}

> **contextIds**: `IContextIds`

Full context IDs snapshot taken at submission time; used to restore context on flush.

***

### perTenant {#pertenant}

> **perTenant**: `boolean`

True when the span was produced outside any tenant context and must be
written to every tenant via execute on flush.
