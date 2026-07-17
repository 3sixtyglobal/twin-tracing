# Class: SilentTracingConnector

Class for performing tracing operations to nowhere.

## Implements

- [`ITracingConnector`](../interfaces/ITracingConnector.md)

## Constructors

### Constructor

> **new SilentTracingConnector**(): `SilentTracingConnector`

#### Returns

`SilentTracingConnector`

## Properties

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"silent"`

The namespace for the tracing connector.

***

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

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

### startSpan() {#startspan}

> **startSpan**(`name`, `options?`): `Promise`\<[`ISpan`](../interfaces/ISpan.md)\>

Start a new span.

#### Parameters

##### name

`string`

The name of the span.

##### options?

[`ISpanOptions`](../interfaces/ISpanOptions.md)

The options for the span.

#### Returns

`Promise`\<[`ISpan`](../interfaces/ISpan.md)\>

The started span, including its minted context.

#### Implementation of

[`ITracingConnector`](../interfaces/ITracingConnector.md).[`startSpan`](../interfaces/ITracingConnector.md#startspan)

***

### endSpan() {#endspan}

> **endSpan**(`span`, `status?`): `Promise`\<`void`\>

End a span, finalizing its status and duration.

#### Parameters

##### span

[`ISpan`](../interfaces/ISpan.md)

The span to end.

##### status?

[`SpanStatus`](../type-aliases/SpanStatus.md)

The status to set on the span, defaults to ok.

#### Returns

`Promise`\<`void`\>

A promise that resolves immediately without persisting the span.

#### Implementation of

[`ITracingConnector`](../interfaces/ITracingConnector.md).[`endSpan`](../interfaces/ITracingConnector.md#endspan)

***

### recordSpan() {#recordspan}

> **recordSpan**(`span`): `Promise`\<`void`\>

Record a pre-built span to the connector.

#### Parameters

##### span

[`ISpan`](../interfaces/ISpan.md)

The span to record.

#### Returns

`Promise`\<`void`\>

A promise that resolves immediately without persisting the span.

#### Implementation of

[`ITracingConnector`](../interfaces/ITracingConnector.md).[`recordSpan`](../interfaces/ITracingConnector.md#recordspan)

***

### query() {#query}

> **query**(`conditions?`, `sortProperties?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: [`ISpan`](../interfaces/ISpan.md)[]; `cursor?`: `string`; \}\>

Query the spans.

#### Parameters

##### conditions?

`EntityCondition`\<[`ISpan`](../interfaces/ISpan.md)\>

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

`Promise`\<\{ `entities`: [`ISpan`](../interfaces/ISpan.md)[]; `cursor?`: `string`; \}\>

All the entities for the storage matching the conditions,
and a cursor which can be used to request more entities.

#### Implementation of

[`ITracingConnector`](../interfaces/ITracingConnector.md).[`query`](../interfaces/ITracingConnector.md#query)
