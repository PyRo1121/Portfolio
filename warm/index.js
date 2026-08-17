/**
 * Scheduled warm-refresh Worker for the Weeknote dashboard.
 *
 * Pokes the main Worker's /__warm endpoint every 10 minutes so visitors
 * almost always land on a warm cache, reducing the 504 timeouts that occurred
 * when a request arrived while the GitHub snapshot was collecting.
 *
 * Uses a service binding (WEEKNOTE) to call the main Worker internally,
 * authenticated via a shared WARM_SECRET header.
 */
export default {
	/**
	 * @param {ScheduledController} _controller
	 * @param {{ WEEKNOTE: { fetch: typeof fetch }; WARM_SECRET: string }} env
	 * @param {ExecutionContext} ctx
	 */
	async scheduled(_controller, env) {
		const secret = env.WARM_SECRET;
		if (!secret) {
			console.error('weeknote-warm: WARM_SECRET is not configured.');
			return;
		}
		try {
			const response = await env.WEEKNOTE.fetch(
				new Request('https://weeknote.internal/__warm', {
					headers: { 'x-warm-secret': secret }
				})
			);
			const body = await response.text();
			console.log('weeknote-warm:', response.status, body.slice(0, 300));
		} catch (error) {
			console.error('weeknote-warm: refresh failed', error);
		}
	}
};
