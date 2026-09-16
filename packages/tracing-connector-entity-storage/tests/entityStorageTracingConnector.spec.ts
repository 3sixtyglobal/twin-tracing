// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IPlatformComponent } from "@twin.org/api-models";
import { ContextIdKeys, ContextIdStore } from "@twin.org/context";
import { ComponentFactory, NotFoundError } from "@twin.org/core";
import { ComparisonOperator, LogicalOperator } from "@twin.org/entity";
import {
	MemoryEntityStorageConnector,
	type IMemoryEntityStorageConnectorConstructorOptions
} from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import type { ILogEntry } from "@twin.org/logging-models";
import { nameof } from "@twin.org/nameof";
import { SpanHelper, SpanKind, SpanStatus } from "@twin.org/tracing-models";
import type { ISpan, ITracingConnector } from "@twin.org/tracing-models";
import type { Span } from "../src/entities/span.js";
import type { SpanLink } from "../src/entities/spanLink.js";
import { EntityStorageTracingConnector } from "../src/entityStorageTracingConnector.js";
import type { IEntityStorageTracingConnectorConfig } from "../src/models/IEntityStorageTracingConnectorConfig.js";
import { initSchema } from "../src/schema.js";

// This spec is intentionally kept in sync with all other tracing connector specs.
// Any test added here should also be added to all other tracing connector specs.
// Use feature flags (e.g. SUPPORTS_QUERY) to skip tests for unsupported features.

const SUPPORTS_QUERY = true;

interface StoredSpan {
	spanId: string;
	traceId: string;
	parentSpanId?: string;
	kind: SpanKind;
	status: SpanStatus;
	startTs: number;
	endTs?: number;
	durationMs?: number;
	attributes?: { [key: string]: unknown };
	events?: { name: string; ts: number; attributes?: { [key: string]: unknown } }[];
	links?: {
		context: { traceId: string; spanId: string; traceFlags: number };
		attributes?: { [key: string]: unknown };
	}[];
}

/**
 * Memory storage whose setBatch is delayed, holding open the window where flushed entries are
 * committed to neither the cache nor storage - the same window MySQL write latency opens in
 * production. Exposes setBatchStarted so tests can deterministically wait until the write is
 * in flight instead of guessing a delay long enough to land inside the window.
 */
class SlowSetBatchMemoryConnector extends MemoryEntityStorageConnector<Span> {
	public readonly setBatchStarted: Promise<void>;

	private readonly _setBatchStartedResolve: () => void;

	constructor(options: IMemoryEntityStorageConnectorConstructorOptions) {
		super(options);
		let resolveSetBatchStarted: () => void = () => {};
		this.setBatchStarted = new Promise<void>(resolve => {
			resolveSetBatchStarted = resolve;
		});
		this._setBatchStartedResolve = resolveSetBatchStarted;
	}

	public override async setBatch(entities: Span[]): Promise<void> {
		this._setBatchStartedResolve();
		await new Promise(resolve => setTimeout(resolve, 50));
		return super.setBatch(entities);
	}
}

function makePlatformComponent(multiTenant: boolean): IPlatformComponent {
	return {
		className: () => "MockPlatformComponent",
		isMultiTenant: () => multiTenant,
		execute: async (method: () => Promise<void>) => {
			if (multiTenant) {
				await ContextIdStore.run({ [ContextIdKeys.Tenant]: "test-tenant" }, method);
			} else {
				await method();
			}
		},
		getLocalOriginContext: async () => undefined
	};
}

describe("EntityStorageTracingConnector", () => {
	let storage: MemoryEntityStorageConnector<Span>;

	async function getStoredSpans(): Promise<StoredSpan[]> {
		return (await storage.getStore()).map(s => ({
			spanId: s.spanId,
			traceId: s.traceId,
			parentSpanId: s.parentSpanId,
			kind: s.kind,
			status: s.status,
			startTs: s.startTs,
			endTs: s.endTs,
			durationMs: s.durationMs,
			attributes: s.attributes,
			events: s.events,
			links: s.links?.map((l: SpanLink) => ({
				context: { traceId: l.traceId, spanId: l.spanId, traceFlags: l.traceFlags ?? 0 },
				attributes: l.attributes
			}))
		}));
	}

	async function getStoredSpan(spanId: string): Promise<StoredSpan | undefined> {
		return (await getStoredSpans()).find(s => s.spanId === spanId);
	}

	beforeAll(() => {
		initSchema();
	});

	beforeEach(() => {
		storage = new MemoryEntityStorageConnector<Span>({
			entitySchema: nameof<Span>(),
			config: { storageKey: "span" }
		});
		EntityStorageConnectorFactory.register("span", () => storage);
	});

	afterEach(async () => {
		await storage.teardown();
	});

	describe.each([
		{ label: "no context", multiTenant: false, inTenantContext: false },
		{ label: "with context", multiTenant: true, inTenantContext: true },
		{ label: "multi-tenant, no tenant", multiTenant: true, inTenantContext: false }
	])("$label", ({ multiTenant, inTenantContext }) => {
		let connector: EntityStorageTracingConnector;
		let platformComponent: IPlatformComponent;
		let executeSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			platformComponent = makePlatformComponent(multiTenant);
			executeSpy = vi.spyOn(platformComponent, "execute");
			ComponentFactory.register("platform", () => platformComponent);
			connector = new EntityStorageTracingConnector({
				config: { batchSize: 0, batchIntervalMs: 0 }
			});
		});

		async function runInContext<T>(fn: () => Promise<T>): Promise<T> {
			if (inTenantContext) {
				return ContextIdStore.run({ [ContextIdKeys.Tenant]: "test-tenant" }, fn);
			}
			return fn();
		}

		const expectsExecute = multiTenant && !inTenantContext;

		test("startSpan mints a valid context and stays open", async () => {
			const span = await runInContext(async () =>
				connector.startSpan("in-flight", { kind: SpanKind.Server })
			);

			expect(span.context.traceId).toMatch(/^[0-9a-f]{32}$/);
			expect(span.context.spanId).toMatch(/^[0-9a-f]{16}$/);
			expect(span.endTs).toBeUndefined();
			expect(span.status).toEqual(SpanStatus.Unset);

			expect(executeSpy).toHaveBeenCalledTimes(expectsExecute ? 1 : 0);
		});

		test("startSpan preserves a custom start timestamp", async () => {
			const span = await runInContext(async () =>
				connector.startSpan("timed", { startTs: 1_700_000_000_000 })
			);

			expect(span.startTs).toEqual(1_700_000_000_000);
			expect(span.endTs).toBeUndefined();
		});

		test("startSpan records initial attributes on the span", async () => {
			const span = await runInContext(async () =>
				connector.startSpan("attributed", { attributes: { orderId: "ord-1", count: 3 } })
			);

			expect(span.attributes).toEqual({ orderId: "ord-1", count: 3 });
		});

		test("startSpan records the span kind", async () => {
			const span = await runInContext(async () =>
				connector.startSpan("kindly", { kind: SpanKind.Client })
			);

			expect(span.kind).toEqual(SpanKind.Client);
			await runInContext(async () => connector.endSpan(span));
			const stored = await getStoredSpans();
			expect(stored).toHaveLength(1);
			expect(stored[0].kind).toEqual(SpanKind.Client);
		});

		test("endSpan closes the span with ok status", async () => {
			const span = await runInContext(async () =>
				connector.startSpan("handle-request", { startTs: 1000 })
			);
			span.attributes = { orderId: "ord-1" };
			span.events = [{ name: "validated", ts: 1100 }];
			await runInContext(async () => connector.endSpan(span, SpanStatus.Ok));

			expect(span.status).toEqual(SpanStatus.Ok);
			expect(span.endTs).toBeDefined();

			const stored = await getStoredSpans();
			expect(stored).toHaveLength(1);
			expect(stored[0].status).toEqual(SpanStatus.Ok);
			expect(stored[0].endTs).toBeGreaterThanOrEqual(1000);
			expect(stored[0].durationMs).toBeGreaterThanOrEqual(0);
			expect(stored[0].attributes).toMatchObject({ orderId: "ord-1" });
			expect(stored[0].events).toEqual([{ name: "validated", ts: 1100 }]);
			expect(executeSpy).toHaveBeenCalledTimes(expectsExecute ? 2 : 0);
		});

		test("endSpan closes the span with error status", async () => {
			const span = await runInContext(async () => connector.startSpan("failed"));
			await runInContext(async () => connector.endSpan(span, SpanStatus.Error));

			expect(span.status).toEqual(SpanStatus.Error);
			expect(span.endTs).toBeDefined();
			const stored = await getStoredSpans();
			expect(stored).toHaveLength(1);
			expect(stored[0].status).toEqual(SpanStatus.Error);
		});

		test("endSpan with no status defaults to ok", async () => {
			const span = await runInContext(async () => connector.startSpan("no-status"));
			await runInContext(async () => connector.endSpan(span));

			expect(span.status).toEqual(SpanStatus.Ok);
			expect(span.endTs).toBeDefined();
			const stored = await getStoredSpans();
			expect(stored).toHaveLength(1);
			expect(stored[0].status).toEqual(SpanStatus.Ok);
		});

		test("IDs are preserved through start and end", async () => {
			const span = await runInContext(async () => connector.startSpan("identity"));
			await runInContext(async () => connector.endSpan(span));

			const stored = await getStoredSpans();
			expect(stored[0].spanId).toEqual(span.context.spanId);
			expect(stored[0].traceId).toEqual(span.context.traceId);
		});

		test("child span inherits trace id and records parent span id", async () => {
			const root = await runInContext(async () =>
				connector.startSpan("root", { kind: SpanKind.Server })
			);
			const child = await runInContext(async () =>
				connector.startSpan("child", {
					kind: SpanKind.Internal,
					parentContext: root.context
				})
			);
			await runInContext(async () => connector.endSpan(child));

			expect(child.context.traceId).toEqual(root.context.traceId);
			expect(child.parentSpanId).toEqual(root.context.spanId);
			expect(child.context.spanId).not.toEqual(root.context.spanId);
			const stored = await getStoredSpan(child.context.spanId);
			expect(stored?.parentSpanId).toEqual(root.context.spanId);
		});

		test("root span has no parent span context", async () => {
			const span = await runInContext(async () => connector.startSpan("root"));
			await runInContext(async () => connector.endSpan(span));

			expect(span.parentSpanId).toBeUndefined();
			const stored = await getStoredSpans();
			expect(stored[0].parentSpanId).toBeUndefined();
		});

		test("events and links are preserved", async () => {
			const linked = SpanHelper.createContext();
			const span = await runInContext(async () =>
				connector.startSpan("annotated", {
					links: [{ context: linked, attributes: { reason: "retry" } }]
				})
			);
			span.events = [{ name: "cache-miss", ts: 1_700_000_000_000, attributes: { key: "abc" } }];
			await runInContext(async () => connector.endSpan(span));

			expect(span.events[0].name).toEqual("cache-miss");
			expect(span.links?.[0].context.traceId).toEqual(linked.traceId);
			expect(span.links?.[0].attributes?.reason).toEqual("retry");

			const stored = await getStoredSpans();
			expect(stored[0]?.events?.[0].name).toEqual("cache-miss");
			expect(stored[0]?.events?.[0].attributes).toEqual({ key: "abc" });
			expect(stored[0]?.links?.[0].context.traceId).toEqual(linked.traceId);
			expect(stored[0]?.links?.[0].attributes?.reason).toEqual("retry");
		});

		test("endSpan is idempotent across a double end", async () => {
			const span = await runInContext(async () => connector.startSpan("dbl", { startTs: 1000 }));
			await runInContext(async () => connector.endSpan(span, SpanStatus.Ok));
			const firstEndTs = span.endTs;
			const firstDuration = span.durationMs;

			await runInContext(async () => connector.endSpan(span, SpanStatus.Ok));

			expect(span.endTs).toEqual(firstEndTs);
			expect(span.durationMs).toEqual(firstDuration);
			const stored = await getStoredSpans();
			expect(stored).toHaveLength(1);
		});

		test("recordSpan handles open and closed spans", async () => {
			const span = SpanHelper.startSpan("recorded", { startTs: 1000 });
			await runInContext(async () => connector.recordSpan(span));

			SpanHelper.endSpan(span, SpanStatus.Ok, 1200);
			await runInContext(async () => connector.recordSpan(span));

			const stored = await getStoredSpans();
			expect(stored).toHaveLength(1);
			expect(stored[0].spanId).toEqual(span.context.spanId);
			expect(stored[0].status).toEqual(SpanStatus.Ok);
			expect(stored[0].durationMs).toEqual(200);
			expect(executeSpy).toHaveBeenCalledTimes(expectsExecute ? 2 : 0);
		});

		test.skipIf(!SUPPORTS_QUERY)("query returns spans matching a trace id filter", async () => {
			const root = await runInContext(async () =>
				connector.startSpan("root", { kind: SpanKind.Server })
			);
			await runInContext(async () => connector.endSpan(root, SpanStatus.Ok));
			const other = await runInContext(async () =>
				connector.startSpan("other", { kind: SpanKind.Client })
			);
			await runInContext(async () => connector.endSpan(other, SpanStatus.Error));

			const result = await (connector as ITracingConnector).query?.({
				conditions: [
					{
						property: "traceId",
						comparison: ComparisonOperator.Equals,
						value: root.context.traceId
					}
				],
				logicalOperator: LogicalOperator.And
			});

			expect(result?.entities).toHaveLength(1);
			expect(result?.entities[0].context.spanId).toEqual(root.context.spanId);
			expect(result?.entities[0].status).toEqual(SpanStatus.Ok);
		});

		test.skipIf(!SUPPORTS_QUERY)("query returns spans matching a status filter", async () => {
			await runInContext(async () => connector.startSpan("ok-span")).then(async span =>
				runInContext(async () => connector.endSpan(span, SpanStatus.Ok))
			);
			await runInContext(async () => connector.startSpan("error-span")).then(async span =>
				runInContext(async () => connector.endSpan(span, SpanStatus.Error))
			);

			const result = await (connector as ITracingConnector).query?.({
				conditions: [
					{
						property: "status",
						comparison: ComparisonOperator.Equals,
						value: SpanStatus.Error
					}
				],
				logicalOperator: LogicalOperator.And
			});

			expect(result?.entities).toHaveLength(1);
			expect(result?.entities[0].name).toEqual("error-span");
		});

		test.skipIf(!SUPPORTS_QUERY)("query returns empty when no spans match", async () => {
			const result = await (connector as ITracingConnector).query?.({
				conditions: [
					{
						property: "traceId",
						comparison: ComparisonOperator.Equals,
						value: "0000000000000000000000000000dead"
					}
				],
				logicalOperator: LogicalOperator.And
			});

			expect(result?.entities).toHaveLength(0);
		});
	});

	describe("batching", () => {
		beforeEach(() => {
			ComponentFactory.register("platform", () => makePlatformComponent(false));
		});

		test("holds spans in cache until batch size threshold is reached", async () => {
			const connector = new EntityStorageTracingConnector({
				config: { batchSize: 3, batchIntervalMs: 0 }
			});
			await connector.startSpan("one");
			await connector.startSpan("two");

			expect(await storage.getStore()).toHaveLength(0);

			await connector.startSpan("three");

			await vi.waitFor(async () => {
				expect(await storage.getStore()).toHaveLength(3);
			});
		});

		test("does not wait for the storage write when the batch fills", async () => {
			const connector = new EntityStorageTracingConnector({
				config: { batchSize: 2, batchIntervalMs: 0 }
			});
			const setBatch = storage.setBatch.bind(storage);
			vi.spyOn(storage, "setBatch").mockImplementation(async entities => {
				await new Promise(resolve => setTimeout(resolve, 100));
				await setBatch(entities);
			});

			await connector.startSpan("one");
			const start = Date.now();
			await connector.startSpan("two");

			expect(Date.now() - start).toBeLessThan(100);
			await connector.stop();
			expect(await storage.getStore()).toHaveLength(2);
		});

		test("flush writes all cached spans to storage", async () => {
			const connector = new EntityStorageTracingConnector({
				config: { batchSize: 10, batchIntervalMs: 0 }
			});
			const span = await connector.startSpan("buffered");
			expect(await storage.getStore()).toHaveLength(0);

			await connector.flush();

			expect(await storage.getStore()).toHaveLength(1);
			expect((await storage.getStore())[0].spanId).toEqual(span.context.spanId);
		});

		test("endSpan finds span in cache when start has not yet been flushed", async () => {
			const connector = new EntityStorageTracingConnector({
				config: { batchSize: 10, batchIntervalMs: 0 }
			});
			const span = await connector.startSpan("in-flight");
			expect(await storage.getStore()).toHaveLength(0);

			await connector.endSpan(span, SpanStatus.Ok);
			await connector.flush();

			const stored = await storage.getStore();
			expect(stored).toHaveLength(1);
			expect(stored[0].status).toEqual(SpanStatus.Ok);
		});

		test("stop flushes remaining cached spans", async () => {
			const connector = new EntityStorageTracingConnector({
				config: { batchSize: 10, batchIntervalMs: 0 }
			});
			await connector.start();
			await connector.startSpan("pending");
			expect(await storage.getStore()).toHaveLength(0);

			await connector.stop();

			expect(await storage.getStore()).toHaveLength(1);
		});

		test("query flushes cache before reading storage", async () => {
			const connector = new EntityStorageTracingConnector({
				config: { batchSize: 10, batchIntervalMs: 0 }
			});
			const span = await connector.startSpan("buffered");
			expect(await storage.getStore()).toHaveLength(0);

			const result = await connector.query();

			expect(result.entities).toHaveLength(1);
			expect(result.entities[0].context.spanId).toEqual(span.context.spanId);
		});

		test("size-based flush groups spans by context into a single setBatch call", async () => {
			const connector = new EntityStorageTracingConnector({
				config: { batchSize: 2, batchIntervalMs: 0 }
			});
			await connector.startSpan("a");
			await connector.startSpan("b");

			await vi.waitFor(async () => {
				const stored = await storage.getStore();
				expect(stored).toHaveLength(2);
			});
		});

		test("endSpan succeeds for a span whose start is in an in-flight flush write", async () => {
			const slowStorage = new SlowSetBatchMemoryConnector({
				entitySchema: nameof<Span>(),
				config: { storageKey: "span" }
			});
			EntityStorageConnectorFactory.register("span", () => slowStorage);
			const connector = new EntityStorageTracingConnector({
				config: { batchSize: 1000, batchIntervalMs: 0 }
			});

			const span = await connector.startSpan("raced");
			const inFlightFlush = connector.flush();
			await slowStorage.setBatchStarted;

			await connector.endSpan(span, SpanStatus.Ok);

			await inFlightFlush;
			await connector.flush();

			const stored = await slowStorage.getStore();
			expect(stored).toHaveLength(1);
			expect(stored[0].status).toEqual(SpanStatus.Ok);
			expect(stored[0].endTs).toBeDefined();
		});

		test("query reflects spans from an in-flight flush write", async () => {
			const slowStorage = new SlowSetBatchMemoryConnector({
				entitySchema: nameof<Span>(),
				config: { storageKey: "span" }
			});
			EntityStorageConnectorFactory.register("span", () => slowStorage);
			const connector = new EntityStorageTracingConnector({
				config: { batchSize: 1000, batchIntervalMs: 0 }
			});

			const span = await connector.startSpan("in-flight-query");
			const inFlightFlush = connector.flush();
			await slowStorage.setBatchStarted;

			const result = await connector.query();

			expect(result.entities).toHaveLength(1);
			expect(result.entities[0].context.spanId).toEqual(span.context.spanId);

			await inFlightFlush;
		});

		test("logs flushFailed and re-queues the entries when the write fails", async () => {
			const logEntries: ILogEntry[] = [];
			ComponentFactory.register("logging", () => ({
				className: () => "MockLoggingComponent",
				log: async (entry: ILogEntry) => {
					logEntries.push(entry);
				},
				query: async () => ({ entities: [] })
			}));

			const failingStorage = new MemoryEntityStorageConnector<Span>({
				entitySchema: nameof<Span>(),
				config: { storageKey: "span" }
			});
			vi.spyOn(failingStorage, "setBatch").mockRejectedValueOnce(new Error("storage unavailable"));
			EntityStorageConnectorFactory.register("span", () => failingStorage);
			const connector = new EntityStorageTracingConnector({
				config: { batchSize: 10, batchIntervalMs: 0 }
			});

			await connector.startSpan("will-fail-once");
			await connector.flush();

			expect(logEntries).toHaveLength(1);
			expect(logEntries[0].level).toEqual("error");
			expect(logEntries[0].source).toEqual(EntityStorageTracingConnector.CLASS_NAME);
			expect(logEntries[0].message).toEqual("flushFailed");
			expect(logEntries[0].error?.message).toContain("storage unavailable");

			await connector.flush();
			expect(await failingStorage.getStore()).toHaveLength(1);

			ComponentFactory.unregister("logging");
		});

		test("does not log when a flush succeeds", async () => {
			const logEntries: ILogEntry[] = [];
			ComponentFactory.register("logging", () => ({
				className: () => "MockLoggingComponent",
				log: async (entry: ILogEntry) => {
					logEntries.push(entry);
				},
				query: async () => ({ entities: [] })
			}));

			const connector = new EntityStorageTracingConnector({
				config: { batchSize: 10, batchIntervalMs: 0 }
			});
			await connector.startSpan("ok");
			await connector.flush();

			expect(logEntries).toHaveLength(0);

			ComponentFactory.unregister("logging");
		});
	});

	describe("retention", () => {
		const INTERVAL_MS = 60000;
		const TWO_HOURS_MS = 7200000;
		const FIVE_DAYS_MS = 432000000;

		let logEntries: ILogEntry[];
		let consoleErrors: unknown[][];
		let connectors: EntityStorageTracingConnector[];

		function registerLogging(log: (logEntry: ILogEntry) => Promise<void>): void {
			ComponentFactory.register("logging", () => ({
				className: () => "MockLoggingComponent",
				log,
				query: async () => ({ entities: [] })
			}));
		}

		async function startConnector(
			config?: IEntityStorageTracingConnectorConfig
		): Promise<EntityStorageTracingConnector> {
			const connector = new EntityStorageTracingConnector({
				config: {
					batchSize: 0,
					batchIntervalMs: 0,
					retainForMs: 0,
					maxEntries: 0,
					retentionIntervalMs: INTERVAL_MS,
					...config
				}
			});
			connectors.push(connector);
			await connector.start();
			return connector;
		}

		async function recordSpanAt(
			connector: EntityStorageTracingConnector,
			name: string,
			startTs: number
		): Promise<void> {
			const span = SpanHelper.startSpan(name, { startTs });
			SpanHelper.endSpan(span, SpanStatus.Ok, startTs + 1);
			await connector.recordSpan(span);
		}

		async function recordOpenSpanAt(
			connector: EntityStorageTracingConnector,
			name: string,
			startTs: number
		): Promise<ISpan> {
			const span = SpanHelper.startSpan(name, { startTs });
			await connector.recordSpan(span);
			return span;
		}

		async function tick(): Promise<void> {
			await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		}

		async function storedNames(): Promise<string[]> {
			return (await storage.getStore()).map(span => span.name).sort();
		}

		beforeEach(() => {
			consoleErrors = [];
			vi.spyOn(globalThis.console, "error").mockImplementation((...params: unknown[]) => {
				consoleErrors.push(params);
			});
			ComponentFactory.register("platform", () => makePlatformComponent(false));
			logEntries = [];
			registerLogging(async logEntry => {
				logEntries.push(logEntry);
			});
			connectors = [];
			vi.useFakeTimers();
		});

		afterEach(async () => {
			for (const connector of connectors) {
				await connector.stop();
			}
			vi.useRealTimers();
			vi.restoreAllMocks();
			ComponentFactory.unregister("logging");
		});

		test("removes spans older than retainForMs on a retention timer tick", async () => {
			const connector = await startConnector({ retainForMs: 3600000 });
			await recordSpanAt(connector, "old-1", Date.now() - TWO_HOURS_MS);
			await recordSpanAt(connector, "old-2", Date.now() - TWO_HOURS_MS);
			await recordSpanAt(connector, "recent", Date.now());

			await tick();

			expect(await storedNames()).toEqual(["recent"]);
		});

		test("keeps only the newest maxEntries spans when the limit is exceeded", async () => {
			const connector = await startConnector({ maxEntries: 2 });
			for (let i = 1; i <= 4; i++) {
				await recordSpanAt(connector, `span-${i}`, i * 1000);
			}

			await tick();

			expect(await storedNames()).toEqual(["span-3", "span-4"]);
		});

		test("does not remove spans when the count is within maxEntries", async () => {
			const connector = await startConnector({ maxEntries: 5 });
			for (let i = 1; i <= 3; i++) {
				await recordSpanAt(connector, `span-${i}`, i * 1000);
			}

			await tick();

			expect(await storedNames()).toEqual(["span-1", "span-2", "span-3"]);
		});

		test("logs a retention failure rather than swallowing it", async () => {
			await startConnector({ retainForMs: 3600000 });
			vi.spyOn(storage, "count").mockRejectedValue(new Error("storage offline"));

			await tick();

			expect(logEntries).toHaveLength(1);
			expect(logEntries[0].level).toEqual("error");
			expect(logEntries[0].source).toEqual(EntityStorageTracingConnector.CLASS_NAME);
			expect(logEntries[0].message).toEqual("retentionFailed");
			expect(logEntries[0].error?.message).toContain("storage offline");
		});

		test("logs a failure and keeps the timer running", async () => {
			let failExecute = true;
			ComponentFactory.register("platform", () => ({
				className: () => "MockPlatformComponent",
				isMultiTenant: () => true,
				execute: async (method: () => Promise<void>) => {
					if (failExecute) {
						throw new Error("tenant list unavailable");
					}
					await method();
				},
				getLocalOriginContext: async () => undefined
			}));
			const connector = await startConnector({ retainForMs: 3600000 });

			await tick();

			expect(logEntries.map(entry => entry.message)).toEqual(["retentionFailed"]);
			expect(logEntries[0].error?.message).toContain("tenant list unavailable");

			// The timer survived the failure, so the next pass still trims.
			failExecute = false;
			await recordSpanAt(connector, "old", Date.now() - TWO_HOURS_MS);

			await tick();

			expect(await storedNames()).toEqual([]);
		});

		test("deletes in pages no larger than retentionBatchSize", async () => {
			const connector = await startConnector({ retainForMs: 3600000, retentionBatchSize: 2 });
			const removeBatchSpy = vi.spyOn(storage, "removeBatch");
			for (let i = 0; i < 5; i++) {
				await recordSpanAt(connector, `old-${i}`, Date.now() - TWO_HOURS_MS);
			}

			await tick();

			expect(removeBatchSpy.mock.calls.map(call => call[0].length)).toEqual([2, 2, 1]);
			expect(await storedNames()).toEqual([]);
		});

		test("spreads a large backlog across passes instead of deleting it in one burst", async () => {
			const connector = await startConnector({ retainForMs: 3600000, retentionBatchSize: 1 });
			const backlog = EntityStorageTracingConnector.RETENTION_MAX_BATCHES_PER_PASS + 2;
			for (let i = 0; i < backlog; i++) {
				await recordSpanAt(connector, `old-${i}`, Date.now() - TWO_HOURS_MS + i);
			}

			// One pass deletes at most retentionBatchSize * RETENTION_MAX_BATCHES_PER_PASS spans.
			await tick();
			expect(await storedNames()).toHaveLength(2);

			await tick();
			expect(await storedNames()).toEqual([]);
		});

		test("does not run cleanup when all retention thresholds are disabled", async () => {
			const connector = await startConnector({ retainOpenForMs: 0, maxOpenEntries: 0 });
			const countSpy = vi.spyOn(storage, "count");
			await recordSpanAt(connector, "old", Date.now() - TWO_HOURS_MS);

			await tick();

			expect(countSpy).not.toHaveBeenCalled();
			expect(await storedNames()).toEqual(["old"]);
		});

		test("stop clears the retention timer so no further cleanup runs", async () => {
			const connector = await startConnector({ retainForMs: 3600000 });
			await recordSpanAt(connector, "old", Date.now() - TWO_HOURS_MS);

			await connector.stop();
			await tick();

			expect(await storedNames()).toEqual(["old"]);
		});

		test("runs cleanup in each tenant context without crossing tenants", async () => {
			const partitionedStorage = new MemoryEntityStorageConnector<Span>({
				entitySchema: nameof<Span>(),
				partitionContextIds: [ContextIdKeys.Tenant],
				config: { storageKey: "span-partitioned" }
			});
			EntityStorageConnectorFactory.register("span", () => partitionedStorage);

			const tenants = ["tenant-a", "tenant-b"];
			ComponentFactory.register("platform", () => ({
				className: () => "MockPlatformComponent",
				isMultiTenant: () => true,
				execute: async (method: () => Promise<void>) => {
					for (const tenant of tenants) {
						await ContextIdStore.run({ [ContextIdKeys.Tenant]: tenant }, method);
					}
				},
				getLocalOriginContext: async () => undefined
			}));
			const connector = await startConnector({ retainForMs: 3600000 });

			for (const tenant of tenants) {
				await ContextIdStore.run({ [ContextIdKeys.Tenant]: tenant }, async () => {
					await recordSpanAt(connector, `old-${tenant}`, Date.now() - TWO_HOURS_MS);
					await recordSpanAt(connector, `recent-${tenant}`, Date.now());
				});
			}
			expect(await partitionedStorage.getStore()).toHaveLength(4);

			await tick();

			expect(logEntries).toEqual([]);
			for (const tenant of tenants) {
				const remaining = await ContextIdStore.run({ [ContextIdKeys.Tenant]: tenant }, async () =>
					partitionedStorage.query(undefined, undefined, undefined, undefined, 100)
				);
				expect(remaining.entities.map(entity => entity.name)).toEqual([`recent-${tenant}`]);
			}
		});

		describe("still-open spans", () => {
			test("count-based retention does not delete a still-open span", async () => {
				const connector = await startConnector({ maxEntries: 2 });
				await recordOpenSpanAt(connector, "open-oldest", Date.now() - TWO_HOURS_MS);
				await recordSpanAt(connector, "ended-1", Date.now() - 3000);
				await recordSpanAt(connector, "ended-2", Date.now() - 2000);
				await recordSpanAt(connector, "ended-3", Date.now() - 1000);

				await tick();

				// Pins the full set: the open span survives AND the ended-span cap still trims the
				// oldest ended entry - a count pass that silently does nothing would also leave
				// open-oldest present, so toContain alone wouldn't catch that.
				expect(await storedNames()).toEqual(["ended-2", "ended-3", "open-oldest"]);
			});

			test("endSpan succeeds for an open span that crossed the count threshold", async () => {
				const connector = await startConnector({ maxEntries: 2 });
				const openSpan = await recordOpenSpanAt(
					connector,
					"open-in-progress",
					Date.now() - TWO_HOURS_MS
				);
				await recordSpanAt(connector, "ended-1", Date.now() - 3000);
				await recordSpanAt(connector, "ended-2", Date.now() - 2000);
				await recordSpanAt(connector, "ended-3", Date.now() - 1000);

				await tick();

				await connector.endSpan(openSpan, SpanStatus.Ok);

				const stored = await getStoredSpan(openSpan.context.spanId);
				expect(stored?.endTs).toBeDefined();
				expect(stored?.status).toEqual(SpanStatus.Ok);
			});

			test("age-based retention keeps an open span older than retainForMs", async () => {
				const connector = await startConnector({ retainForMs: 3600000 });
				await recordOpenSpanAt(connector, "open-long-running", Date.now() - TWO_HOURS_MS);
				await recordSpanAt(connector, "recent-ended", Date.now());

				await tick();

				expect(await storedNames()).toEqual(["open-long-running", "recent-ended"]);
			});

			test("an open span older than retainOpenForMs is reaped as abandoned", async () => {
				const connector = await startConnector({ retainForMs: 3600000 });
				await recordOpenSpanAt(connector, "abandoned", Date.now() - FIVE_DAYS_MS);
				await recordSpanAt(connector, "recent-ended", Date.now());

				await tick();

				expect(await storedNames()).toEqual(["recent-ended"]);
			});

			test("honors a custom retainOpenForMs instead of the default", async () => {
				// A 2h-old open span would survive the 4-day default; only a genuinely-applied
				// custom retainOpenForMs of 1h would reap it, proving the config override is read.
				const connector = await startConnector({ retainOpenForMs: 3600000 });
				await recordOpenSpanAt(
					connector,
					"abandoned-under-custom-cutoff",
					Date.now() - TWO_HOURS_MS
				);
				await recordSpanAt(connector, "recent-ended", Date.now());

				await tick();

				expect(await storedNames()).toEqual(["recent-ended"]);
			});

			test("keeps recent open spans within maxOpenEntries untouched", async () => {
				const connector = await startConnector({ retainOpenForMs: 0, maxOpenEntries: 2 });
				await recordOpenSpanAt(connector, "open-1", Date.now() - 3000);
				await recordOpenSpanAt(connector, "open-2", Date.now() - 2000);

				await tick();

				expect(await storedNames()).toEqual(["open-1", "open-2"]);
			});

			test("trims the oldest open spans once maxOpenEntries is exceeded", async () => {
				const connector = await startConnector({ retainOpenForMs: 0, maxOpenEntries: 2 });
				await recordOpenSpanAt(connector, "open-oldest", Date.now() - 3000);
				await recordOpenSpanAt(connector, "open-2", Date.now() - 2000);
				await recordOpenSpanAt(connector, "open-3", Date.now() - 1000);

				await tick();

				expect(await storedNames()).toEqual(["open-2", "open-3"]);
			});

			test("maxEntries and maxOpenEntries cap their own populations independently", async () => {
				const connector = await startConnector({
					retainOpenForMs: 0,
					maxEntries: 2,
					maxOpenEntries: 2
				});
				await recordOpenSpanAt(connector, "open-oldest", Date.now() - 6000);
				await recordOpenSpanAt(connector, "open-2", Date.now() - 5000);
				await recordOpenSpanAt(connector, "open-3", Date.now() - 4000);
				await recordSpanAt(connector, "ended-oldest", Date.now() - 3000);
				await recordSpanAt(connector, "ended-2", Date.now() - 2000);
				await recordSpanAt(connector, "ended-3", Date.now() - 1000);

				await tick();

				expect(await storedNames()).toEqual(["ended-2", "ended-3", "open-2", "open-3"]);
			});
		});
	});

	test("endSpan handles a span not started via the connector", async () => {
		ComponentFactory.register("platform", () => makePlatformComponent(false));
		const connector = new EntityStorageTracingConnector();

		const span = SpanHelper.startSpan("orphan");

		await expect(connector.endSpan(span, SpanStatus.Ok)).rejects.toThrow(NotFoundError);

		const stored = await storage.getStore();
		expect(stored).toHaveLength(0);
	});

	test("endSpan in multi-tenant mode without a tenant context", async () => {
		ComponentFactory.register("platform", () => makePlatformComponent(true));
		const connector = new EntityStorageTracingConnector();

		const span = SpanHelper.startSpan("orphan-multi");
		SpanHelper.endSpan(span, SpanStatus.Ok);

		await expect(connector.endSpan(span, SpanStatus.Ok)).resolves.toBeUndefined();
	});
});
