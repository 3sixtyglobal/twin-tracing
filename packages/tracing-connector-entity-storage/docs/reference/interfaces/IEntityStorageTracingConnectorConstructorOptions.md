# Interface: IEntityStorageTracingConnectorConstructorOptions

Options for the entity storage tracing connector.

## Properties

### spanStorageConnectorType? {#spanstorageconnectortype}

> `optional` **spanStorageConnectorType?**: `string`

The type of the entity storage connector to use for the spans.

#### Default

```ts
span
```

***

### platformComponentType? {#platformcomponenttype}

> `optional` **platformComponentType?**: `string`

The type of the platform component to use for per-tenant execution.

#### Default

```ts
platform
```

***

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The type of the logging component to use for reporting retention failures.

#### Default

```ts
logging
```

***

### config? {#config}

> `optional` **config?**: [`IEntityStorageTracingConnectorConfig`](IEntityStorageTracingConnectorConfig.md)

The configuration for the entity storage tracing connector.
