# Interface: ITracingFacadeConstructorOptions

Options for the tracing facade constructor.

## Properties

### tracingComponentType? {#tracingcomponenttype}

> `optional` **tracingComponentType?**: `string`

The component type for the optional tracing component used for spans. When it does not
resolve the facade passes every call straight through.

***

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The component type for the optional logging component, used to report a tracing failure.

***

### config? {#config}

> `optional` **config?**: [`ITracingFacadeConfig`](ITracingFacadeConfig.md)

The configuration for the facade.
