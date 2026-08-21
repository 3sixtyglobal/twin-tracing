// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Guards, Is } from "@twin.org/core";
import type { EntityCondition, SortDirection } from "@twin.org/entity";
import { nameof } from "@twin.org/nameof";
import { TracingConnectorFactory } from "../factories/tracingConnectorFactory.js";
import { SpanHelper } from "../helpers/spanHelper.js";
import type { IMultiTracingConnectorConstructorOptions } from "../models/IMultiTracingConnectorConstructorOptions.js";
import type { ISpan } from "../models/ISpan.js";
import type { ISpanOptions } from "../models/ISpanOptions.js";
import type { ITracingConnector } from "../models/ITracingConnector.js";
import type { SpanStatus } from "../models/spanStatus.js";

/**
 * Class for performing tracing operations on multiple connectors.
 */
export class MultiTracingConnector implements ITracingConnector {
	/**
	 * The namespace for the tracing connector.
	 */
	public static readonly NAMESPACE: string = "multi";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<MultiTracingConnector>();

	/**
	 * The connectors to send the spans to.
	 * @internal
	 */
	private readonly _tracingConnectors: ITracingConnector[];

	/**
	 * Create a new instance of MultiTracingConnector.
	 * @param options The options for the connector.
	 */
	constructor(options: IMultiTracingConnectorConstructorOptions) {
		Guards.object(MultiTracingConnector.CLASS_NAME, nameof(options), options);
		Guards.arrayValue(
			MultiTracingConnector.CLASS_NAME,
			nameof(options.tracingConnectorTypes),
			options.tracingConnectorTypes
		);
		this._tracingConnectors = options.tracingConnectorTypes.map(t =>
			TracingConnectorFactory.get(t)
		);
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return MultiTracingConnector.CLASS_NAME;
	}

	/**
	 * Start a new span. The context is minted centrally and the open span is recorded on every
	 * child connector, so each backend sees the same span from the moment it starts.
	 * @param name The name of the span.
	 * @param options The options for the span.
	 * @returns The started span, including its minted context.
	 */
	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		Guards.stringValue(MultiTracingConnector.CLASS_NAME, nameof(name), name);

		const span = SpanHelper.startSpan(name, options);

		await Promise.allSettled(
			this._tracingConnectors.map(async tracingConnector => tracingConnector.recordSpan?.(span))
		);

		return span;
	}

	/**
	 * End a span, finalizing its status and duration and recording the completed span on all child
	 * connectors. Children are updated via `recordSpan` (not `endSpan`) so the centrally-minted
	 * span is replicated rather than re-finalized per child.
	 * @param span The span to end.
	 * @param status The status to set on the span, defaults to ok.
	 * @returns A promise that resolves when all child connectors have settled for this span.
	 */
	public async endSpan(span: ISpan, status?: SpanStatus): Promise<void> {
		Guards.object<ISpan>(MultiTracingConnector.CLASS_NAME, nameof(span), span);

		SpanHelper.endSpan(span, status);

		await Promise.allSettled(
			this._tracingConnectors.map(async tracingConnector => tracingConnector.recordSpan?.(span))
		);
	}

	/**
	 * Query the spans.
	 * @param conditions The conditions to match for the entities.
	 * @param sortProperties The optional sort order.
	 * @param cursor The cursor to request the next chunk of entities.
	 * @param limit Limit the number of entities to return.
	 * @returns All the entities for the storage matching the conditions,
	 * and a cursor which can be used to request more entities.
	 */
	public async query(
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
	}> {
		// See if we can find a connector that supports querying.
		for (const tracingConnector of this._tracingConnectors) {
			const queryBoundMethod = tracingConnector.query?.bind(tracingConnector);
			if (Is.function(queryBoundMethod)) {
				return queryBoundMethod(conditions, sortProperties, cursor, limit);
			}
		}

		return {
			entities: []
		};
	}
}
