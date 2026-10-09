// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { nameof } from "@3sixty/nameof";
import { Span } from "./entities/span.js";
import { SpanEvent } from "./entities/spanEvent.js";
import { SpanLink } from "./entities/spanLink.js";

/**
 * Registers entity schemas for the tracing connector entity storage.
 */
export function initSchema(): void {
	EntitySchemaFactory.register(nameof<SpanEvent>(), () => EntitySchemaHelper.getSchema(SpanEvent));
	EntitySchemaFactory.register(nameof<SpanLink>(), () => EntitySchemaHelper.getSchema(SpanLink));
	EntitySchemaFactory.register(nameof<Span>(), () => EntitySchemaHelper.getSchema(Span));
}
