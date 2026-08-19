// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Options for the entity storage tracing connector.
 */
export interface IEntityStorageTracingConnectorConstructorOptions {
	/**
	 * The type of the entity storage connector to use for the spans.
	 * @default span
	 */
	spanStorageConnectorType?: string;

	/**
	 * The type of the platform component to use for per-tenant execution.
	 * @default platform
	 */
	platformComponentType?: string;
}
