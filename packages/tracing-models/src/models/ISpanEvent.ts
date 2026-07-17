// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * A timestamped annotation recorded within a span to mark a milestone.
 */
export interface ISpanEvent {
	/**
	 * The name of the event.
	 */
	name: string;

	/**
	 * The timestamp of the event as milliseconds since the epoch.
	 */
	ts: number;

	/**
	 * The optional attributes associated with the event.
	 */
	attributes?: { [key: string]: unknown };
}
