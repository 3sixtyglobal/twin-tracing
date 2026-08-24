// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the tracing REST client processor.
 */
export interface ITracingRestClientProcessorConfig {
	/**
	 * Route templates to skip tracing.
	 */
	excludePaths?: string[];
}
