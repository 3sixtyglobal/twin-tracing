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
	 * Maximum number of milliseconds to wait when acquiring a mutex lock before timing out.
	 */
	mutexTimeoutMs?: number;
}
