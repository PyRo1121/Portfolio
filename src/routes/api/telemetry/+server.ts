import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { Effect, Either, Schema } from 'effect';
import type { RequestHandler } from './$types';
import { TelemetryPayloadSchema } from '$lib/domain/telemetry';
import { configuredOwnerEmail } from '$lib/server/owner-access';
import { insertTelemetryEvent } from '$lib/server/telemetry-store';

/**
 * Public telemetry beacon. The dashboard client sends page views, workspace
 * navigation, and Core Web Vitals here; the server enriches with the Cloudflare
 * country and persists an owner-scoped row. No cookies are used and raw IP
 * addresses are never stored.
 */
export const POST: RequestHandler = async ({ platform, request, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });

	if (platform === undefined) {
		return json({ ok: false, reason: 'Cloudflare bindings are unavailable.' }, { status: 503 });
	}
	const ownerEmail = configuredOwnerEmail(
		platform.env.CAREER_OWNER_EMAIL?.trim() || env['CAREER_OWNER_EMAIL']?.trim()
	);
	if (ownerEmail === null) {
		return json({ ok: false, reason: 'Owner telemetry scope is not configured.' }, { status: 503 });
	}

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return json({ ok: false, reason: 'Invalid JSON body.' }, { status: 400 });
	}
	const parsed = Schema.decodeUnknownEither(TelemetryPayloadSchema)(raw);
	if (Either.isLeft(parsed)) {
		return json({ ok: false, reason: 'Invalid telemetry payload.' }, { status: 400 });
	}

	const country = request.headers.get('cf-ipcountry')?.trim()?.toLocaleUpperCase() ?? null;
	const outcome = await Effect.runPromiseExit(
		insertTelemetryEvent(
			platform.env.OWNER_DB,
			ownerEmail,
			{ ...parsed.right, country },
			new Date()
		)
	);
	if (outcome._tag === 'Failure') {
		return json(
			{ ok: false, reason: 'Telemetry storage is temporarily unavailable.' },
			{ status: 503 }
		);
	}
	return json({ ok: true }, { status: 201 });
};
