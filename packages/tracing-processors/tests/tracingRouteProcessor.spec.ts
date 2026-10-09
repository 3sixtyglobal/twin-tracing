// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpResponse, IHttpServerRequest } from "@3sixty/api-models";
import type { IContextIds } from "@3sixty/context";
import { ComponentFactory } from "@3sixty/core";
import {
	SpanHelper,
	SpanKind,
	SpanStatus,
	TracingContextIdKeys,
	type ISpan,
	type ISpanOptions,
	type ITracingComponent
} from "@3sixty/tracing-models";
import { HttpMethod, HttpStatusCode } from "@3sixty/web";
import { TracingRouteProcessor } from "../src/tracingRouteProcessor.js";

const TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";
const SPAN_ID = "00f067aa0ba902b7";

let started: ISpan[] = [];
let ended: { span: ISpan; status?: SpanStatus }[] = [];

class TestTracingComponent implements ITracingComponent {
	public className(): string {
		return "TestTracingComponent";
	}

	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		const span = SpanHelper.startSpan(name, options);
		started.push(span);
		return span;
	}

	public async endSpan(span: ISpan, status?: SpanStatus): Promise<void> {
		SpanHelper.endSpan(span, status);
		ended.push({ span, status });
	}

	public async query(): Promise<{ entities: ISpan[]; cursor?: string }> {
		return { entities: [] };
	}

	public async getTrace(): Promise<ISpan[]> {
		return [];
	}
}

function makeRequest(
	url: string = "/blob",
	headers: { [id: string]: string } = {}
): IHttpServerRequest {
	return { url, method: HttpMethod.GET, headers };
}

function makeResponse(statusCode?: HttpStatusCode): IHttpResponse {
	return { statusCode, headers: {}, body: {} };
}

describe("TracingRouteProcessor", () => {
	beforeEach(() => {
		started = [];
		ended = [];
		ComponentFactory.register("tracing", () => new TestTracingComponent());
	});

	afterEach(() => {
		ComponentFactory.unregister("tracing");
	});

	function makeProcessor(): TracingRouteProcessor {
		return new TracingRouteProcessor({ tracingComponentType: "tracing" });
	}

	test("can construct", () => {
		const processor = makeProcessor();
		expect(processor.className()).toEqual("TracingRouteProcessor");
	});

	test("starts a server span and ends it with ok", async () => {
		const processor = makeProcessor();
		const state: { [id: string]: unknown } = {};
		const request = makeRequest();
		const response = makeResponse(HttpStatusCode.ok);

		await processor.pre(
			request,
			response,
			{ path: "/blob", method: HttpMethod.GET } as never,
			{},
			state
		);
		await processor.post(request, response, undefined, {}, state);

		expect(started).toHaveLength(1);
		expect(started[0].kind).toEqual(SpanKind.Server);
		expect(started[0].name).toEqual("/blob");
		expect(started[0].attributes?.["http.method"]).toEqual(HttpMethod.GET);
		expect(started[0].attributes?.["http.route"]).toEqual("/blob");
		expect(ended).toHaveLength(1);
		expect(ended[0].status).toEqual(SpanStatus.Ok);
		expect(ended[0].span.attributes?.["http.status_code"]).toEqual(HttpStatusCode.ok);
	});

	test("prefers the operation id for the span name", async () => {
		const processor = makeProcessor();
		const state: { [id: string]: unknown } = {};

		await processor.pre(
			makeRequest(),
			makeResponse(),
			{ path: "/blob/:id", operationId: "blobStorageGet" },
			{},
			state
		);

		expect(started[0].name).toEqual("blobStorageGet");
	});

	test("continues the trace from an inbound traceparent", async () => {
		const processor = makeProcessor();
		const state: { [id: string]: unknown } = {};

		await processor.pre(
			makeRequest("/blob", { traceparent: `00-${TRACE_ID}-${SPAN_ID}-01` }),
			makeResponse(),
			undefined,
			{},
			state
		);

		expect(started[0].context.traceId).toEqual(TRACE_ID);
		expect(started[0].parentSpanId).toEqual(SPAN_ID);
	});

	test("starts a new trace when the inbound traceparent is malformed", async () => {
		const processor = makeProcessor();
		const state: { [id: string]: unknown } = {};

		await processor.pre(
			makeRequest("/blob", { traceparent: "rubbish" }),
			makeResponse(),
			undefined,
			{},
			state
		);

		expect(started[0].parentSpanId).toBeUndefined();
		expect(started[0].context.traceId).not.toEqual(TRACE_ID);
	});

	test("writes the span ids into the context so the handler becomes a child", async () => {
		const processor = makeProcessor();
		const state: { [id: string]: unknown } = {};
		const contextIds: IContextIds = {};

		await processor.pre(makeRequest(), makeResponse(), undefined, contextIds, state);

		expect(contextIds[TracingContextIdKeys.TraceId]).toEqual(started[0].context.traceId);
		expect(contextIds[TracingContextIdKeys.SpanId]).toEqual(started[0].context.spanId);
	});

	test("ends the span with error for a failure status", async () => {
		const processor = makeProcessor();
		const state: { [id: string]: unknown } = {};
		const request = makeRequest();

		await processor.pre(request, makeResponse(), undefined, {}, state);
		await processor.post(
			request,
			makeResponse(HttpStatusCode.internalServerError),
			undefined,
			{},
			state
		);

		expect(ended[0].status).toEqual(SpanStatus.Error);
	});

	test("treats an unset status code as success", async () => {
		const processor = makeProcessor();
		const state: { [id: string]: unknown } = {};
		const request = makeRequest();

		await processor.pre(request, makeResponse(), undefined, {}, state);
		await processor.post(request, makeResponse(undefined), undefined, {}, state);

		expect(ended[0].status).toEqual(SpanStatus.Ok);
		expect(ended[0].span.attributes?.["http.status_code"]).toEqual(HttpStatusCode.ok);
	});

	test("does nothing when there is no tracing component", async () => {
		const processor = new TracingRouteProcessor();
		const state: { [id: string]: unknown } = {};
		const request = makeRequest();

		await processor.pre(request, makeResponse(), undefined, {}, state);
		await processor.post(request, makeResponse(), undefined, {}, state);

		expect(started).toHaveLength(0);
		expect(ended).toHaveLength(0);
	});

	test("skips excluded paths so reading spans does not create spans", async () => {
		const processor = makeProcessor();
		const state: { [id: string]: unknown } = {};
		const request = makeRequest("/tracing/trace/abc");

		await processor.pre(
			request,
			makeResponse(),
			{ path: "/tracing", method: HttpMethod.GET } as never,
			{},
			state
		);
		await processor.post(request, makeResponse(), undefined, {}, state);

		expect(started).toHaveLength(0);
		expect(ended).toHaveLength(0);
	});

	test("skips a templated path when it is listed in excludePaths", async () => {
		const processor = new TracingRouteProcessor({
			tracingComponentType: "tracing",
			config: { excludePaths: ["/tracing/:traceId"] }
		});
		const state: { [id: string]: unknown } = {};
		const request = makeRequest("/tracing/abc123");

		await processor.pre(
			request,
			makeResponse(),
			{ path: "/tracing/:traceId", method: HttpMethod.GET } as never,
			{},
			state
		);
		await processor.post(request, makeResponse(), undefined, {}, state);

		expect(started).toHaveLength(0);
		expect(ended).toHaveLength(0);
	});

	test("skips a route when its operationId is listed in excludeOperationIds", async () => {
		const processor = new TracingRouteProcessor({
			tracingComponentType: "tracing",
			config: { excludeOperationIds: ["tracingGetTrace"] }
		});
		const state: { [id: string]: unknown } = {};
		const request = makeRequest("/tracing/abc123");

		await processor.pre(
			request,
			makeResponse(),
			{
				path: "/tracing/:traceId",
				operationId: "tracingGetTrace",
				method: HttpMethod.GET
			} as never,
			{},
			state
		);
		await processor.post(request, makeResponse(), undefined, {}, state);

		expect(started).toHaveLength(0);
		expect(ended).toHaveLength(0);
	});

	test("post without a preceding pre is a no-op", async () => {
		const processor = makeProcessor();

		await processor.post(makeRequest(), makeResponse(), undefined, {}, {});

		expect(ended).toHaveLength(0);
	});
});
