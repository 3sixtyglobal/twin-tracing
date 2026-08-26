# Class: ConsoleTracingConnector

Class for writing spans to the console, intended for development and debugging.

The connector is a pure sink, it does not persist spans and therefore does not implement `query()`.

## Implements

- `ITracingConnector`

## Constructors

### Constructor

> **new ConsoleTracingConnector**(`options?`): `ConsoleTracingConnector`

Create a new instance of ConsoleTracingConnector.

#### Parameters

##### options?

[`IConsoleTracingConnectorConstructorOptions`](../interfaces/IConsoleTracingConnectorConstructorOptions.md)

The options for the tracing connector.

#### Returns

`ConsoleTracingConnector`

## Properties

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"console"`

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

> **startSpan**(`name`, `options?`): `Promise`\<`ISpan`\>

Start a span, which produces no output since there is nothing to report until it ends.

#### Parameters

##### name

`string`

The name of the span.

##### options?

`ISpanOptions`

The options for the span.

#### Returns

`Promise`\<`ISpan`\>

The span with a minted context.

#### Implementation of

`ITracingConnector.startSpan`

***

### endSpan() {#endspan}

> **endSpan**(`span`, `status?`): `Promise`\<`void`\>

End a span and write it to the console.

#### Parameters

##### span

`ISpan`

The span to end.

##### status?

`SpanStatus`

The status to end the span with.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the span has been written.

#### Implementation of

`ITracingConnector.endSpan`

***

### recordSpan() {#recordspan}

> **recordSpan**(`span`): `Promise`\<`void`\>

Write a span to the console. The span is recorded verbatim, never finalized here, so one
which is still in flight is written without a duration.

#### Parameters

##### span

`ISpan`

The span to record.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the span has been written.

#### Implementation of

`ITracingConnector.recordSpan`
