// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComparisonOperator, LogicalOperator } from "@3sixty/entity";
import { type ITracingConnector, SpanHelper, SpanKind, SpanStatus } from "@3sixty/tracing-models";
import { SpanKind as OtelSpanKind, SpanStatusCode } from "@opentelemetry/api";
import { hrTimeToMilliseconds } from "@opentelemetry/core";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace";
import { TEST_OTLP_ENDPOINT_TRACES } from "./setupTestEnv.js";
import type { IOpenTelemetryTracingConnectorConfig } from "../src/models/IOpenTelemetryTracingConnectorConfig.js";
import { OpenTelemetryTracingConnector } from "../src/openTelemetryTracingConnector.js";

// This spec is intentionally kept in sync with all other tracing connector specs.
// Any test added here should also be added to all other tracing connector specs.
// Use feature flags (e.g. SUPPORTS_QUERY) to skip tests for unsupported features.

const SUPPORTS_QUERY = false;

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

const OTEL_KIND: { [key: number]: SpanKind } = {
	[OtelSpanKind.INTERNAL]: SpanKind.Internal,
	[OtelSpanKind.SERVER]: SpanKind.Server,
	[OtelSpanKind.CLIENT]: SpanKind.Client,
	[OtelSpanKind.PRODUCER]: SpanKind.Producer,
	[OtelSpanKind.CONSUMER]: SpanKind.Consumer
};

const OTEL_STATUS: { [key: number]: SpanStatus } = {
	[SpanStatusCode.UNSET]: SpanStatus.Unset,
	[SpanStatusCode.OK]: SpanStatus.Ok,
	[SpanStatusCode.ERROR]: SpanStatus.Error
};

let memExporter: InMemorySpanExporter;

async function makeConnector(
	config: Partial<IOpenTelemetryTracingConnectorConfig> = {}
): Promise<OpenTelemetryTracingConnector> {
	const connector = new OpenTelemetryTracingConnector({
		config: {
			exporters: {
				collector: { endpoint: TEST_OTLP_ENDPOINT_TRACES, processor: "simple" },
				test: { exporter: memExporter, processor: "simple" }
			},
			...config
		}
	});
	await connector.start();
	return connector;
}

async function getStoredSpan(spanId: string): Promise<StoredSpan | undefined> {
	return (await getStoredSpans()).find(s => s.spanId === spanId);
}

async function getStoredSpans(): Promise<StoredSpan[]> {
	return memExporter.getFinishedSpans().map(r => {
		const events = r.events.map(e => {
			const ev: { name: string; ts: number; attributes?: { [key: string]: unknown } } = {
				name: e.name,
				ts: hrTimeToMilliseconds(e.time)
			};
			if (e.attributes && Object.keys(e.attributes).length > 0) {
				ev.attributes = e.attributes;
			}
			return ev;
		});

		const links = r.links.map(l => {
			const lk: {
				context: { traceId: string; spanId: string; traceFlags: number };
				attributes?: { [key: string]: unknown };
			} = {
				context: {
					traceId: l.context.traceId,
					spanId: l.context.spanId,
					traceFlags: l.context.traceFlags
				}
			};
			if (l.attributes && Object.keys(l.attributes).length > 0) {
				lk.attributes = l.attributes;
			}
			return lk;
		});

		return {
			spanId: r.spanContext().spanId,
			traceId: r.spanContext().traceId,
			parentSpanId: r.parentSpanContext?.spanId,
			kind: OTEL_KIND[r.kind] ?? SpanKind.Internal,
			status: OTEL_STATUS[r.status.code] ?? SpanStatus.Unset,
			startTs: hrTimeToMilliseconds(r.startTime),
			endTs: hrTimeToMilliseconds(r.endTime),
			durationMs: hrTimeToMilliseconds(r.duration),
			attributes: r.attributes,
			events,
			links
		};
	});
}

describe("OpenTelemetryTracingConnector", () => {
	beforeEach(() => {
		memExporter = new InMemorySpanExporter();
	});

	describe.each([
		{ label: "no context", multiTenant: false, inTenantContext: false },
		{ label: "with context", multiTenant: true, inTenantContext: true },
		{ label: "multi-tenant, no tenant", multiTenant: true, inTenantContext: false }
	])("$label", ({ inTenantContext }) => {
		let connector: OpenTelemetryTracingConnector;

		beforeEach(async () => {
			connector = await makeConnector();
		});

		afterEach(async () => {
			await connector.stop();
		});

		async function runInContext<T>(fn: () => Promise<T>): Promise<T> {
			if (inTenantContext) {
				return ContextIdStore.run(
					{ [ContextIdKeys.Tenant]: "test-tenant", [ContextIdKeys.Node]: "node-1" },
					fn
				);
			}
			return fn();
		}

		test("startSpan mints a valid context and stays open", async () => {
			const span = await runInContext(async () =>
				connector.startSpan("in-flight", { kind: SpanKind.Server })
			);

			expect(span.context.traceId).toMatch(/^[0-9a-f]{32}$/);
			expect(span.context.spanId).toMatch(/^[0-9a-f]{16}$/);
			expect(span.endTs).toBeUndefined();
			expect(span.status).toEqual(SpanStatus.Unset);
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
		});

		test.skipIf(!SUPPORTS_QUERY)("query returns spans matching a trace id filter", async () => {
			const root = await runInContext(async () =>
				connector.startSpan("root", { kind: SpanKind.Server })
			);
			await runInContext(async () => connector.endSpan(root, SpanStatus.Ok));
			await runInContext(async () => connector.startSpan("other", { kind: SpanKind.Client })).then(
				async other => runInContext(async () => connector.endSpan(other, SpanStatus.Error))
			);

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
		const connector = await makeConnector();

		const span = SpanHelper.startSpan("orphan");
		await expect(connector.endSpan(span, SpanStatus.Ok)).resolves.toBeUndefined();
		const stored = await getStoredSpans();
		expect(stored).toHaveLength(1);
		expect(stored[0].spanId).toEqual(span.context.spanId);
		await connector.stop();
	});

	test("endSpan in multi-tenant mode without a tenant context", async () => {
		const connector = await makeConnector();

		const span = SpanHelper.startSpan("orphan-multi");
		SpanHelper.endSpan(span, SpanStatus.Ok);
		await expect(connector.endSpan(span, SpanStatus.Ok)).resolves.toBeUndefined();
		await connector.stop();
	});
});
