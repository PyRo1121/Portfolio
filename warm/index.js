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
	async scheduled(controller, env) {
		const secret = env.WARM_SECRET;
		if (!secret) {
			throw new Error('weeknote-warm: WARM_SECRET is not configured.');
		}
		const maintenance = controller.cron === '15 0 * * *';
		const url = maintenance
			? 'https://weeknote.internal/__warm?maintenance=1'
			: 'https://weeknote.internal/__warm';
		const response = await env.WEEKNOTE.fetch(
			new Request(url, { headers: { 'x-warm-secret': secret } })
		);
		const body = await response.text();
		console.log(
			JSON.stringify({
				message: 'weeknote-warm response',
				cron: controller.cron,
				status: response.status,
				body: body.slice(0, 300)
			})
		);
		if (!response.ok) {
			throw new Error(`weeknote-warm: refresh returned HTTP ${response.status}.`);
		}
	}
};
