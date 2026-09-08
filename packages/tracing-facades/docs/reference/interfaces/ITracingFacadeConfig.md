# Interface: ITracingFacadeConfig

Configuration for the tracing facade.

The method and parameter patterns are dot separated and matched from the right, so `password`
and `*.*.password` both match a parameter of that name on any method of any class, while
`NotarizationService.create.controllerIdentity` matches only that one. A `*` matches any single
segment.

## Properties

### excludeParams? {#excludeparams}

> `optional` **excludeParams?**: `string`[]

Patterns for parameters whose values are never recorded, whatever their type, matched
against `class.method.parameter`. Supplying this replaces TracingFacade.DEFAULT_EXCLUDE_PARAMS.

***

### excludeMethods? {#excludemethods}

> `optional` **excludeMethods?**: `string`[]

Patterns for methods which are not intercepted at all, matched against `class.method`.
Supplying this replaces TracingFacade.DEFAULT_EXCLUDE_METHODS.

***

### includeObjects? {#includeobjects}

> `optional` **includeObjects?**: `string`[]

Patterns for parameters to record even when the value is not primitive, matched against
`class.method.parameter`. A further segment selects a single property, so
`NotarizationService.create.notarization.mode` records only the mode. Any other non
primitive parameter is not recorded.

***

### maxStringLength? {#maxstringlength}

> `optional` **maxStringLength?**: `number`

The maximum length of a recorded string, longer values are truncated.

#### Default

```ts
256
```

***

### maxArrayLength? {#maxarraylength}

> `optional` **maxArrayLength?**: `number`

The maximum number of entries recorded for an array.

#### Default

```ts
10
```
