import { Effect, Schema } from 'effect';
import { TelemetryPayloadSchema, type TelemetryPayload } from '$lib/domain/telemetry';

const MAX_TELEMETRY_BODY_BYTES = 16_384;

type TelemetryRequestFailure =
	'InvalidContentType' | 'InvalidJson' | 'InvalidOrigin' | 'InvalidPayload' | 'OversizedBody';

/** Expected rejection at the public telemetry HTTP boundary. */
export class TelemetryRequestError extends Error {
	readonly _tag = 'TelemetryRequestError';

	constructor(readonly reason: TelemetryRequestFailure) {
		super(`Telemetry request rejected: ${reason}`);
		this.name = 'TelemetryRequestError';
	}
}

async function readBoundedBody(request: Request): Promise<string> {
	const declaredLength = Number(request.headers.get('content-length'));
	if (Number.isFinite(declaredLength) && declaredLength > MAX_TELEMETRY_BODY_BYTES) {
		throw new TelemetryRequestError('OversizedBody');
	}
	if (request.body === null) return '';
	const reader = request.body.getReader();
	const decoder = new TextDecoder();
	let size = 0;
	let body = '';
	try {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) break;
			size += chunk.value.byteLength;
			if (size > MAX_TELEMETRY_BODY_BYTES) {
				await reader.cancel();
				throw new TelemetryRequestError('OversizedBody');
			}
			body += decoder.decode(chunk.value, { stream: true });
		}
		return body + decoder.decode();
	} finally {
		reader.releaseLock();
	}
}

/** Parse one same-origin, bounded JSON telemetry beacon into its domain variant. */
export function parseTelemetryRequest(
	request: Request
): Effect.Effect<TelemetryPayload, TelemetryRequestError> {
	const requestUrl = URL.parse(request.url);
	const origin = request.headers.get('origin');
	if (requestUrl === null || origin !== requestUrl.origin) {
		return Effect.fail(new TelemetryRequestError('InvalidOrigin'));
	}
	const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
	if (contentType !== 'application/json') {
		return Effect.fail(new TelemetryRequestError('InvalidContentType'));
	}
	return Effect.tryPromise({
		try: () => readBoundedBody(request),
		catch: (cause) =>
			cause instanceof TelemetryRequestError ? cause : new TelemetryRequestError('InvalidJson')
	}).pipe(
		Effect.flatMap((body) =>
			Effect.try({
				try: () => JSON.parse(body) as unknown,
				catch: () => new TelemetryRequestError('InvalidJson')
			})
		),
		Effect.flatMap((raw) =>
			Schema.decodeUnknown(TelemetryPayloadSchema)(raw).pipe(
				Effect.mapError(() => new TelemetryRequestError('InvalidPayload'))
			)
		)
	);
}
