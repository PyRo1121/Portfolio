/// <reference types="@cloudflare/workers-types/experimental" />

import { DurableObject } from 'cloudflare:workers';
import { Schema } from 'effect';
import {
	AcquireRefreshLeaseRequestSchema,
	RefreshLeaseDecisionSchema,
	ReleaseRefreshLeaseRequestSchema,
	decideRefreshLease,
	releaseRefreshLease,
	type RefreshLeaseDecision,
	type StoredRefreshLease
} from '../src/lib/domain/refresh-lease';

type CoordinatorEnv = {
	readonly REFRESH_LEASES: DurableObjectNamespace<RefreshLeaseDurableObject>;
};

type LeaseRow = {
	readonly token: string;
	readonly expires_at: number;
};

/** Strongly consistent lease state for one hashed cache publication key. */
export class RefreshLeaseDurableObject extends DurableObject<CoordinatorEnv> {
	constructor(ctx: DurableObjectState, env: CoordinatorEnv) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => {
			this.ctx.storage.sql.exec(`
				CREATE TABLE IF NOT EXISTS refresh_lease (
					singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
					token TEXT NOT NULL,
					expires_at INTEGER NOT NULL
				)
			`);
		});
	}

	tryAcquire(nowMs: number, ttlMs: number): RefreshLeaseDecision {
		const current = this.#read();
		const token = crypto.randomUUID();
		const transition = decideRefreshLease(current, nowMs, ttlMs, token);
		if (transition.decision._tag === 'Acquired') {
			this.ctx.storage.sql.exec(
				`INSERT INTO refresh_lease (singleton, token, expires_at)
				 VALUES (1, ?, ?)
				 ON CONFLICT(singleton) DO UPDATE SET token = excluded.token, expires_at = excluded.expires_at`,
				transition.decision.token,
				transition.decision.expiresAt
			);
		}
		return transition.decision;
	}

	release(token: string): void {
		const current = this.#read();
		if (releaseRefreshLease(current, token) === null) {
			this.ctx.storage.sql.exec(
				'DELETE FROM refresh_lease WHERE singleton = 1 AND token = ?',
				token
			);
		}
	}

	#read(): StoredRefreshLease | null {
		const row = this.ctx.storage.sql
			.exec<LeaseRow>('SELECT token, expires_at FROM refresh_lease WHERE singleton = 1')
			.toArray()[0];
		return row === undefined ? null : { token: row.token, expiresAt: row.expires_at };
	}
}

async function parseBody(request: Request): Promise<unknown> {
	if (request.headers.get('content-type')?.split(';', 1)[0]?.trim() !== 'application/json') {
		throw new Error('Expected application/json.');
	}
	return request.json();
}

export default {
	async fetch(request: Request, env: CoordinatorEnv): Promise<Response> {
		if (request.method !== 'POST') return new Response('Method not allowed.', { status: 405 });
		const pathname = new URL(request.url).pathname;
		if (pathname === '/acquire') {
			let input;
			try {
				input = Schema.decodeUnknownSync(AcquireRefreshLeaseRequestSchema)(
					await parseBody(request)
				);
			} catch {
				return Response.json({ error: 'Invalid acquire request.' }, { status: 400 });
			}
			const stub = env.REFRESH_LEASES.getByName(input.key);
			const decision = Schema.decodeUnknownSync(RefreshLeaseDecisionSchema)(
				await stub.tryAcquire(Date.now(), input.ttlMs)
			);
			return Response.json(decision);
		}
		if (pathname === '/release') {
			let input;
			try {
				input = Schema.decodeUnknownSync(ReleaseRefreshLeaseRequestSchema)(
					await parseBody(request)
				);
			} catch {
				return Response.json({ error: 'Invalid release request.' }, { status: 400 });
			}
			const stub = env.REFRESH_LEASES.getByName(input.key);
			await stub.release(input.token);
			return new Response(null, { status: 204 });
		}
		return new Response('Not found.', { status: 404 });
	}
} satisfies ExportedHandler<CoordinatorEnv>;
