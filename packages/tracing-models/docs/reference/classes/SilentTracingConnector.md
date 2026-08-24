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
