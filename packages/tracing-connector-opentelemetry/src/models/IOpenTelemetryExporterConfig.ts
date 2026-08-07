// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { OpenTelemetryProcessorTypes } from "./openTelemetryProcessorTypes.js";

/**
 * Configuration for a span exporter, sending spans as OTLP over HTTP with a protobuf payload.
 */
export interface IOpenTelemetryExporterConfig {
	/**
	 * The full URL of the OTLP traces endpoint to push spans to, e.g.
	 * "http://localhost:4318/v1/traces". Required: a missing endpoint is rejected at start().
	 */
	endpoint: string;

	/**
	 * Additional headers to send with each export request, e.g. for authenticating to a hosted
	 * collector.
	 */
	headers?: { [key: string]: string };

	/**
	 * The span processor which feeds this exporter.
	 * @default batch
	 */
	processor?: OpenTelemetryProcessorTypes;

	/**
	 * The delay between two consecutive batch exports in milliseconds, batch processor only.
	 * @default 5000
	 */
	scheduledDelayMs?: number;

	/**
	 * The maximum number of spans in a single export, batch processor only.
	 * @default 512
	 */
	maxExportBatchSize?: number;

	/**
	 * The maximum number of spans buffered before spans are dropped, batch processor only.
	 * @default 2048
	 */
	maxQueueSize?: number;

	/**
	 * How long an export is allowed to run before it is cancelled in milliseconds, batch
	 * processor only.
	 * @default 30000
	 */
	exportTimeoutMs?: number;

	/**
	 * The maximum number of export requests which can be in flight at once.
	 */
	concurrencyLimit?: number;

	/**
	 * The timeout for a single export request in milliseconds.
	 */
	timeoutMs?: number;
}
