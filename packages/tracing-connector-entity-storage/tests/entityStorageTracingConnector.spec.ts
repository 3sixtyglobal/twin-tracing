// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { NotFoundError } from "@twin.org/core";
import { ComparisonOperator, LogicalOperator } from "@twin.org/entity";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import { SpanHelper, SpanKind, SpanStatus } from "@twin.org/tracing-models";
import type { Span } from "../src/entities/span.js";
import { EntityStorageTracingConnector } from "../src/entityStorageTracingConnector.js";
import { initSchema } from "../src/schema.js";

describe("EntityStorageTracingConnector", () => {
	let storage: MemoryEntityStorageConnector<Span>;

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

	test("can construct", async () => {
		const connector = new EntityStorageTracingConnector();
		expect(connector).toBeDefined();
	});

	test("startSpan persists an open span observable via query", async () => {
		const connector = new EntityStorageTracingConnector();

		const span = await connector.startSpan("process-order", { kind: SpanKind.Server });
		expect(span.context.traceId).toMatch(/^[0-9a-f]{32}$/);
		expect(span.status).toEqual(SpanStatus.Unset);

		const stored = await storage.getStore();
		expect(stored).toHaveLength(1);
		expect(stored[0].spanId).toEqual(span.context.spanId);
		expect(stored[0].kind).toEqual(SpanKind.Server);
		expect(stored[0].status).toEqual(SpanStatus.Unset);
		expect(stored[0].endTs).toBeUndefined();
	});

	test("endSpan updates the same span row with status and duration", async () => {
		const connector = new EntityStorageTracingConnector();

		const span = await connector.startSpan("process-order", { startTs: 1000 });
		span.attributes = { orderId: "ord-1" };
		span.events = [{ name: "validated", ts: 1100 }];

		await connector.endSpan(span, SpanStatus.Ok);

		const stored = await storage.getStore();
		expect(stored).toHaveLength(1);
		expect(stored[0].status).toEqual(SpanStatus.Ok);
		expect(stored[0].endTs).toBeGreaterThanOrEqual(1000);
		expect(stored[0].durationMs).toBeGreaterThanOrEqual(0);
		expect(stored[0].attributes).toEqual({ orderId: "ord-1" });
		expect(stored[0].events).toEqual([{ name: "validated", ts: 1100 }]);
	});

	test("a child span inherits the trace id and records the parent span id", async () => {
		const connector = new EntityStorageTracingConnector();

		const root = await connector.startSpan("root", { kind: SpanKind.Server });
		const child = await connector.startSpan("child", {
			kind: SpanKind.Internal,
			parentContext: root.context
		});

		expect(child.context.traceId).toEqual(root.context.traceId);
		expect(child.parentSpanId).toEqual(root.context.spanId);
		expect(child.context.spanId).not.toEqual(root.context.spanId);
	});

	test("query filters by trace id, status and kind and rehydrates the context", async () => {
		const connector = new EntityStorageTracingConnector();

		const root = await connector.startSpan("root", { kind: SpanKind.Server });
		await connector.endSpan(root, SpanStatus.Ok);
		const other = await connector.startSpan("other", { kind: SpanKind.Client });
		await connector.endSpan(other, SpanStatus.Error);

		const byTrace = await connector.query({
			conditions: [
				{ property: "traceId", comparison: ComparisonOperator.Equals, value: root.context.traceId }
			],
			logicalOperator: LogicalOperator.And
		});

		expect(byTrace.entities).toHaveLength(1);
		const found = byTrace.entities[0];
		expect(found.context.traceId).toEqual(root.context.traceId);
		expect(found.context.spanId).toEqual(root.context.spanId);
		expect(found.status).toEqual(SpanStatus.Ok);
		expect(found.kind).toEqual(SpanKind.Server);

		const byStatus = await connector.query({
			conditions: [
				{ property: "status", comparison: ComparisonOperator.Equals, value: SpanStatus.Error }
			],
			logicalOperator: LogicalOperator.And
		});
		expect(byStatus.entities).toHaveLength(1);
		expect(byStatus.entities[0].name).toEqual("other");
	});

	test("links are flattened on write and rehydrated on read", async () => {
		const connector = new EntityStorageTracingConnector();

		const linkedTraceId = "4bf92f3577b34da6a3ce929d0e0e4736";
		const span = await connector.startSpan("with-link", {
			links: [
				{
					context: { traceId: linkedTraceId, spanId: "00f067aa0ba902b7", traceFlags: 1 },
					attributes: { reason: "batch" }
				}
			]
		});
		await connector.endSpan(span, SpanStatus.Ok);

		const result = await connector.query({
			conditions: [
				{ property: "spanId", comparison: ComparisonOperator.Equals, value: span.context.spanId }
			],
			logicalOperator: LogicalOperator.And
		});

		const found = result.entities[0];
		expect(found.links).toHaveLength(1);
		expect(found.links?.[0].context.traceId).toEqual(linkedTraceId);
		expect(found.links?.[0].attributes).toEqual({ reason: "batch" });
	});

	test("endSpan of a never-started span throws NotFoundError", async () => {
		const connector = new EntityStorageTracingConnector();

		// Mint a span but never persist it (no startSpan/recordSpan).
		const span = SpanHelper.startSpan("orphan");

		await expect(connector.endSpan(span, SpanStatus.Ok)).rejects.toThrow(NotFoundError);

		const stored = await storage.getStore();
		expect(stored).toHaveLength(0);
	});

	test("recordSpan persists an open span then updates the same row on complete", async () => {
		const connector = new EntityStorageTracingConnector();

		const span = SpanHelper.startSpan("recorded", { startTs: 1000 });
		await connector.recordSpan(span);

		let stored = await storage.getStore();
		expect(stored).toHaveLength(1);
		expect(stored[0].status).toEqual(SpanStatus.Unset);
		expect(stored[0].endTs).toBeUndefined();

		SpanHelper.endSpan(span, SpanStatus.Ok, 1200);
		await connector.recordSpan(span);

		stored = await storage.getStore();
		expect(stored).toHaveLength(1);
		expect(stored[0].status).toEqual(SpanStatus.Ok);
		expect(stored[0].durationMs).toEqual(200);
	});

	test("endSpan is idempotent across a double end", async () => {
		const connector = new EntityStorageTracingConnector();

		const span = await connector.startSpan("dbl", { startTs: 1000 });
		await connector.endSpan(span, SpanStatus.Ok);
		const firstEndTs = span.endTs;
		const firstDuration = span.durationMs;

		await connector.endSpan(span, SpanStatus.Ok);

		expect(span.endTs).toEqual(firstEndTs);
		expect(span.durationMs).toEqual(firstDuration);

		const stored = await storage.getStore();
		expect(stored).toHaveLength(1);
	});
});
