// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { SpanKind } from "@twin.org/tracing-models";

/**
 * Configuration for the Console Tracing Connector.
 */
export interface IConsoleTracingConnectorConfig {
	/**
	 * The span kinds to display, will default to all.
	 */
	kinds?: SpanKind[];

	/**
	 * Include the trace, span, and parent span ids in the output.
	 * @default false
	 */
	includeIds?: boolean;
}
