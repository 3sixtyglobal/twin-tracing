// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IOpenTelemetryExporterConfig } from "./IOpenTelemetryExporterConfig.js";

/**
 * Configuration for the OpenTelemetry tracing connector.
 */
export interface IOpenTelemetryTracingConnectorConfig {
	/**
	 * The name of the instrumentation scope reported on exported spans.
	 * @default twin-tracing
	 */
	tracerName?: string;

	/**
	 * The version of the instrumentation scope reported on exported spans.
	 * @default 1.0.0
	 */
	tracerVersion?: string;

	/**
	 * Attributes describing the entity producing the spans, attached to the OpenTelemetry
	 * resource so backends can group traces by service, e.g. `{ "service.name": "twin-node" }`.
	 */
	resourceAttributes?: { [key: string]: string | number | boolean };

	/**
	 * The proportion of traces to export, between 0 and 1, applied deterministically to the trace
	 * id so every span in a trace shares the same decision. Spans whose context is already marked
	 * as not sampled are never exported regardless of this value.
	 * @default 1
	 */
	sampleRatio?: number;

	/**
	 * Named exporter configurations keyed by an arbitrary id. Omit or pass an empty object to
	 * disable export entirely.
	 */
	exporters?: { [id: string]: IOpenTelemetryExporterConfig };
}
