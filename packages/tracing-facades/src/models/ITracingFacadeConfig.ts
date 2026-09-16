// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the tracing facade.
 *
 * The method and parameter patterns are dot separated and matched from the right, so `password`
 * and `*.*.password` both match a parameter of that name on any method of any class, while
 * `NotarizationService.create.controllerIdentity` matches only that one. A `*` matches any single
 * segment.
 */
export interface ITracingFacadeConfig {
	/**
	 * Patterns for parameters whose values are never recorded, whatever their type, matched
	 * against `class.method.parameter`. Supplying this replaces TracingFacade.DEFAULT_EXCLUDE_PARAMS.
	 */
	excludeParams?: string[];

	/**
	 * Patterns for methods which are not intercepted at all, matched against `class.method`.
	 * Supplying this replaces TracingFacade.DEFAULT_EXCLUDE_METHODS.
	 */
	excludeMethods?: string[];

	/**
	 * Patterns for parameters to record even when the value is not primitive, matched against
	 * `class.method.parameter`. A further segment selects a single property, so
	 * `NotarizationService.create.notarization.mode` records only the mode. Any other non
	 * primitive parameter is not recorded.
	 */
	includeObjects?: string[];

	/**
	 * The maximum length of a recorded string, longer values are truncated.
	 * @default 256
	 */
	maxStringLength?: number;

	/**
	 * The maximum number of entries recorded for an array.
	 * @default 10
	 */
	maxArrayLength?: number;
}
