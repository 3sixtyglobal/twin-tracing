# Interface: IEntityStorageTracingConnectorConfig

Configuration for the Entity Storage Tracing Connector.

## Properties

### batchSize? {#batchsize}

> `optional` **batchSize?**: `number`

Flush the cache once this many spans have accumulated.
Set to 1 or below to disable size-based flushing.
When combined with batchIntervalMs, whichever threshold is reached first triggers the flush.

#### Default

```ts
10
```

***

### batchIntervalMs? {#batchintervalms}

> `optional` **batchIntervalMs?**: `number`

Flush the cache after this many milliseconds have elapsed since the last flush.
Set to 0 or below to disable time-based flushing.
When combined with batchSize, whichever threshold is reached first triggers the flush.

#### Default

```ts
5000
```

***

### maxCacheSize? {#maxcachesize}

> `optional` **maxCacheSize?**: `number`

Maximum number of spans to hold in the in-memory cache.
When a flush fails, re-queued spans are trimmed to this limit by dropping the oldest first.
Set to 0 to disable the limit.

#### Default

```ts
1000
```

***

### mutexTimeoutMs? {#mutextimeoutms}

> `optional` **mutexTimeoutMs?**: `number`

Maximum number of milliseconds to wait when acquiring a mutex lock before timing out.
