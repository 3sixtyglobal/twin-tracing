// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IPlatformComponent } from "@twin.org/api-models";
import { ContextIdKeys, ContextIdStore, type IContextIds } from "@twin.org/context";
import {
	Coerce,
	ComponentFactory,
	Guards,
	Is,
	JsonHelper,
	Mutex,
	NotFoundError,
	RandomHelper
} from "@twin.org/core";
import { LogicalOperator, type EntityCondition, type SortDirection } from "@twin.org/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import {
	SpanHelper,
	type ISpan,
	type ISpanOptions,
	type ITracingConnector,
	type SpanStatus
} from "@twin.org/tracing-models";
import { Span } from "./entities/span.js";
import type { SpanLink } from "./entities/spanLink.js";
import type { IBatchEntry } from "./models/IBatchEntry.js";
import type { IEntityStorageTracingConnectorConstructorOptions } from "./models/IEntityStorageTracingConnectorConstructorOptions.js";

/**
 * Class for performing tracing operations in entity storage.
 */
export class EntityStorageTracingConnector implements ITracingConnector {
	/**
	 * The namespace supported by the tracing connector.
	 */
	public static readonly NAMESPACE: string = "entity-storage";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageTracingConnector>();

	/**
	 * Default number of spans to accumulate before flushing.
	 */
	public static readonly DEFAULT_BATCH_SIZE: number = 10;

	/**
	 * Default interval in milliseconds between automatic flushes.
	 */
	public static readonly DEFAULT_BATCH_INTERVAL_MS: number = 5000;

	/**
	 * Default maximum number of spans to hold in the in-memory cache.
	 */
	public static readonly DEFAULT_MAX_CACHE_SIZE: number = 1000;

	/**
	 * The entity storage for the spans.
	 * @internal
	 */
	private readonly _spanStorage: IEntityStorageConnector<Span>;

	/**
	 * Platform component for per-tenant execution when no tenant context is available.
	 * @internal
	 */
	private readonly _platformComponent: IPlatformComponent;

	/**
	 * Flush when the cache reaches this size; undefined or <= 1 disables size-based flushing.
	 * @internal
	 */
	private readonly _batchSize: number | undefined;

	/**
	 * Flush every this many milliseconds; undefined or <= 0 disables timer-based flushing.
	 * @internal
	 */
	private readonly _batchIntervalMs: number | undefined;

	/**
	 * Spans waiting to be written to storage.
	 * @internal
	 */
	private readonly _batchCache: IBatchEntry[];

	/**
	 * Maximum spans to keep after a failed flush re-queue; 0 means unlimited.
	 * @internal
	 */
	private readonly _maxCacheSize: number;

	/**
	 * Timeout in milliseconds passed to Mutex.lock calls.
	 * @internal
	 */
	private readonly _mutexTimeoutMs?: number;

	/**
	 * Unique key used to serialise concurrent flush calls via Mutex.
	 * @internal
	 */
	private readonly _mutexKey: string;

	/**
	 * Handle for the interval timer, present only while the connector is running.
	 * @internal
	 */
	private _batchTimer?: ReturnType<typeof setTimeout>;

	/**
	 * Is the connector running.
	 * @internal
	 */
	private _started: boolean;

	/**
	 * Create a new instance of EntityStorageTracingConnector.
	 * @param options The options for the connector.
	 */
	constructor(options?: IEntityStorageTracingConnectorConstructorOptions) {
		const cfgBatchSize =
			Coerce.integer(options?.config?.batchSize) ??
			EntityStorageTracingConnector.DEFAULT_BATCH_SIZE;
		this._batchSize = cfgBatchSize > 1 ? cfgBatchSize : undefined;

		const cfgIntervalMs =
			Coerce.integer(options?.config?.batchIntervalMs) ??
			EntityStorageTracingConnector.DEFAULT_BATCH_INTERVAL_MS;
		this._batchIntervalMs = cfgIntervalMs > 0 ? cfgIntervalMs : undefined;

		const cfgMaxCacheSize =
			Coerce.integer(options?.config?.maxCacheSize) ??
			EntityStorageTracingConnector.DEFAULT_MAX_CACHE_SIZE;
		this._maxCacheSize = cfgMaxCacheSize > 0 ? cfgMaxCacheSize : 0;

		this._mutexTimeoutMs = Coerce.integer(options?.config?.mutexTimeoutMs);
		this._mutexKey = RandomHelper.generateUuidV7("compact");
		this._started = false;
		this._batchCache = [];

		this._spanStorage = EntityStorageConnectorFactory.get(
			options?.spanStorageConnectorType ?? "span"
		);
		this._platformComponent = ComponentFactory.get<IPlatformComponent>(
			options?.platformComponentType ?? "platform"
		);
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageTracingConnector.CLASS_NAME;
	}

	/**
	 * Start the connector; sets up the interval timer when batchIntervalMs is configured.
	 * @returns A promise that resolves when the connector is ready to accept spans.
	 */
	public async start(): Promise<void> {
		if (!this._started) {
			this._started = true;
			this.startTimer();
		}
	}

	/**
	 * Stop the connector; flushes any remaining cached spans and clears the timer.
	 * @returns A promise that resolves when the final flush completes and the timer is cleared.
	 */
	public async stop(): Promise<void> {
		if (this._started) {
			this._started = false;
			this.stopTimer();
		}
		await this.flush();
	}

	/**
	 * Start a new span, persisting it as an open span.
	 * @param name The name of the span.
	 * @param options The options for the span.
	 * @returns The started span, including its minted context.
	 */
	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		Guards.stringValue(EntityStorageTracingConnector.CLASS_NAME, nameof(name), name);

		const span = SpanHelper.startSpan(name, options);

		await this.recordSpan(span);

		return span;
	}

	/**
	 * End a span, finalizing its status and duration and updating the persisted span. The span must
	 * already exist (i.e. have been started/recorded); ending a span that was never started fails
	 * rather than silently creating a completed row.
	 * @param span The span to end.
	 * @param status The status to set on the span, defaults to ok.
	 * @returns A promise that resolves when the span has been ended.
	 * @throws NotFoundError if no span with the given id has been persisted or cached.
	 */
	public async endSpan(span: ISpan, status?: SpanStatus): Promise<void> {
		Guards.object<ISpan>(EntityStorageTracingConnector.CLASS_NAME, nameof(span), span);
		Guards.object(EntityStorageTracingConnector.CLASS_NAME, nameof(span.context), span.context);
		Guards.stringValue(
			EntityStorageTracingConnector.CLASS_NAME,
			nameof(span.context.spanId),
			span.context.spanId
		);

		const contextIds = (await ContextIdStore.getContextIds()) ?? {};
		const isTenantMissing =
			!Is.stringValue(contextIds[ContextIdKeys.Tenant]) && this._platformComponent.isMultiTenant();

		if (!isTenantMissing) {
			const inCache = this._batchCache.some(e => e.entity.spanId === span.context.spanId);
			if (!inCache) {
				const existing = await this._spanStorage.get(span.context.spanId);
				if (Is.empty(existing)) {
					throw new NotFoundError(
						EntityStorageTracingConnector.CLASS_NAME,
						"spanNotFound",
						span.context.spanId
					);
				}
			}
		}

		SpanHelper.endSpan(span, status);

		const entity = this.spanToEntity(span);

		await this.writeOrBatch(entity, contextIds, isTenantMissing);
	}

	/**
	 * Record a pre-built span verbatim, persisting it as-is (upsert) without minting a new context
	 * or finalizing it; the span may be open or completed. Used by fan-out connectors and reused by
	 * `startSpan` to persist the open span.
	 * @param span The span to record.
	 * @returns A promise that resolves when the span has been recorded.
	 */
	public async recordSpan(span: ISpan): Promise<void> {
		Guards.object<ISpan>(EntityStorageTracingConnector.CLASS_NAME, nameof(span), span);
		Guards.object(EntityStorageTracingConnector.CLASS_NAME, nameof(span.context), span.context);
		Guards.stringValue(
			EntityStorageTracingConnector.CLASS_NAME,
			nameof(span.context.spanId),
			span.context.spanId
		);

		const contextIds = (await ContextIdStore.getContextIds()) ?? {};
		const isTenantMissing =
			!Is.stringValue(contextIds[ContextIdKeys.Tenant]) && this._platformComponent.isMultiTenant();

		const entity = this.spanToEntity(span);

		await this.writeOrBatch(entity, contextIds, isTenantMissing);
	}

	/**
	 * Query the spans.
	 * Any pending batched spans are flushed before the query executes so results are always current.
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
		await this.flush();

		const finalConditions: EntityCondition<Span> = {
			conditions: [],
			logicalOperator: LogicalOperator.And
		};

		if (!Is.empty(conditions)) {
			finalConditions.conditions.push(conditions);
		}

		const result = await this._spanStorage.query(
			finalConditions.conditions.length > 0 ? finalConditions : undefined,
			sortProperties,
			undefined,
			cursor,
			limit
		);

		return {
			entities: result.entities.map(entity => this.entityToSpan(entity)),
			cursor: result.cursor
		};
	}

	/**
	 * Write all cached spans to storage and clear the cache.
	 * Spans sharing the same tenant context are grouped into a single setBatch call.
	 * If the mutex cannot be acquired the call returns without writing.
	 * On a storage write failure the spans are returned to the head of the cache for the next attempt.
	 * @returns A promise that resolves when all cached spans have been written to storage.
	 */
	public async flush(): Promise<void> {
		this.stopTimer();

		if (this._batchCache.length === 0) {
			this.startTimer();
			return;
		}

		const locked = await Mutex.lock(this._mutexKey, {
			throwOnTimeout: true,
			timeoutMs: this._mutexTimeoutMs
		});
		if (!locked) {
			this.startTimer();
			return;
		}

		let entries: IBatchEntry[] = [];
		try {
			entries = this._batchCache.splice(0);

			const perTenantEntities: Span[] = [];
			const contextGroups = new Map<string, { contextIds: IContextIds; entities: Span[] }>();

			for (const entry of entries) {
				if (entry.perTenant) {
					perTenantEntities.push(entry.entity);
				} else {
					const key = JsonHelper.canonicalize(entry.contextIds);
					let group = contextGroups.get(key);
					if (Is.empty(group)) {
						group = { contextIds: entry.contextIds, entities: [] };
						contextGroups.set(key, group);
					}
					group.entities.push(entry.entity);
				}
			}

			if (perTenantEntities.length > 0) {
				await this._platformComponent.execute(async () =>
					this._spanStorage.setBatch(perTenantEntities)
				);
			}

			for (const group of contextGroups.values()) {
				await ContextIdStore.run(group.contextIds, async () =>
					this._spanStorage.setBatch(group.entities)
				);
			}
		} catch {
			this._batchCache.unshift(...entries);
			if (this._maxCacheSize > 0 && this._batchCache.length > this._maxCacheSize) {
				this._batchCache.splice(0, this._batchCache.length - this._maxCacheSize);
			}
		} finally {
			Mutex.unlock(this._mutexKey);
		}

		this.startTimer();
	}

	/**
	 * Write a span entity immediately or add it to the batch cache.
	 * @param entity The span entity to write or queue.
	 * @param contextIds The context IDs captured at call time.
	 * @param perTenant True when no tenant context is available and the write must fan out.
	 * @internal
	 */
	private async writeOrBatch(
		entity: Span,
		contextIds: IContextIds,
		perTenant: boolean
	): Promise<void> {
		if (Is.empty(this._batchSize) && Is.empty(this._batchIntervalMs)) {
			if (perTenant) {
				await this._platformComponent.execute(async () => this._spanStorage.set(entity));
			} else {
				await this._spanStorage.set(entity);
			}
			return;
		}

		let shouldFlush = false;
		const locked = await Mutex.lock(this._mutexKey, {
			throwOnTimeout: true,
			timeoutMs: this._mutexTimeoutMs
		});
		if (locked) {
			try {
				this._batchCache.push({ entity, contextIds, perTenant });
				shouldFlush = !Is.empty(this._batchSize) && this._batchCache.length >= this._batchSize;
			} finally {
				Mutex.unlock(this._mutexKey);
			}
		}

		if (shouldFlush) {
			await this.flush();
		}
	}

	/**
	 * Start the interval timer if batchIntervalMs is configured and the connector is running.
	 * @internal
	 */
	private startTimer(): void {
		if (!Is.empty(this._batchIntervalMs) && Is.empty(this._batchTimer) && this._started) {
			this._batchTimer = globalThis.setTimeout(async () => {
				await this.flush();
			}, this._batchIntervalMs);
		}
	}

	/**
	 * Stop the interval timer if it is running.
	 * @internal
	 */
	private stopTimer(): void {
		if (!Is.empty(this._batchTimer)) {
			globalThis.clearTimeout(this._batchTimer);
			this._batchTimer = undefined;
		}
	}

	/**
	 * Map a span to its entity storage representation.
	 * @param span The span to map.
	 * @returns The span entity.
	 * @internal
	 */
	private spanToEntity(span: ISpan): Span {
		const entity = new Span();
		entity.spanId = span.context.spanId;
		entity.traceId = span.context.traceId;
		entity.parentSpanId = span.parentSpanId;
		entity.name = span.name;
		entity.kind = span.kind;
		entity.status = span.status;
		entity.traceFlags = span.context.traceFlags;
		entity.startTs = span.startTs;
		entity.endTs = span.endTs;
		entity.durationMs = span.durationMs;
		entity.attributes = span.attributes;
		entity.events = span.events;
		entity.links = Is.arrayValue(span.links)
			? span.links.map(link => ({
					traceId: link.context.traceId,
					spanId: link.context.spanId,
					traceFlags: link.context.traceFlags,
					attributes: link.attributes
				}))
			: undefined;
		return entity;
	}

	/**
	 * Map a span entity back to a span.
	 * @param entity The entity to map.
	 * @returns The span.
	 * @internal
	 */
	private entityToSpan(entity: Partial<Span>): ISpan {
		const span: ISpan = {
			name: entity.name as string,
			kind: entity.kind as ISpan["kind"],
			status: entity.status as ISpan["status"],
			context: {
				traceId: entity.traceId as string,
				spanId: entity.spanId as string,
				traceFlags: entity.traceFlags as number
			},
			startTs: entity.startTs as number
		};

		if (Is.stringValue(entity.parentSpanId)) {
			span.parentSpanId = entity.parentSpanId;
		}
		if (Is.integer(entity.endTs)) {
			span.endTs = entity.endTs;
		}
		if (Is.integer(entity.durationMs)) {
			span.durationMs = entity.durationMs;
		}
		if (Is.object(entity.attributes)) {
			span.attributes = entity.attributes;
		}
		if (Is.arrayValue(entity.events)) {
			span.events = entity.events;
		}
		if (Is.arrayValue<SpanLink>(entity.links)) {
			span.links = entity.links.map(link => ({
				context: {
					traceId: link.traceId,
					spanId: link.spanId,
					traceFlags: link.traceFlags ?? SpanHelper.TRACE_FLAG_SAMPLED
				},
				attributes: link.attributes
			}));
		}

		return span;
	}
}
