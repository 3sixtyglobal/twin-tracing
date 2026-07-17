// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The kind of span, describing the role the operation plays in the overall flow.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SpanKind = {
	/**
	 * A span representing pure in-process work.
	 */
	Internal: "internal",

	/**
	 * A span representing an outbound request to another service or dependency.
	 */
	Client: "client",

	/**
	 * A span representing the handling of an inbound request.
	 */
	Server: "server",

	/**
	 * A span representing the publishing of a message to a broker or queue.
	 */
	Producer: "producer",

	/**
	 * A span representing the processing of a message from a broker or queue.
	 */
	Consumer: "consumer"
} as const;

/**
 * The kind of span, describing the role the operation plays in the overall flow.
 */
export type SpanKind = (typeof SpanKind)[keyof typeof SpanKind];
