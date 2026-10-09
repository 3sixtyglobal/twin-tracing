// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpRequestContext } from "@3sixty/api-models";
import { GeneralError } from "@3sixty/core";
import { type ITracingSpanEndRequest, SpanKind, SpanStatus } from "@3sixty/tracing-models";
import { tracingSpanEnd } from "../src/tracingRoutes.js";

const TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";
const PATH_SPAN_ID = "00f067aa0ba902b7";
const BODY_SPAN_ID = "aabbccddeeff0011";

describe("tracingRoutes", () => {
	test("tracingSpanEnd rejects a path/body spanId mismatch", async () => {
		const request: ITracingSpanEndRequest = {
			pathParams: { spanId: PATH_SPAN_ID },
			body: {
				name: "process-order",
				kind: SpanKind.Internal,
				status: SpanStatus.Ok,
				context: { traceId: TRACE_ID, spanId: BODY_SPAN_ID, traceFlags: 1 },
				startTs: 1715252922273
			}
		};

		await expect(
			tracingSpanEnd({} as unknown as IHttpRequestContext, "tracing", request)
		).rejects.toThrow(GeneralError);
	});
});
