// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IConsoleTracingConnectorConfig } from "./IConsoleTracingConnectorConfig.js";

/**
 * Options for the console tracing connector constructor.
 */
export interface IConsoleTracingConnectorConstructorOptions {
	/**
	 * The configuration for the console tracing connector.
	 */
	config?: IConsoleTracingConnectorConfig;
}
