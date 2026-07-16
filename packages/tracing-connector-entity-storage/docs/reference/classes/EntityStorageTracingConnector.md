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

End a span, finalizing its status and duration and updating the persisted span.

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

#### Implementation of

`ITracingConnector.endSpan`

***

### query() {#query}

> **query**(`conditions?`, `sortProperties?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `ISpan`[]; `cursor?`: `string`; \}\>

Query the spans.

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
