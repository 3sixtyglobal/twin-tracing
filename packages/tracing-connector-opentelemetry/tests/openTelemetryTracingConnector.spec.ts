// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { SpanKind as OtelSpanKind, SpanStatusCode } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import * as opentelemetryResources from "@opentelemetry/resources";
import {
	BatchSpanProcessor,
	SimpleSpanProcessor,
	type ReadableSpan
} from "@opentelemetry/sdk-trace";
import { ContextIdKeys, ContextIdStore } from "@twin.org/context";
import { GeneralError } from "@twin.org/core";
import { SpanHelper, SpanKind, SpanStatus } from "@twin.org/tracing-models";
import type { IOpenTelemetryTracingConnectorConfig } from "../src/models/IOpenTelemetryTracingConnectorConfig.js";
import { OpenTelemetryTracingConnector } from "../src/openTelemetryTracingConnector.js";

/**
 * A trace id whose accumulation, as computed by TraceIdRatioBasedSampler, falls below the upper
 * bound for a ratio of 0.5, so it is always sampled.
 */
const SAMPLED_TRACE_ID = "0000000000000000000000000000000f";

/**
 * A trace id whose accumulation sits above the upper bound for a ratio of 0.5, so it is never
 * sampled.
 */
const UNSAMPLED_TRACE_ID = "ffffffff000000000000000000000000";

let exported: ReadableSpan[] = [];
let batchShutdowns: number;
let simpleShutdowns: number;

/**
 * Build a started connector with a single OTLP exporter configured.
 * @param config Additional config to merge.
 * @returns The started connector.
 */
async function makeConnector(
	config: Partial<IOpenTelemetryTracingConnectorConfig> = {}
): Promise<OpenTelemetryTracingConnector> {
	const connector = new OpenTelemetryTracingConnector({
		config: {
			exporters: { collector: { endpoint: "http://localhost:4318/v1/traces" } },
			...config
		}
	});
	await connector.start();
	return connector;
}

describe("OpenTelemetryTracingConnector", () => {
	beforeEach(() => {
		exported = [];
		batchShutdowns = 0;
		simpleShutdowns = 0;

		vi.spyOn(BatchSpanProcessor.prototype, "onEnd").mockImplementation((span: ReadableSpan) => {
			exported.push(span);
		});
		vi.spyOn(SimpleSpanProcessor.prototype, "onEnd").mockImplementation((span: ReadableSpan) => {
			exported.push(span);
		});
		vi.spyOn(BatchSpanProcessor.prototype, "shutdown").mockImplementation(async () => {
			batchShutdowns++;
		});
		vi.spyOn(SimpleSpanProcessor.prototype, "shutdown").mockImplementation(async () => {
			simpleShutdowns++;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("can construct", () => {
		const connector = new OpenTelemetryTracingConnector();
		expect(connector).toBeDefined();
		expect(connector.className()).toEqual("OpenTelemetryTracingConnector");
	});

	test("can construct with no exporters and export nothing", async () => {
		const connector = new OpenTelemetryTracingConnector({ config: { exporters: {} } });
		await connector.start();

		const span = await connector.startSpan("no-exporters");
		await connector.endSpan(span);

		expect(exported).toHaveLength(0);
	});

	test("throws when the processor type is not recognised", () => {
		expect(
			() =>
				new OpenTelemetryTracingConnector({
					config: {
						exporters: {
							collector: {
								endpoint: "http://localhost:4318/v1/traces",
								processor: "invalid" as "batch"
							}
						}
					}
				})
		).toThrow("guard.arrayOneOf");
	});

	test("throws when an exporter has no endpoint rather than defaulting to localhost", async () => {
		const connector = new OpenTelemetryTracingConnector({
			config: { exporters: { collector: { endpoint: "" } } }
		});

		await expect(connector.start()).rejects.toMatchObject({
			name: "GuardError",
			properties: { property: "config.endpoint" }
		});
	});

	test("throws when the sample ratio is out of range", () => {
		expect(() => new OpenTelemetryTracingConnector({ config: { sampleRatio: 1.5 } })).toThrow(
			GeneralError
		);
	});

	test("start is idempotent and stop without start is a no-op", async () => {
		const connector = await makeConnector();
		await connector.start();
		await connector.stop();
		await connector.stop();

		expect(batchShutdowns).toEqual(1);
	});

	test("builds a batch processor by default and a simple processor on request", async () => {
		const batch = await makeConnector();
		await batch.stop();
		expect(batchShutdowns).toEqual(1);
		expect(simpleShutdowns).toEqual(0);

		const simple = await makeConnector({
			exporters: {
				collector: { endpoint: "http://localhost:4318/v1/traces", processor: "simple" }
			}
		});
		await simple.stop();
		expect(simpleShutdowns).toEqual(1);
	});

	test("startSpan mints a context but exports nothing", async () => {
		const connector = await makeConnector();

		const span = await connector.startSpan("in-flight");

		expect(span.context.traceId).toMatch(/^[0-9a-f]{32}$/);
		expect(span.context.spanId).toMatch(/^[0-9a-f]{16}$/);
		expect(span.endTs).toBeUndefined();
		expect(exported).toHaveLength(0);
	});

	test("endSpan exports the completed span once", async () => {
		const connector = await makeConnector();

		const span = await connector.startSpan("handle-request", { kind: SpanKind.Server });
		await connector.endSpan(span, SpanStatus.Ok);

		expect(exported).toHaveLength(1);
		const readable = exported[0];
		expect(readable.name).toEqual("handle-request");
		expect(readable.kind).toEqual(OtelSpanKind.SERVER);
		expect(readable.status.code).toEqual(SpanStatusCode.OK);
		expect(readable.ended).toBeTruthy();
	});

	test("exports the ids minted by SpanHelper unchanged", async () => {
		const connector = await makeConnector();

		const span = await connector.startSpan("identity");
		await connector.endSpan(span);

		const context = exported[0].spanContext();
		expect(context.traceId).toEqual(span.context.traceId);
		expect(context.spanId).toEqual(span.context.spanId);
		expect(context.traceFlags).toEqual(span.context.traceFlags);
	});

	test("maps the parent span id onto the parent span context", async () => {
		const connector = await makeConnector();

		const parent = await connector.startSpan("parent");
		const child = await connector.startSpan("child", { parentContext: parent.context });
		await connector.endSpan(child);

		expect(child.parentSpanId).toEqual(parent.context.spanId);
		expect(exported[0].parentSpanContext?.spanId).toEqual(parent.context.spanId);
		expect(exported[0].parentSpanContext?.traceId).toEqual(parent.context.traceId);
	});

	test("has no parent span context for a root span", async () => {
		const connector = await makeConnector();

		const span = await connector.startSpan("root");
		await connector.endSpan(span);

		expect(exported[0].parentSpanContext).toBeUndefined();
	});

	test("converts timings to hr time and reports the duration", async () => {
		const connector = await makeConnector();

		const span = await connector.startSpan("timed", { startTs: 1_700_000_000_500 });
		span.endTs = 1_700_000_002_250;
		await connector.endSpan(span);

		expect(exported[0].startTime).toEqual([1_700_000_000, 500_000_000]);
		expect(exported[0].endTime).toEqual([1_700_000_002, 250_000_000]);
		expect(exported[0].duration).toEqual([1, 750_000_000]);
	});

	test("maps every span kind and status", async () => {
		const connector = await makeConnector();

		const kinds: [SpanKind, OtelSpanKind][] = [
			[SpanKind.Internal, OtelSpanKind.INTERNAL],
			[SpanKind.Client, OtelSpanKind.CLIENT],
			[SpanKind.Server, OtelSpanKind.SERVER],
			[SpanKind.Producer, OtelSpanKind.PRODUCER],
			[SpanKind.Consumer, OtelSpanKind.CONSUMER]
		];

		for (const [twinKind, otelKind] of kinds) {
			const span = await connector.startSpan(`kind-${twinKind}`, { kind: twinKind });
			await connector.endSpan(span);
			expect(exported[exported.length - 1].kind).toEqual(otelKind);
		}

		const errored = await connector.startSpan("failed");
		await connector.endSpan(errored, SpanStatus.Error);
		expect(exported[exported.length - 1].status.code).toEqual(SpanStatusCode.ERROR);
	});

	test("converts attributes, serialising values OTEL cannot carry", async () => {
		const connector = await makeConnector();

		const span = await connector.startSpan("attributed", {
			attributes: {
				stringValue: "a",
				numberValue: 1,
				booleanValue: true,
				uniformArray: ["a", "b"],
				mixedArray: ["a", 1],
				objectValue: { nested: true },
				undefinedValue: undefined
			}
		});
		await connector.endSpan(span);

		const attributes = exported[0].attributes;
		expect(attributes.stringValue).toEqual("a");
		expect(attributes.numberValue).toEqual(1);
		expect(attributes.booleanValue).toBeTruthy();
		expect(attributes.uniformArray).toEqual(["a", "b"]);
		expect(attributes.mixedArray).toEqual('["a",1]');
		expect(attributes.objectValue).toEqual('{"nested":true}');
		expect(attributes.undefinedValue).toBeUndefined();
	});

	test("stamps the node and tenant of the active context onto the exported span", async () => {
		const connector = await makeConnector();

		await ContextIdStore.run(
			{ [ContextIdKeys.Tenant]: "tenant-a", [ContextIdKeys.Node]: "node-1" },
			async () => {
				const span = await connector.startSpan("in-context");
				await connector.endSpan(span);
			}
		);

		expect(exported[0].attributes.node).toEqual("node-1");
		expect(exported[0].attributes.tenant).toEqual("tenant-a");
	});

	test("attributes each span to the context it was ended under", async () => {
		const connector = await makeConnector();

		await ContextIdStore.run({ [ContextIdKeys.Tenant]: "tenant-a" }, async () => {
			const span = await connector.startSpan("from-a");
			await connector.endSpan(span);
		});
		await ContextIdStore.run({ [ContextIdKeys.Tenant]: "tenant-b" }, async () => {
			const span = await connector.startSpan("from-b");
			await connector.endSpan(span);
		});

		expect(exported.map(span => [span.name, span.attributes.tenant])).toEqual([
			["from-a", "tenant-a"],
			["from-b", "tenant-b"]
		]);
	});

	test("omits the context attributes when there is no active context", async () => {
		const connector = await makeConnector();

		const span = await connector.startSpan("no-context");
		await connector.endSpan(span);

		expect(exported[0].attributes.node).toBeUndefined();
		expect(exported[0].attributes.tenant).toBeUndefined();
	});

	test("stamps the context onto a span replicated through recordSpan", async () => {
		const connector = await makeConnector();

		await ContextIdStore.run({ [ContextIdKeys.Tenant]: "tenant-c" }, async () => {
			const span = SpanHelper.startSpan("replicated");
			SpanHelper.endSpan(span, SpanStatus.Ok);
			await connector.recordSpan(span);
		});

		expect(exported[0].attributes.tenant).toEqual("tenant-c");
	});

	test("maps events and links", async () => {
		const connector = await makeConnector();
		const linked = SpanHelper.createContext();

		const span = await connector.startSpan("annotated", {
			links: [{ context: linked, attributes: { reason: "retry" } }]
		});
		span.events = [{ name: "cache-miss", ts: 1_700_000_000_000, attributes: { key: "abc" } }];
		await connector.endSpan(span);

		expect(exported[0].events).toHaveLength(1);
		expect(exported[0].events[0].name).toEqual("cache-miss");
		expect(exported[0].events[0].time).toEqual([1_700_000_000, 0]);
		expect(exported[0].events[0].attributes?.key).toEqual("abc");

		expect(exported[0].links).toHaveLength(1);
		expect(exported[0].links[0].context.spanId).toEqual(linked.spanId);
		expect(exported[0].links[0].attributes?.reason).toEqual("retry");
	});

	test("recordSpan exports completed spans and ignores open ones", async () => {
		const connector = await makeConnector();

		const open = SpanHelper.startSpan("still-open");
		await connector.recordSpan(open);
		expect(exported).toHaveLength(0);

		SpanHelper.endSpan(open, SpanStatus.Ok);
		await connector.recordSpan(open);
		expect(exported).toHaveLength(1);
		expect(exported[0].spanContext().spanId).toEqual(open.context.spanId);
	});

	test("drops spans whose context is not sampled", async () => {
		const connector = await makeConnector();

		const span = await connector.startSpan("unsampled");
		span.context.traceFlags = 0;
		await connector.endSpan(span);

		expect(exported).toHaveLength(0);
	});

	test("drops spans when the connector is not started or has been stopped", async () => {
		const connector = new OpenTelemetryTracingConnector({
			config: { exporters: { collector: { endpoint: "http://localhost:4318" } } }
		});

		const before = SpanHelper.startSpan("before-start");
		SpanHelper.endSpan(before);
		await connector.recordSpan(before);
		expect(exported).toHaveLength(0);

		await connector.start();
		await connector.stop();

		const after = SpanHelper.startSpan("after-stop");
		SpanHelper.endSpan(after);
		await connector.recordSpan(after);
		expect(exported).toHaveLength(0);
	});

	test("a sample ratio of zero drops everything", async () => {
		const connector = await makeConnector({ sampleRatio: 0 });

		const span = await connector.startSpan("sampled-out");
		await connector.endSpan(span);

		expect(exported).toHaveLength(0);
	});

	test("exports every span of a trace the sample ratio selects", async () => {
		const connector = await makeConnector({ sampleRatio: 0.5 });

		const parentContext = {
			traceId: SAMPLED_TRACE_ID,
			spanId: "0000000000000001",
			traceFlags: 1
		};

		for (let i = 0; i < 5; i++) {
			const span = await connector.startSpan(`ratio-${i}`, { parentContext });
			await connector.endSpan(span);
		}

		expect(exported).toHaveLength(5);
		expect(exported.every(span => span.spanContext().traceId === SAMPLED_TRACE_ID)).toBeTruthy();
	});

	test("drops every span of a trace the sample ratio excludes", async () => {
		const connector = await makeConnector({ sampleRatio: 0.5 });

		const parentContext = {
			traceId: UNSAMPLED_TRACE_ID,
			spanId: "0000000000000001",
			traceFlags: 1
		};

		for (let i = 0; i < 5; i++) {
			const span = await connector.startSpan(`ratio-${i}`, { parentContext });
			await connector.endSpan(span);
		}

		expect(exported).toHaveLength(0);
	});

	test("reports the configured instrumentation scope", async () => {
		const connector = await makeConnector({ tracerName: "my-tracer", tracerVersion: "2.1.0" });

		const span = await connector.startSpan("scoped");
		await connector.endSpan(span);

		expect(exported[0].instrumentationScope).toEqual({ name: "my-tracer", version: "2.1.0" });
	});

	test("defaults the instrumentation scope", async () => {
		const connector = await makeConnector();

		const span = await connector.startSpan("scoped");
		await connector.endSpan(span);

		expect(exported[0].instrumentationScope).toEqual({ name: "twin-tracing", version: "1.0.0" });
	});

	test("merges the configured resource attributes over the detected ones", async () => {
		const resourceSpy = vi.spyOn(opentelemetryResources, "resourceFromAttributes");

		const connector = await makeConnector({
			resourceAttributes: {
				"service.name": "twin-node",
				"service.namespace": "twin-nodes-kitsune"
			}
		});

		expect(resourceSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				"service.name": "twin-node",
				"service.namespace": "twin-nodes-kitsune"
			})
		);

		const span = await connector.startSpan("resourced");
		await connector.endSpan(span);

		expect(exported[0].resource.attributes["service.name"]).toEqual("twin-node");
		expect(exported[0].resource.attributes["service.namespace"]).toEqual("twin-nodes-kitsune");
	});

	test("a real span processor accepts the span and passes it to the exporter", async () => {
		vi.restoreAllMocks();

		const batches: ReadableSpan[][] = [];
		vi.spyOn(OTLPTraceExporter.prototype, "export").mockImplementation((spans, resultCallback) => {
			batches.push(spans);
			resultCallback({ code: 0 });
		});

		const connector = new OpenTelemetryTracingConnector({
			config: {
				exporters: {
					collector: { endpoint: "http://localhost:4318/v1/traces", processor: "simple" }
				}
			}
		});
		await connector.start();

		const span = await connector.startSpan("real-pipeline", { kind: SpanKind.Server });
		await connector.endSpan(span, SpanStatus.Ok);

		// Let async export finish.
		await new Promise(resolve => {
			setImmediate(resolve);
		});

		expect(batches).toHaveLength(1);
		expect(batches[0]).toHaveLength(1);
		expect(batches[0][0].name).toEqual("real-pipeline");
		expect(batches[0][0].spanContext().spanId).toEqual(span.context.spanId);
		expect(batches[0][0].kind).toEqual(OtelSpanKind.SERVER);
	});

	test("exports to every configured exporter", async () => {
		const connector = await makeConnector({
			exporters: {
				primary: { endpoint: "http://localhost:4318/v1/traces" },
				secondary: { endpoint: "http://backup:4318/v1/traces" }
			}
		});

		const span = await connector.startSpan("fanned-out");
		await connector.endSpan(span);

		expect(exported).toHaveLength(2);
		expect(exported[0].spanContext().spanId).toEqual(exported[1].spanContext().spanId);
	});
});
