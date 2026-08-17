// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the tracing route processor.
 */
export interface ITracingRouteProcessorConfig {
	/**
	 * Request URL path prefixes to skip tracing.
	 */
	excludePaths?: string[];

	/**
	 * Route operation IDs to skip tracing.
	 */
	excludeOperationIds?: string[];
}
