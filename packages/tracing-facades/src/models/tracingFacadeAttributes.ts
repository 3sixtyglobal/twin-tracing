// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The span attribute keys recorded by the tracing facade.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const TracingFacadeAttributes = {
	/**
	 * The name of the method the span covers.
	 */
	Method: "method.name",

	/**
	 * The prefix for the recorded parameter values.
	 */
	ParamPrefix: "param.",

	/**
	 * The returned value.
	 */
	Result: "method.result"
} as const;

/**
 * Union type of all tracing facade attribute string values.
 */
export type TracingFacadeAttributes =
	(typeof TracingFacadeAttributes)[keyof typeof TracingFacadeAttributes];
