# Variable: SpanAttributes

> `const` **SpanAttributes**: `object`

The span attribute keys which are not specific to any domain, following the OpenTelemetry
semantic conventions. Domain specific keys belong with the domain, alongside its metric ids.

## Type Declaration

### ExceptionMessage {#exceptionmessage}

> `readonly` **ExceptionMessage**: `"exception.message"` = `"exception.message"`

The message of the exception which ended the span.
