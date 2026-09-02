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

***

### retainForMs? {#retainforms}

> `optional` **retainForMs?**: `number`

Delete ended spans whose start timestamp is older than this many milliseconds. Never
removes a span that has not been ended - see retainOpenForMs for that.
Set to 0 to disable age-based retention.

#### Default

```ts
172800000 (2 days)
```

***

### retainOpenForMs? {#retainopenforms}

> `optional` **retainOpenForMs?**: `number`

Delete open spans older than this many milliseconds, presumed abandoned. Set to 0 to disable.

#### Default

```ts
345600000 (4 days)
```

***

### maxEntries? {#maxentries}

> `optional` **maxEntries?**: `number`

Keep at most this many ended spans. When the stored ended-span count exceeds this limit,
the oldest ended spans (by start timestamp) are removed first. Never counts or removes a
span that has not been ended.
When combined with retainForMs, age-based cleanup runs first.
Set to 0 to disable count-based retention.

#### Default

```ts
10000
```

***

### maxOpenEntries? {#maxopenentries}

> `optional` **maxOpenEntries?**: `number`

Keep at most this many open spans, oldest-first - a safety valve bounding worst-case growth
from spans that never end well before retainOpenForMs would. Set to 0 to disable.

#### Default

```ts
1000
```

***

### retentionIntervalMs? {#retentionintervalms}

> `optional` **retentionIntervalMs?**: `number`

How often the retention cleanup task runs in milliseconds.
Has no effect when retainForMs, retainOpenForMs, maxEntries, and maxOpenEntries are all 0.
Set to 0 to disable periodic cleanup.

#### Default

```ts
300000 (5 minutes)
```

***

### retentionBatchSize? {#retentionbatchsize}

> `optional` **retentionBatchSize?**: `number`

Maximum number of spans to delete per removeBatch call during a cleanup pass.
Keeping this value small avoids spikes in database load.

#### Default

```ts
1000
```
