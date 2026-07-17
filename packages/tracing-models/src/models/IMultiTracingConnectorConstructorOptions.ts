// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Options for the multi tracing connector.
 */
export interface IMultiTracingConnectorConstructorOptions {
	/**
	 * The tracing connectors to multiplex.
	 */
	tracingConnectorTypes: string[];
}
