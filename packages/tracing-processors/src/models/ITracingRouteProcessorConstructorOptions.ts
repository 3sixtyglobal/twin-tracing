// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITracingRouteProcessorConfig } from "./ITracingRouteProcessorConfig.js";

/**
 * Options for the TracingRouteProcessor constructor.
 */
export interface ITracingRouteProcessorConstructorOptions {
	/**
	 * The type for the tracing component.
	 */
	tracingComponentType?: string;

	/**
	 * The type for the logging component.
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the tracing route processor.
	 */
	config?: ITracingRouteProcessorConfig;
}
