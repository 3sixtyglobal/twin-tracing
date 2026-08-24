// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

import type { ITracingRestClientProcessorConfig } from "./ITracingRestClientProcessorConfig.js";

/**
 * Options for the TracingRestClientProcessor constructor.
 */
export interface ITracingRestClientProcessorConstructorOptions {
	/**
	 * The type for the tracing component, when absent no spans are created and no trace header is
	 * sent.
	 */
	tracingComponentType?: string;

	/**
	 * Configuration for the processor.
	 */
	config?: ITracingRestClientProcessorConfig;
}
