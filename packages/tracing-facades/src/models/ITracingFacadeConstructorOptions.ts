// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITracingFacadeConfig } from "./ITracingFacadeConfig.js";

/**
 * Options for the tracing facade constructor.
 */
export interface ITracingFacadeConstructorOptions {
	/**
	 * The component type for the optional tracing component used for spans. When it does not
	 * resolve the facade passes every call straight through.
	 */
	tracingComponentType?: string;

	/**
	 * The component type for the optional logging component, used to report a tracing failure.
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the facade.
	 */
	config?: ITracingFacadeConfig;
}
