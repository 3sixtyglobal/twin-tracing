// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { GuardError } from "@twin.org/core";
import { type ISpan, SpanKind, SpanStatus } from "@twin.org/tracing-models";
import { HttpMethod } from "@twin.org/web";
import { TracingRestClient } from "../src/tracingRestClient.js";
import {
	jsonResponse,
	noContentResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";

// OpenAPI spec: ../../tracing-service/docs/open-api/spec.json
const ENDPOINT = "http://localhost:8080";
const PREFIX = "tracing";
const TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";
const SPAN_ID = "00f067aa0ba902b7";

const TEST_SPAN: ISpan = {
	name: "process-order",
	kind: SpanKind.Internal,
	status: SpanStatus.Ok,
	context: {
		traceId: TRACE_ID,
		spanId: SPAN_ID,
		traceFlags: 1
	},
	startTs: 1700000000000,
	endTs: 1700000000239,
	durationMs: 239
};

const fetchMock = vi.fn();

describe("TracingRestClient", () => {
	let client: TracingRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new TracingRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	describe("startSpan", () => {
		test("throws when name is undefined", async () => {
			await expect(client.startSpan(undefined as never)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME
			});
		});

		test("sends POST to /{prefix} and returns the started span", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_SPAN));

			const span = await client.startSpan("process-order", { kind: SpanKind.Internal });

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}`);
			expect(options.method).toBe(HttpMethod.POST);
			const body = JSON.parse(options.body);
			expect(body.name).toBe("process-order");
			expect(span.context.spanId).toBe(SPAN_ID);
		});
	});

	describe("endSpan", () => {
		test("throws when span is undefined", async () => {
			await expect(client.endSpan(undefined as never)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME
			});
		});

		test("sends PUT to /{prefix}/{spanId} with the span as the body", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.endSpan(TEST_SPAN, SpanStatus.Error);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/${SPAN_ID}`);
			expect(options.method).toBe(HttpMethod.PUT);
			const body = JSON.parse(options.body);
			expect(body.status).toBe(SpanStatus.Error);
		});
	});

	describe("query", () => {
		test("sends GET to /{prefix}", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ entities: [TEST_SPAN] }));

			const result = await client.query();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}`);
			expect(options.method).toBe(HttpMethod.GET);
			expect(result.entities).toEqual([TEST_SPAN]);
		});

		test("includes filters as query parameters when provided", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ entities: [] }));

			await client.query(TRACE_ID, SPAN_ID, SpanStatus.Ok, SpanKind.Server, 100, 200, "page2", 10);

			const [url] = fetchMock.mock.calls[0];
			expect(url).toContain(`traceId=${TRACE_ID}`);
			expect(url).toContain(`spanId=${SPAN_ID}`);
			expect(url).toContain("status=ok");
			expect(url).toContain("kind=server");
			expect(url).toContain("timeStart=100");
			expect(url).toContain("timeEnd=200");
			expect(url).toContain("cursor=page2");
			expect(url).toContain("limit=10");
		});
	});

	describe("getTrace", () => {
		test("sends GET to /{prefix}/trace/{traceId} and returns the spans", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ spans: [TEST_SPAN] }));

			const spans = await client.getTrace(TRACE_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/trace/${TRACE_ID}`);
			expect(options.method).toBe(HttpMethod.GET);
			expect(spans).toEqual([TEST_SPAN]);
		});
	});
});
