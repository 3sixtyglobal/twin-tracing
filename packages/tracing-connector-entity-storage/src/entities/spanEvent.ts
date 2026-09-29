// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property, SortDirection } from "@twin.org/entity";

/**
 * Class defining a span event.
 */
@entity()
export class SpanEvent {
	/**
	 * The name of the event.
	 */
	@property({ type: "string", maxLength: 256 })
	public name!: string;

	/**
	 * The timestamp of the event as milliseconds since the epoch.
	 */
	@property({ type: "integer", format: "uint64", sortDirection: SortDirection.Ascending })
	public ts!: number;

	/**
	 * The attributes associated with the event.
	 */
	@property({ type: "object", optional: true })
	public attributes?: { [key: string]: unknown };
}
