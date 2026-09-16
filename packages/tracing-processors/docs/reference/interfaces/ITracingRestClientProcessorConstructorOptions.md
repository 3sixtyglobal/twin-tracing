# Interface: ITracingRestClientProcessorConstructorOptions

Options for the TracingRestClientProcessor constructor.

## Properties

### tracingComponentType? {#tracingcomponenttype}

> `optional` **tracingComponentType?**: `string`

The type for the tracing component, when absent no spans are created and no trace header is
sent.

***

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The type for the logging component, used to report a tracing failure.

***

### config? {#config}

> `optional` **config?**: [`ITracingRestClientProcessorConfig`](ITracingRestClientProcessorConfig.md)

Configuration for the processor.
