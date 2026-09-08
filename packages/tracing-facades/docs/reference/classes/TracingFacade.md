# Class: TracingFacade

Facade which records a span for each external call to an async method on the component it wraps,
so a component can be traced without being modified.

Only methods declared async are traced. A span cannot be opened synchronously, so wrapping a
synchronous method would make it return a promise and break the contract of the wrapped
component.

## Implements

- `IFacade`
- `IComponent`

## Constructors

### Constructor

> **new TracingFacade**(`options?`): `TracingFacade`

Create a new instance of TracingFacade.

#### Parameters

##### options?

[`ITracingFacadeConstructorOptions`](../interfaces/ITracingFacadeConstructorOptions.md)

The options for the facade.

#### Returns

`TracingFacade`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### DEFAULT\_EXCLUDE\_METHODS {#default_exclude_methods}

> `readonly` `static` **DEFAULT\_EXCLUDE\_METHODS**: `string`[]

The methods that are excluded from tracing by default.

***

### DEFAULT\_EXCLUDE\_PARAMS {#default_exclude_params}

> `readonly` `static` **DEFAULT\_EXCLUDE\_PARAMS**: `string`[]

The parameters that are excluded from recording by default.

***

### DEFAULT\_MAX\_STRING\_LENGTH {#default_max_string_length}

> `readonly` `static` **DEFAULT\_MAX\_STRING\_LENGTH**: `number` = `256`

The default maximum length of a recorded string.

***

### DEFAULT\_MAX\_ARRAY\_LENGTH {#default_max_array_length}

> `readonly` `static` **DEFAULT\_MAX\_ARRAY\_LENGTH**: `number` = `10`

The default maximum number of entries recorded for an array.

***

### RESULT\_NAME {#result_name}

> `readonly` `static` **RESULT\_NAME**: `string` = `"resolved"`

The name a returned value is matched under, so it can be excluded or have a property
selected with the same patterns as a parameter.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IComponent.className`

***

### wrap() {#wrap}

> **wrap**\<`T`\>(`target`): `T`

Wrap the target so its method calls are recorded as spans.

#### Type Parameters

##### T

`T`

#### Parameters

##### target

`T`

The component to wrap.

#### Returns

`T`

The wrapped component, or the target itself when there is no tracing component.

#### Implementation of

`IFacade.wrap`
