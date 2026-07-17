// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Options for the tracing service constructor.
 */
export interface ITracingServiceConstructorOptions {
	/**
	 * The type of the tracing connector to use.
	 * @default tracing
	 */
	tracingConnectorType?: string;
}
