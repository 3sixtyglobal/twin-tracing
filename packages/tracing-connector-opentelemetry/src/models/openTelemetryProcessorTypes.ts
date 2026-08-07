// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The types of span processor which feed the exporter.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OpenTelemetryProcessorTypes = {
	/**
	 * Buffer spans and export them in batches, this is the default.
	 */
	Batch: "batch",

	/**
	 * Export each span as soon as it ends.
	 */
	Simple: "simple"
} as const;

/**
 * The types of span processor which feed the exporter.
 */
export type OpenTelemetryProcessorTypes =
	(typeof OpenTelemetryProcessorTypes)[keyof typeof OpenTelemetryProcessorTypes];
