// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IOpenTelemetryTracingConnectorConfig } from "./IOpenTelemetryTracingConnectorConfig.js";

/**
 * The options for constructing the OpenTelemetry tracing connector.
 */
export interface IOpenTelemetryTracingConnectorConstructorOptions {
	/**
	 * The config for the tracing connector.
	 */
	config?: IOpenTelemetryTracingConnectorConfig;
}
