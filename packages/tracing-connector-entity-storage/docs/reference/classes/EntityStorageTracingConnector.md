# Class: EntityStorageTracingConnector

Class for performing tracing operations in entity storage.

## Implements

- `ITracingConnector`

## Constructors

### Constructor

> **new EntityStorageTracingConnector**(`options?`): `EntityStorageTracingConnector`

Create a new instance of EntityStorageTracingConnector.

#### Parameters

##### options?

[`IEntityStorageTracingConnectorConstructorOptions`](../interfaces/IEntityStorageTracingConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`EntityStorageTracingConnector`

## Properties

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"entity-storage"`

The namespace supported by the tracing connector.

***

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### DEFAULT\_BATCH\_SIZE {#default_batch_size}

> `readonly` `static` **DEFAULT\_BATCH\_SIZE**: `number` = `10`

Default number of spans to accumulate before flushing.

***

### DEFAULT\_BATCH\_INTERVAL\_MS {#default_batch_interval_ms}

> `readonly` `static` **DEFAULT\_BATCH\_INTERVAL\_MS**: `number` = `5000`

Default interval in milliseconds between automatic flushes.

***

### DEFAULT\_MAX\_CACHE\_SIZE {#default_max_cache_size}

> `readonly` `static` **DEFAULT\_MAX\_CACHE\_SIZE**: `number` = `1000`

Default maximum number of spans to hold in the in-memory cache.

***

### DEFAULT\_RETENTION\_INTERVAL\_MS {#default_retention_interval_ms}

> `readonly` `static` **DEFAULT\_RETENTION\_INTERVAL\_MS**: `number` = `300000`

Default interval in milliseconds between retention cleanup runs, 5 minutes.

***

### DEFAULT\_RETAIN\_FOR\_MS {#default_retain_for_ms}

> `readonly` `static` **DEFAULT\_RETAIN\_FOR\_MS**: `number` = `172800000`

Default maximum age of an ended span before it is removed, 2 days.

***

### DEFAULT\_RETAIN\_OPEN\_FOR\_MS {#default_retain_open_for_ms}

> `readonly` `static` **DEFAULT\_RETAIN\_OPEN\_FOR\_MS**: `number` = `345600000`

Default maximum age of an open span before it is presumed abandoned and removed, 4 days (2x the ended-span default).

***

### DEFAULT\_MAX\_ENTRIES {#default_max_entries}

> `readonly` `static` **DEFAULT\_MAX\_ENTRIES**: `number` = `10000`

Default maximum number of ended spans to keep in storage.

***

### DEFAULT\_MAX\_OPEN\_ENTRIES {#default_max_open_entries}

> `readonly` `static` **DEFAULT\_MAX\_OPEN\_ENTRIES**: `number` = `1000`

Default maximum number of open spans to keep in storage, a safety valve bounding worst-case growth from spans that never end (e.g. a caller bug) well before retainOpenForMs would.

***

### DEFAULT\_RETENTION\_BATCH\_SIZE {#default_retention_batch_size}

> `readonly` `static` **DEFAULT\_RETENTION\_BATCH\_SIZE**: `number` = `1000`

Default maximum number of spans to delete per removeBatch call.

***

### RETENTION\_MAX\_BATCHES\_PER\_PASS {#retention_max_batches_per_pass}

> `readonly` `static` **RETENTION\_MAX\_BATCHES\_PER\_PASS**: `number` = `10`

Maximum number of delete batches issued in a single retention pass, bounding the work of a
pass so a large backlog drains across intervals instead of in one burst.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`ITracingConnector.className`

***

### start() {#start}

> **start**(): `Promise`\<`void`\>

Start the connector; sets up the interval timer when batchIntervalMs is configured.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the connector is ready to accept spans.

#### Implementation of

`ITracingConnector.start`

***

### stop() {#stop}

> **stop**(): `Promise`\<`void`\>

Stop the connector; flushes any remaining cached spans and clears the timer.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the final flush completes and the timer is cleared.

#### Implementation of

`ITracingConnector.stop`

***

### startSpan() {#startspan}

> **startSpan**(`name`, `options?`): `Promise`\<`ISpan`\>

Start a new span, persisting it as an open span.

#### Parameters

##### name

`string`

The name of the span.

##### options?

`ISpanOptions`

The options for the span.

#### Returns

`Promise`\<`ISpan`\>

The started span, including its minted context.

#### Implementation of

`ITracingConnector.startSpan`

***

### endSpan() {#endspan}

> **endSpan**(`span`, `status?`): `Promise`\<`void`\>

End a span, finalizing its status and duration and updating the persisted span. The span must
already exist (i.e. have been started/recorded); ending a span that was never started fails
rather than silently creating a completed row.

#### Parameters

##### span

`ISpan`

The span to end.

##### status?

`SpanStatus`

The status to set on the span, defaults to ok.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the span has been ended.

#### Throws

NotFoundError if no span with the given id has been persisted or cached.

#### Implementation of

`ITracingConnector.endSpan`

***

### recordSpan() {#recordspan}

> **recordSpan**(`span`): `Promise`\<`void`\>

Record a pre-built span verbatim, persisting it as-is (upsert) without minting a new context
or finalizing it; the span may be open or completed. Used by fan-out connectors and reused by
`startSpan` to persist the open span.

#### Parameters

##### span

`ISpan`

The span to record.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the span has been recorded.

#### Implementation of

`ITracingConnector.recordSpan`

***

### query() {#query}

> **query**(`conditions?`, `sortProperties?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `ISpan`[]; `cursor?`: `string`; \}\>

Query the spans.
Any pending batched spans are flushed before the query executes so results are always current.

#### Parameters

##### conditions?

`EntityCondition`\<`ISpan`\>

The conditions to match for the entities.

##### sortProperties?

`object`[]

The optional sort order.

##### cursor?

`string`

The cursor to request the next chunk of entities.

##### limit?

`number`

Limit the number of entities to return.

#### Returns

`Promise`\<\{ `entities`: `ISpan`[]; `cursor?`: `string`; \}\>

All the entities for the storage matching the conditions,
and a cursor which can be used to request more entities.

#### Implementation of

`ITracingConnector.query`

***

### flush() {#flush}

> **flush**(): `Promise`\<`void`\>

Write all cached spans to storage and clear the cache.
Spans sharing the same tenant context are grouped into a single setBatch call.
On a storage write failure the spans are returned to the head of the cache for the next attempt.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the cached spans have been written to storage.
