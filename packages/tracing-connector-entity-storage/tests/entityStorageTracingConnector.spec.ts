// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IPlatformComponent } from "@twin.org/api-models";
import { ContextIdKeys, ContextIdStore } from "@twin.org/context";
import { ComponentFactory, NotFoundError } from "@twin.org/core";
import { ComparisonOperator, LogicalOperator } from "@twin.org/entity";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import { SpanHelper, SpanKind, SpanStatus } from "@twin.org/tracing-models";
import type { ITracingConnector } from "@twin.org/tracing-models";
import type { Span } from "../src/entities/span.js";
import type { SpanLink } from "../src/entities/spanLink.js";
import { EntityStorageTracingConnector } from "../src/entityStorageTracingConnector.js";
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
				...(l.attributes ? { attributes: l.attributes } : {})
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
			connector = new EntityStorageTracingConnector();
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
