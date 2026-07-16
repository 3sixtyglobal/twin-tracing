// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { EntityCondition, SortDirection } from "@twin.org/entity";
import type { ISpan } from "./ISpan.js";
import type { ISpanOptions } from "./ISpanOptions.js";
import type { SpanStatus } from "./spanStatus.js";

/**
 * Interface describing a tracing connector.
 */
export interface ITracingConnector extends IComponent {
	/**
	 * Start a new span.
	 * @param name The name of the span.
	 * @param options The options for the span.
	 * @returns The started span, including its minted context.
	 */
	startSpan(name: string, options?: ISpanOptions): Promise<ISpan>;

	/**
	 * End a span, finalizing its status and duration.
	 * @param span The span to end.
	 * @param status The status to set on the span, defaults to ok.
	 * @returns A promise that resolves when the span has been ended.
	 */
	endSpan(span: ISpan, status?: SpanStatus): Promise<void>;

	/**
	 * Query the spans.
	 * @param conditions The conditions to match for the entities.
	 * @param sortProperties The optional sort order.
	 * @param cursor The cursor to request the next chunk of entities.
	 * @param limit Limit the number of entities to return.
	 * @returns All the entities for the storage matching the conditions,
	 * and a cursor which can be used to request more entities.
	 * @throws NotImplementedError if the implementation does not support retrieval.
	 */
	query?(
		conditions?: EntityCondition<ISpan>,
		sortProperties?: {
			property: keyof Omit<ISpan, "attributes" | "events" | "links" | "context">;
			sortDirection: SortDirection;
		}[],
		cursor?: string,
		limit?: number
	): Promise<{
		/**
		 * The spans matching the query conditions.
		 */
		entities: ISpan[];

		/**
		 * An optional cursor, when defined can be used to call query to get more entities.
		 */
		cursor?: string;
	}>;
}
