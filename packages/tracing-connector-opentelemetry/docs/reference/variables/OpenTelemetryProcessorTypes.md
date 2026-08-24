# Variable: OpenTelemetryProcessorTypes

> `const` **OpenTelemetryProcessorTypes**: `object`

The types of span processor which feed the exporter.

## Type Declaration

### Batch {#batch}

> `readonly` **Batch**: `"batch"` = `"batch"`

Buffer spans and export them in batches, this is the default.

### Simple {#simple}

> `readonly` **Simple**: `"simple"` = `"simple"`

Export each span as soon as it ends.
