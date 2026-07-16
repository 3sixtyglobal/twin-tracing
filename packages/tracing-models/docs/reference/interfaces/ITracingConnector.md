# Interface: ITracingConnector

Interface describing a tracing connector.

## Extends

- `IComponent`

## Methods

### startSpan() {#startspan}

> **startSpan**(`name`, `options?`): `Promise`\<[`ISpan`](ISpan.md)\>

Start a new span.

#### Parameters

##### name

`string`

The name of the span.

##### options?

[`ISpanOptions`](ISpanOptions.md)

The options for the span.

#### Returns

`Promise`\<[`ISpan`](ISpan.md)\>

The started span, including its minted context.

***

### endSpan() {#endspan}

> **endSpan**(`span`, `status?`): `Promise`\<`void`\>

End a span, finalizing its status and duration.

#### Parameters

##### span

[`ISpan`](ISpan.md)

The span to end.

##### status?

[`SpanStatus`](../type-aliases/SpanStatus.md)

The status to set on the span, defaults to ok.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the span has been ended.

***

### query()? {#query}

> `optional` **query**(`conditions?`, `sortProperties?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: [`ISpan`](ISpan.md)[]; `cursor?`: `string`; \}\>

Query the spans.

#### Parameters

##### conditions?

`EntityCondition`\<[`ISpan`](ISpan.md)\>

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

`Promise`\<\{ `entities`: [`ISpan`](ISpan.md)[]; `cursor?`: `string`; \}\>

All the entities for the storage matching the conditions,
and a cursor which can be used to request more entities.

#### Throws

NotImplementedError if the implementation does not support retrieval.
