// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	ROOT_CONTEXT,
	SpanKind as OtelSpanKind,
	SpanStatusCode,
	TraceFlags,
	type Attributes,
	type Link,
	type SpanStatus as OtelSpanStatus
} from "@opentelemetry/api";
import { millisToHrTime, type InstrumentationScope } from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { defaultResource, resourceFromAttributes, type Resource } from "@opentelemetry/resources";
import {
	BatchSpanProcessor,
	SamplingDecision,
	SimpleSpanProcessor,
	TraceIdRatioBasedSampler,
	type ReadableSpan,
	type SpanExporter,
	type SpanProcessor,
	type TimedEvent
} from "@opentelemetry/sdk-trace";
import { ContextIdKeys, ContextIdStore, type IContextIds } from "@twin.org/context";
import { ComponentFactory, GeneralError, Guards, Is } from "@twin.org/core";
import type { ILoggingComponent } from "@twin.org/logging-models";
import { nameof } from "@twin.org/nameof";
import {
	SpanHelper,
	type ISpan,
	type ISpanOptions,
	type ITracingConnector,
	type SpanKind,
	type SpanStatus
} from "@twin.org/tracing-models";
import type { IOpenTelemetryTracingConnectorConfig } from "./models/IOpenTelemetryTracingConnectorConfig.js";
import type { IOpenTelemetryTracingConnectorConstructorOptions } from "./models/IOpenTelemetryTracingConnectorConstructorOptions.js";
import { OpenTelemetryProcessorTypes } from "./models/openTelemetryProcessorTypes.js";

/**
 * Class for exporting spans to an OTLP compatible endpoint using OpenTelemetry.
 *
 * The connector is a pure forwarder, it does not persist spans and therefore does not implement
 * `query()`.
 */
export class OpenTelemetryTracingConnector implements ITracingConnector {
	/**
	 * The namespace for the tracing connector.
	 */
	public static readonly NAMESPACE: string = "open-telemetry";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<OpenTelemetryTracingConnector>();

	/**
	 * Maps a TWIN span kind to an OpenTelemetry span kind.
	 * @internal
	 */
	private static readonly _KINDS: { [kind in SpanKind]: OtelSpanKind } = {
		internal: OtelSpanKind.INTERNAL,
		client: OtelSpanKind.CLIENT,
		server: OtelSpanKind.SERVER,
		producer: OtelSpanKind.PRODUCER,
		consumer: OtelSpanKind.CONSUMER
	};

	/**
	 * Maps a TWIN span status to an OpenTelemetry status code.
	 * @internal
	 */
	private static readonly _STATUS_CODES: { [status in SpanStatus]: SpanStatusCode } = {
		unset: SpanStatusCode.UNSET,
		ok: SpanStatusCode.OK,
		error: SpanStatusCode.ERROR
	};

	/**
	 * Config options, stored so start() can build the exporters.
	 * @internal
	 */
	private readonly _config: IOpenTelemetryTracingConnectorConfig;

	/**
	 * The instrumentation scope reported on every exported span.
	 * @internal
	 */
	private readonly _scope: InstrumentationScope;

	/**
	 * Samples spans deterministically by trace id, undefined when everything is exported.
	 * @internal
	 */
	private readonly _sampler?: TraceIdRatioBasedSampler;

	/**
	 * The processors built by start(), each wrapping one configured exporter.
	 * @internal
	 */
	private _processors: SpanProcessor[];

	/**
	 * Base resource built from config in start(), merged under per-tenant attributes.
	 * @internal
	 */
	private _baseResource?: Resource;

	/**
	 * Per-tenant/node resource cache, keyed by "nodeId/tenantId".
	 * Entries are created on demand the first time a span is exported for each pair.
	 * @internal
	 */
	private readonly _resources: { [key: string]: Resource };

	/**
	 * True between start() and stop().
	 * @internal
	 */
	private _started: boolean;

	/**
	 * Create a new instance of OpenTelemetryTracingConnector.
	 * @param options The options for the tracing connector.
	 * @throws GuardError if a configured processor is not a supported value, or GeneralError if the
	 * sample ratio is outside the range 0 to 1.
	 */
	constructor(options?: IOpenTelemetryTracingConnectorConstructorOptions) {
		this._config = options?.config ?? {};
		this._processors = [];
		this._resources = {};
		this._started = false;
		this._scope = {
			name: this._config.tracerName ?? "twin-tracing",
			version: this._config.tracerVersion ?? "1.0.0"
		};

		for (const [, config] of Object.entries(this._config.exporters ?? {})) {
			if (!Is.undefined(config.processor)) {
				Guards.arrayOneOf(
					OpenTelemetryTracingConnector.CLASS_NAME,
					nameof(config.processor),
					config.processor,
					Object.values(OpenTelemetryProcessorTypes)
				);
			}
		}

		const sampleRatio = this._config.sampleRatio;
		if (!Is.undefined(sampleRatio)) {
			Guards.number(OpenTelemetryTracingConnector.CLASS_NAME, nameof(sampleRatio), sampleRatio);
			if (sampleRatio < 0 || sampleRatio > 1) {
				throw new GeneralError(OpenTelemetryTracingConnector.CLASS_NAME, "sampleRatioOutOfRange", {
					sampleRatio
				});
			}
			// A ratio of 1 exports everything, so skip the sampler entirely.
			if (sampleRatio < 1) {
				this._sampler = new TraceIdRatioBasedSampler(sampleRatio);
			}
		}
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return OpenTelemetryTracingConnector.CLASS_NAME;
	}

	/**
	 * Build the exporters and the resource, and mark the connector as running. Calling start() on a
	 * connector that has already been started is a no-op.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when the connector is ready to export spans.
	 * @throws GuardError if an exporter has no endpoint.
	 */
	public async start(nodeLoggingComponentType?: string): Promise<void> {
		if (this._started) {
			return;
		}

		this._baseResource = Is.empty(this._config.resourceAttributes)
			? defaultResource()
			: defaultResource().merge(resourceFromAttributes(this._config.resourceAttributes));

		this._processors = this.buildProcessors();
		this._started = true;

		const nodeLogging = ComponentFactory.getIfExists<ILoggingComponent>(nodeLoggingComponentType);
		await nodeLogging?.log({
			source: OpenTelemetryTracingConnector.CLASS_NAME,
			message: "connectorStarted",
			level: "info",
			data: { exporterCount: this._processors.length }
		});
	}

	/**
	 * Shut down the span processors and release resources. Shutting a processor down flushes any
	 * spans it still has buffered, so this must be called during a graceful shutdown to avoid losing
	 * them. Calling stop() on a connector that has not been started is a no-op.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when all processors have shut down.
	 */
	public async stop(nodeLoggingComponentType?: string): Promise<void> {
		if (this._started) {
			await Promise.all(this._processors.map(async processor => processor.shutdown()));
			this._processors = [];
			for (const key of Object.keys(this._resources)) {
				delete this._resources[key];
			}
			this._baseResource = undefined;
			this._started = false;

			const nodeLogging = ComponentFactory.getIfExists<ILoggingComponent>(nodeLoggingComponentType);
			await nodeLogging?.log({
				source: OpenTelemetryTracingConnector.CLASS_NAME,
				message: "connectorStopped",
				level: "info",
				data: {}
			});
		}
	}

	/**
	 * Start a new span. Nothing is exported yet, an OTLP receiver only accepts completed spans, so
	 * the span is exported when it ends.
	 * @param name The name of the span.
	 * @param options The options for the span.
	 * @returns The started span, including its minted context.
	 */
	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		Guards.stringValue(OpenTelemetryTracingConnector.CLASS_NAME, nameof(name), name);

		return SpanHelper.startSpan(name, options);
	}

	/**
	 * End a span, finalizing its status and duration and exporting it.
	 * @param span The span to end.
	 * @param status The status to set on the span, defaults to ok.
	 * @returns A promise that resolves when the span has been queued for export.
	 */
	public async endSpan(span: ISpan, status?: SpanStatus): Promise<void> {
		Guards.object<ISpan>(OpenTelemetryTracingConnector.CLASS_NAME, nameof(span), span);

		if (Is.integer(span.endTs)) {
			return;
		}

		SpanHelper.endSpan(span, status);

		this.exportSpan(span, (await ContextIdStore.getContextIds()) ?? {});
	}

	/**
	 * Record a pre-built span verbatim. Completed spans are exported, open spans are ignored since
	 * they cannot be represented over OTLP; the span will be exported when it is recorded again with
	 * an end time.
	 * @param span The span to record.
	 * @returns A promise that resolves when the span has been queued for export.
	 */
	public async recordSpan(span: ISpan): Promise<void> {
		Guards.object<ISpan>(OpenTelemetryTracingConnector.CLASS_NAME, nameof(span), span);

		if (Is.integer(span.endTs)) {
			this.exportSpan(span, (await ContextIdStore.getContextIds()) ?? {});
		}
	}

	/**
	 * Build a span processor for each configured exporter. Each processor owns its exporter so the
	 * processors can be shut down independently.
	 * @returns The processors.
	 * @throws GuardError if an exporter has no endpoint.
	 * @internal
	 */
	private buildProcessors(): SpanProcessor[] {
		const processors: SpanProcessor[] = [];

		for (const [, config] of Object.entries(this._config.exporters ?? {})) {
			let exporter: SpanExporter;
			if (config.exporter) {
				exporter = config.exporter;
			} else {
				Guards.stringValue(
					OpenTelemetryTracingConnector.CLASS_NAME,
					nameof(config.endpoint),
					config.endpoint
				);
				exporter = new OTLPTraceExporter({
					url: config.endpoint,
					headers: config.headers,
					concurrencyLimit: config.concurrencyLimit,
					timeoutMillis: config.timeoutMs
				});
			}

			if (config.processor === OpenTelemetryProcessorTypes.Simple) {
				processors.push(new SimpleSpanProcessor({ exporter }));
			} else {
				processors.push(
					new BatchSpanProcessor({
						exporter,
						scheduledDelayMillis: config.scheduledDelayMs,
						maxExportBatchSize: config.maxExportBatchSize,
						maxQueueSize: config.maxQueueSize,
						exportTimeoutMillis: config.exportTimeoutMs
					})
				);
			}
		}

		return processors;
	}

	/**
	 * Hand a completed span to every processor. Spans are dropped when the connector is not running,
	 * when the context is not marked as sampled, or when the configured ratio excludes the trace.
	 * @param span The completed span.
	 * @param contextIds The context IDs the span was ended under.
	 * @internal
	 */
	private exportSpan(span: ISpan, contextIds: IContextIds): void {
		if (!this._started || this._processors.length === 0) {
			return;
		}

		// eslint-disable-next-line no-bitwise
		if ((span.context.traceFlags & TraceFlags.SAMPLED) === 0) {
			return;
		}

		if (!Is.undefined(this._sampler)) {
			const decision = this._sampler.shouldSample(ROOT_CONTEXT, span.context.traceId);
			if (decision.decision === SamplingDecision.NOT_RECORD) {
				return;
			}
		}

		const readableSpan = this.toReadableSpan(span, contextIds);
		for (const processor of this._processors) {
			processor.onEnd(readableSpan);
		}
	}

	/**
	 * Convert a completed span into the shape the OpenTelemetry export pipeline consumes.
	 * @param span The completed span.
	 * @param contextIds The context IDs the span was ended under.
	 * @returns The readable span.
	 * @internal
	 */
	private toReadableSpan(span: ISpan, contextIds: IContextIds): ReadableSpan {
		const startTime = millisToHrTime(span.startTs);
		const endTs = span.endTs ?? span.startTs;
		const status: OtelSpanStatus = {
			code: OpenTelemetryTracingConnector._STATUS_CODES[span.status] ?? SpanStatusCode.UNSET
		};

		const events: TimedEvent[] = (span.events ?? []).map(event => ({
			name: event.name,
			time: millisToHrTime(event.ts),
			attributes: this.toAttributes(event.attributes)
		}));

		const links: Link[] = (span.links ?? []).map(link => ({
			context: {
				traceId: link.context.traceId,
				spanId: link.context.spanId,
				traceFlags: link.context.traceFlags
			},
			attributes: this.toAttributes(link.attributes)
		}));

		const attributes = this.toAttributes(span.attributes);
		const node = contextIds[ContextIdKeys.Node];
		const tenant = contextIds[ContextIdKeys.Tenant];
		if (Is.stringValue(node)) {
			attributes.node = node;
		}
		if (Is.stringValue(tenant)) {
			attributes.tenant = tenant;
		}

		return {
			name: span.name,
			kind: OpenTelemetryTracingConnector._KINDS[span.kind] ?? OtelSpanKind.INTERNAL,
			spanContext: () => ({
				traceId: span.context.traceId,
				spanId: span.context.spanId,
				traceFlags: span.context.traceFlags
			}),
			parentSpanContext: Is.stringValue(span.parentSpanId)
				? {
						traceId: span.context.traceId,
						spanId: span.parentSpanId,
						traceFlags: span.context.traceFlags
					}
				: undefined,
			startTime,
			endTime: millisToHrTime(endTs),
			status,
			attributes,
			links,
			events,
			duration: millisToHrTime(span.durationMs ?? Math.max(0, endTs - span.startTs)),
			ended: true,
			resource: this.getOrCreateResource(contextIds),
			instrumentationScope: this._scope,
			droppedAttributesCount: 0,
			droppedEventsCount: 0,
			droppedLinksCount: 0
		};
	}

	/**
	 * Return or create the Resource for the given tenant/node pair.
	 * Resources are keyed by "nodeId/tenantId" and carry OTEL resource attributes
	 * service.namespace=tenantId and service.instance.id=nodeId when those values
	 * are present.
	 * @param contextIds The current execution context IDs.
	 * @returns The cached or newly created resource.
	 * @internal
	 */
	private getOrCreateResource(contextIds: IContextIds): Resource {
		const node = contextIds[ContextIdKeys.Node];
		const tenantId = contextIds[ContextIdKeys.Tenant];
		const key = `${node ?? ""}/${tenantId ?? ""}`;

		let cached = this._resources[key];
		if (!Is.undefined(cached)) {
			return cached;
		}

		const base = this._baseResource ?? defaultResource();
		const resourceAttrs: { [id: string]: string } = {};
		const resourcePrefix = "service";
		if (Is.stringValue(node)) {
			resourceAttrs[`${resourcePrefix}.instance.id`] = node;
		}
		if (Is.stringValue(tenantId)) {
			resourceAttrs[`${resourcePrefix}.namespace`] = tenantId;
		}

		cached =
			Object.keys(resourceAttrs).length > 0
				? base.merge(resourceFromAttributes(resourceAttrs))
				: base;
		this._resources[key] = cached;
		return cached;
	}

	/**
	 * Convert loosely typed attributes into OpenTelemetry attributes. Primitives and uniform
	 * primitive arrays are forwarded as-is, anything else is serialised.
	 * @param attributes The attributes to convert.
	 * @returns The OpenTelemetry attributes.
	 * @internal
	 */
	private toAttributes(attributes?: { [key: string]: unknown }): Attributes {
		const converted: Attributes = {};

		if (Is.empty(attributes)) {
			return converted;
		}

		for (const [key, value] of Object.entries(attributes)) {
			if (Is.string(value) || Is.number(value) || Is.boolean(value)) {
				converted[key] = value;
			} else if (
				Is.arrayValue(value) &&
				(Is.string(value[0]) || Is.number(value[0]) || Is.boolean(value[0])) &&
				value.every(element => typeof element === typeof value[0])
			) {
				converted[key] = value as string[] | number[] | boolean[];
			} else if (!Is.undefined(value)) {
				converted[key] = JSON.stringify(value);
			}
		}

		return converted;
	}
}
