// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { SpanHelper } from "../src/helpers/spanHelper.js";
import { TraceparentHelper } from "../src/helpers/traceparentHelper.js";

const TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";
const SPAN_ID = "00f067aa0ba902b7";
const HEADER = `00-${TRACE_ID}-${SPAN_ID}-01`;

describe("TraceparentHelper", () => {
	test("parses a valid header", () => {
		expect(TraceparentHelper.parse(HEADER)).toEqual({
			traceId: TRACE_ID,
			spanId: SPAN_ID,
			traceFlags: 1
		});
	});

	test("parses the unsampled flag", () => {
		expect(TraceparentHelper.parse(`00-${TRACE_ID}-${SPAN_ID}-00`)?.traceFlags).toEqual(0);
	});

	test("tolerates surrounding whitespace", () => {
		expect(TraceparentHelper.parse(`  ${HEADER}  `)?.traceId).toEqual(TRACE_ID);
	});

	test("returns undefined for a missing or empty header", () => {
		expect(TraceparentHelper.parse()).toBeUndefined();
		expect(TraceparentHelper.parse("")).toBeUndefined();
	});

	test("returns undefined rather than throwing for malformed headers", () => {
		const malformed = [
			"not-a-traceparent",
			`00-${TRACE_ID}-${SPAN_ID}`,
			`00-${TRACE_ID}-${SPAN_ID}-01-extra`,
			`00-${TRACE_ID.slice(0, 31)}-${SPAN_ID}-01`,
			`00-${TRACE_ID}-${SPAN_ID.slice(0, 15)}-01`,
			`00-${TRACE_ID.toUpperCase()}-${SPAN_ID}-01`,
			`00-${"z".repeat(32)}-${SPAN_ID}-01`,
			`00-${TRACE_ID}-${SPAN_ID}-1`,
			`0-${TRACE_ID}-${SPAN_ID}-01`,
			`zz-${TRACE_ID}-${SPAN_ID}-01`
		];

		for (const header of malformed) {
			expect(TraceparentHelper.parse(header)).toBeUndefined();
		}
	});

	test("accepts a later version, which may only append fields", () => {
		expect(TraceparentHelper.parse(`01-${TRACE_ID}-${SPAN_ID}-01`)).toEqual({
			traceId: TRACE_ID,
			spanId: SPAN_ID,
			traceFlags: 1
		});

		expect(TraceparentHelper.parse(`01-${TRACE_ID}-${SPAN_ID}-01-future`)).toEqual({
			traceId: TRACE_ID,
			spanId: SPAN_ID,
			traceFlags: 1
		});
	});

	test("rejects the version the specification reserves as invalid", () => {
		expect(TraceparentHelper.parse(`ff-${TRACE_ID}-${SPAN_ID}-01`)).toBeUndefined();
	});

	test("builds a context from parts, defaulting the flags to sampled", () => {
		expect(TraceparentHelper.fromParts(TRACE_ID, SPAN_ID)).toEqual({
			traceId: TRACE_ID,
			spanId: SPAN_ID,
			traceFlags: 1
		});
	});

	test("rejects parts which are missing or malformed", () => {
		expect(TraceparentHelper.fromParts()).toBeUndefined();
		expect(TraceparentHelper.fromParts(TRACE_ID)).toBeUndefined();
		expect(TraceparentHelper.fromParts("rubbish", SPAN_ID)).toBeUndefined();
		expect(TraceparentHelper.fromParts(TRACE_ID, SPAN_ID, "1")).toBeUndefined();
	});

	test("rejects the all zero trace and span ids the specification marks invalid", () => {
		expect(TraceparentHelper.parse(`00-${"0".repeat(32)}-${SPAN_ID}-01`)).toBeUndefined();
		expect(TraceparentHelper.parse(`00-${TRACE_ID}-${"0".repeat(16)}-01`)).toBeUndefined();
	});

	test("formats a span context", () => {
		expect(TraceparentHelper.format({ traceId: TRACE_ID, spanId: SPAN_ID, traceFlags: 1 })).toEqual(
			HEADER
		);
	});

	test("pads the flags to two characters", () => {
		expect(TraceparentHelper.format({ traceId: TRACE_ID, spanId: SPAN_ID, traceFlags: 0 })).toEqual(
			`00-${TRACE_ID}-${SPAN_ID}-00`
		);
	});

	test("masks flags outside a single byte", () => {
		expect(
			TraceparentHelper.format({
				traceId: TRACE_ID,
				spanId: SPAN_ID,
				traceFlags: SpanHelper.MAX_TRACE_FLAGS + 2
			})
		).toEqual(`00-${TRACE_ID}-${SPAN_ID}-01`);
	});

	test("round trips a minted context", () => {
		const context = SpanHelper.createContext();

		expect(TraceparentHelper.parse(TraceparentHelper.format(context))).toEqual(context);
	});
});
