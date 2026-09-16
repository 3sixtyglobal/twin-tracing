// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageTracingConnectorConfig } from "./IEntityStorageTracingConnectorConfig.js";

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

	/**
	 * The type of the logging component to use for reporting retention failures.
	 * @default logging
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the entity storage tracing connector.
	 */
	config?: IEntityStorageTracingConnectorConfig;
}
