// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the Entity Storage Tracing Connector.
 */
export interface IEntityStorageTracingConnectorConfig {
	/**
	 * Flush the cache once this many spans have accumulated.
	 * Set to 1 or below to disable size-based flushing.
	 * When combined with batchIntervalMs, whichever threshold is reached first triggers the flush.
	 * @default 10
	 */
	batchSize?: number;

	/**
	 * Flush the cache after this many milliseconds have elapsed since the last flush.
	 * Set to 0 or below to disable time-based flushing.
	 * When combined with batchSize, whichever threshold is reached first triggers the flush.
	 * @default 5000
	 */
	batchIntervalMs?: number;

	/**
	 * Maximum number of spans to hold in the in-memory cache.
	 * When a flush fails, re-queued spans are trimmed to this limit by dropping the oldest first.
	 * Set to 0 to disable the limit.
	 * @default 1000
	 */
	maxCacheSize?: number;

	/**
	 * Delete ended spans whose start timestamp is older than this many milliseconds. Never
	 * removes a span that has not been ended - see retainOpenForMs for that.
	 * Set to 0 to disable age-based retention.
	 * @default 172800000 (2 days)
	 */
	retainForMs?: number;

	/**
	 * Delete open spans older than this many milliseconds, presumed abandoned. Set to 0 to disable.
	 * @default 345600000 (4 days)
	 */
	retainOpenForMs?: number;

	/**
	 * Keep at most this many ended spans. When the stored ended-span count exceeds this limit,
	 * the oldest ended spans (by start timestamp) are removed first. Never counts or removes a
	 * span that has not been ended.
	 * When combined with retainForMs, age-based cleanup runs first.
	 * Set to 0 to disable count-based retention.
	 * @default 10000
	 */
	maxEntries?: number;

	/**
	 * Keep at most this many open spans, oldest-first - a safety valve bounding worst-case growth
	 * from spans that never end well before retainOpenForMs would. Set to 0 to disable.
	 * @default 1000
	 */
	maxOpenEntries?: number;

	/**
	 * How often the retention cleanup task runs in milliseconds.
	 * Has no effect when retainForMs, retainOpenForMs, maxEntries, and maxOpenEntries are all 0.
	 * Set to 0 to disable periodic cleanup.
	 * @default 300000 (5 minutes)
	 */
	retentionIntervalMs?: number;

	/**
	 * Maximum number of spans to delete per removeBatch call during a cleanup pass.
	 * Keeping this value small avoids spikes in database load.
	 * @default 1000
	 */
	retentionBatchSize?: number;
}
