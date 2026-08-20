import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { Effect, Either } from 'effect';
import type { RequestHandler } from './$types';
import { configuredOwnerEmail } from '$lib/server/owner-access';
import { parseTelemetryRequest } from '$lib/server/telemetry-request';
import { insertTelemetryEvent } from '$lib/server/telemetry-store';

/**
 * Public telemetry beacon. The dashboard client sends page views, workspace
 * navigation, and Core Web Vitals here; the server enriches with the Cloudflare
 * country and persists an owner-scoped row. No cookies are used and raw IP
 * addresses are never stored.
 */
export const POST: RequestHandler = async ({ platform, request, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store', vary: 'Origin' });

	if (platform === undefined) {
		return json({ ok: false, reason: 'Cloudflare bindings are unavailable.' }, { status: 503 });
	}
	const rateLimitKey = request.headers.get('cf-connecting-ip')?.trim() || 'unknown-client';
	const rateLimit = await platform.env.TELEMETRY_RATE_LIMITER.limit({ key: rateLimitKey });
	if (!rateLimit.success) {
		setHeaders({ 'retry-after': '60' });
		return json({ ok: false, reason: 'Telemetry rate limit exceeded.' }, { status: 429 });
	}
	const ownerEmail = configuredOwnerEmail(
		platform.env.CAREER_OWNER_EMAIL?.trim() || env['CAREER_OWNER_EMAIL']?.trim()
	);
	if (ownerEmail === null) {
		return json({ ok: false, reason: 'Owner telemetry scope is not configured.' }, { status: 503 });
	}

	const parsed = await Effect.runPromise(Effect.either(parseTelemetryRequest(request)));
	if (Either.isLeft(parsed)) {
		const status =
			parsed.left.reason === 'InvalidOrigin'
				? 403
				: parsed.left.reason === 'InvalidContentType'
					? 415
					: parsed.left.reason === 'OversizedBody'
						? 413
						: 400;
		return json({ ok: false, reason: 'Telemetry request rejected.' }, { status });
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
