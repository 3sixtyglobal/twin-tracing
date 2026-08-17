// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestClientProcessorContext } from "@twin.org/api-models";
import { ContextIdStore } from "@twin.org/context";
import { ComponentFactory, GeneralError } from "@twin.org/core";
import {
	SpanHelper,
	SpanKind,
	SpanStatus,
	TraceparentHelper,
	TracingHelper,
	type ISpan,
	type ISpanOptions,
	type ITracingComponent
} from "@twin.org/tracing-models";
import { HttpMethod, HttpStatusCode } from "@twin.org/web";
import { TracingRestClientProcessor } from "../src/tracingRestClientProcessor.js";

let ended: { span: ISpan; status?: SpanStatus }[] = [];

class TestTracingComponent implements ITracingComponent {
	public className(): string {
		return "TestTracingComponent";
	}

	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		return SpanHelper.startSpan(name, options);
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

function makeContext(
	route: string = "/blob",
	routeTemplate: string = route
): IRestClientProcessorContext {
	return {
		restClientClassName: "BlobStorageClient",
		baseUrl: "https://example.com",
		routeTemplate,
		route,
		method: HttpMethod.GET,
		headers: {}
	};
}

function makeNext(status: number = HttpStatusCode.ok): () => Promise<Response> {
	return async () => ({ status }) as Response;
}

describe("TracingRestClientProcessor", () => {
	beforeEach(() => {
		ended = [];
		ComponentFactory.register("tracing", () => new TestTracingComponent());
	});

	afterEach(() => {
		ComponentFactory.unregister("tracing");
	});

	test("can construct", () => {
		const processor = new TracingRestClientProcessor({ tracingComponentType: "tracing" });

		expect(processor.className()).toEqual("TracingRestClientProcessor");
	});

	test("records a client span around the request", async () => {
		const processor = new TracingRestClientProcessor({ tracingComponentType: "tracing" });

		await processor.pre(makeContext(), makeNext());

		expect(ended).toHaveLength(1);
		expect(ended[0].span.kind).toEqual(SpanKind.Client);
		expect(ended[0].status).toEqual(SpanStatus.Ok);
		expect(ended[0].span.attributes?.["http.method"]).toEqual(HttpMethod.GET);
		expect(ended[0].span.attributes?.["http.route"]).toEqual("/blob");
	});

	test("names the span from the client and the route", async () => {
		const processor = new TracingRestClientProcessor({ tracingComponentType: "tracing" });

		await processor.pre(makeContext(), makeNext());

		expect(ended[0].span.name).toEqual("BlobStorageClient/blob");
	});

	test("separates the client and the route when the route has no leading slash", async () => {
		const processor = new TracingRestClientProcessor({ tracingComponentType: "tracing" });

		await processor.pre(makeContext("blob"), makeNext());

		expect(ended[0].span.name).toEqual("BlobStorageClient/blob");
	});

	test("sends the span as a traceparent so the service continues the trace", async () => {
		const processor = new TracingRestClientProcessor({ tracingComponentType: "tracing" });
		const context = makeContext();

		await processor.pre(context, makeNext());

		const header = context.headers[TraceparentHelper.HEADER_NAME];
		expect(TraceparentHelper.parse(header as string)).toEqual(ended[0].span.context);
	});

	test("continues the trace which is in scope", async () => {
		const processor = new TracingRestClientProcessor({ tracingComponentType: "tracing" });
		const parent = SpanHelper.createContext();

		await ContextIdStore.run(TracingHelper.spanContextToContextIds(parent), async () => {
			await processor.pre(makeContext(), makeNext());
		});

		expect(ended[0].span.context.traceId).toEqual(parent.traceId);
		expect(ended[0].span.parentSpanId).toEqual(parent.spanId);
	});

	test("records the status code of the response", async () => {
		const processor = new TracingRestClientProcessor({ tracingComponentType: "tracing" });

		await processor.pre(makeContext(), makeNext(HttpStatusCode.notFound));

		expect(ended[0].span.attributes?.["http.status_code"]).toEqual(HttpStatusCode.notFound);
	});

	test("returns the response from the request untouched", async () => {
		const processor = new TracingRestClientProcessor({ tracingComponentType: "tracing" });
		const response = { status: HttpStatusCode.created } as Response;

		expect(await processor.pre(makeContext(), async () => response)).toBe(response);
	});

	test("ends the span with error and rethrows when the request fails", async () => {
		const processor = new TracingRestClientProcessor({ tracingComponentType: "tracing" });

		await expect(
			processor.pre(makeContext(), async () => {
				throw new GeneralError("test", "boom");
			})
		).rejects.toThrow(GeneralError);

		expect(ended).toHaveLength(1);
		expect(ended[0].status).toEqual(SpanStatus.Error);
		expect(ended[0].span.attributes?.["exception.message"]).toEqual("test.boom");
	});

	test("skips a route template listed in excludeRouteTemplates", async () => {
		const processor = new TracingRestClientProcessor({
			tracingComponentType: "tracing",
			config: { excludePaths: ["/tracing/:traceId"] }
		});
		const context = makeContext("/tracing/abc123", "/tracing/:traceId");

		const response = await processor.pre(context, makeNext());

		expect(response.status).toEqual(HttpStatusCode.ok);
		expect(context.headers[TraceparentHelper.HEADER_NAME]).toBeUndefined();
		expect(ended).toHaveLength(0);
	});

	test("does not skip a route template that is not excluded", async () => {
		const processor = new TracingRestClientProcessor({
			tracingComponentType: "tracing",
			config: { excludePaths: ["/tracing/:traceId"] }
		});

		await processor.pre(makeContext("/blob/abc123", "/blob/:id"), makeNext());

		expect(ended).toHaveLength(1);
	});

	test("performs the request unchanged when there is no tracing component", async () => {
		const processor = new TracingRestClientProcessor();
		const context = makeContext();

		const response = await processor.pre(context, makeNext());

		expect(response.status).toEqual(HttpStatusCode.ok);
		expect(context.headers[TraceparentHelper.HEADER_NAME]).toBeUndefined();
		expect(ended).toHaveLength(0);
	});
});
