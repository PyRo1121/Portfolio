<script lang="ts">
	import { ChartBarIcon as ChartBar, UsersIcon as Users } from 'phosphor-svelte';
	import type { CloudflareUsageSnapshot } from '$lib/domain/cloudflare-usage';
	import type { TelemetryEvent } from '$lib/domain/telemetry';
	import type { TelemetryView } from '$lib/domain/telemetry-view';
	import { formatRelativeTime } from '$lib/presentation/dashboard-format';

	type Props = {
		readonly view: TelemetryView | null;
		readonly cloudflare: CloudflareUsageSnapshot | null;
		readonly referenceTime: string;
	};

	let { view, cloudflare, referenceTime }: Props = $props();

	function bar(share: number): string {
		return `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;
	}

	function vitalState(value: number | null, good: number, mid: number): string {
		if (value === null) return 'pending';
		return value <= good ? 'good' : value <= mid ? 'mid' : 'poor';
	}

	function vitalValue(value: number | null, unit: 'ms' | 'score'): string {
		if (value === null) return 'Awaiting sample';
		return unit === 'ms' ? `${Math.round(value)} ms` : value.toFixed(3);
	}

	function sampleLabel(count: number): string {
		return count === 0 ? 'No sample yet' : `${count} ${count === 1 ? 'sample' : 'samples'}`;
	}

	function detailLabel(label: string): string {
		return view?.detailsTruncated === true ? `${label} · sampled` : label;
	}

	function cloudflareMetric(id: 'workerRequests' | 'workerErrors'): string {
		const metric = cloudflare?.metrics.find((item) => item.id === id);
		return metric === undefined || metric.value === null
			? 'Awaiting measurement'
			: metric.value.toLocaleString();
	}

	function eventLabel(event: TelemetryEvent): string {
		if (event.eventType === 'web_vital') return `${event.metricName} ${event.metricValue}`;
		if (event.eventType === 'workspace_view') return event.workspace ?? 'workspace';
		if (event.eventType === 'contact_action') {
			return (event.metricName ?? 'contact action').replaceAll('_', ' ');
		}
		if (event.eventType === 'portfolio_action') {
			return (event.metricName ?? 'portfolio action').replaceAll('_', ' ');
		}
		if (event.eventType === 'error') return event.metricName ?? 'runtime error';
		return 'page view';
	}
</script>

<div class="telemetry-screen">
	<header class="telemetry-overview">
		<div>
			<span><ChartBar size={14} weight="fill" /> Visitor telemetry</span>
			<h1>Visitors</h1>
			<p>
				Cookieless page, workspace, portfolio-action, contact-action, and Core Web Vitals evidence.
			</p>
		</div>
		{#if view !== null}
			<section aria-label="Visitor summary">
				<div><strong>{view.pageViews}</strong><span>page views</span></div>
				<div><strong>{view.uniqueSessions}</strong><span>sessions</span></div>
				<div><strong>{view.workspaceViews}</strong><span>workspace views</span></div>
				<div><strong>{view.portfolioActions}</strong><span>portfolio actions</span></div>
				<div><strong>{view.contactActions}</strong><span>contact actions</span></div>
				<div>
					<strong
						>{view.lastRecordedAt === null
							? '—'
							: formatRelativeTime(view.lastRecordedAt, referenceTime)}</strong
					><span>last signal</span>
				</div>
			</section>
		{:else}
			<section class="telemetry-empty"><span>No telemetry collected yet.</span></section>
		{/if}
	</header>

	{#if view !== null}
		<section class="telemetry-vitals">
			<header>
				<span>Core Web Vitals</span><small>{detailLabel('Measured beacons · browser')}</small>
			</header>
			<div class="vital-grid">
				<div class={vitalState(view.vitals.lcpMs, 2500, 4000)}>
					<span>LCP</span><strong>{vitalValue(view.vitals.lcpMs, 'ms')}</strong><small
						>{sampleLabel(view.vitals.lcpCount)}</small
					>
				</div>
				<div class={vitalState(view.vitals.fcpMs, 1800, 3000)}>
					<span>FCP</span><strong>{vitalValue(view.vitals.fcpMs, 'ms')}</strong><small
						>{sampleLabel(view.vitals.fcpCount)}</small
					>
				</div>
				<div class={vitalState(view.vitals.ttfbMs, 800, 1800)}>
					<span>TTFB</span><strong>{vitalValue(view.vitals.ttfbMs, 'ms')}</strong><small
						>{sampleLabel(view.vitals.ttfbCount)}</small
					>
				</div>
				<div class={vitalState(view.vitals.inpMs, 200, 500)}>
					<span>INP</span><strong>{vitalValue(view.vitals.inpMs, 'ms')}</strong><small
						>{sampleLabel(view.vitals.inpCount)}</small
					>
				</div>
				<div class={vitalState(view.vitals.cls, 0.1, 0.25)}>
					<span>CLS</span><strong>{vitalValue(view.vitals.cls, 'score')}</strong><small
						>{sampleLabel(view.vitals.clsCount)}</small
					>
				</div>
				<div class="vital-coverage">
					<span>Coverage</span>
					<strong
						>{view.performanceCoveragePercent === null
							? 'Awaiting sample'
							: `${view.performanceCoveragePercent}%`}</strong
					>
					<small
						>{view.performanceSessions} performance sessions · {view.errorCount} telemetry errors</small
					>
				</div>
			</div>
		</section>

		<div class="telemetry-grid">
			<section class="telemetry-panel" aria-labelledby="telemetry-paths">
				<header>
					<span id="telemetry-paths">Pages</span><small>{detailLabel('Most visited')}</small>
				</header>
				{#each view.paths as item (item.label)}
					<div class="bar-row">
						<span class="bar-label">{item.label}</span>
						<i class="bar-track"><b style="width:{bar(item.share)}"></b></i>
						<span class="bar-count">{item.count}</span>
					</div>
				{:else}<p class="empty">No page views recorded.</p>{/each}
			</section>

			<section class="telemetry-panel" aria-labelledby="telemetry-workspaces">
				<header>
					<span id="telemetry-workspaces">Workspaces</span><small
						>{detailLabel('Dashboard sections')}</small
					>
				</header>
				{#each view.workspaces as item (item.label)}
					<div class="bar-row">
						<span class="bar-label">{item.label}</span>
						<i class="bar-track"><b style="width:{bar(item.share)}"></b></i>
						<span class="bar-count">{item.count}</span>
					</div>
				{:else}<p class="empty">No workspace navigation recorded.</p>{/each}
			</section>

			<section class="telemetry-panel" aria-labelledby="telemetry-countries">
				<header>
					<span id="telemetry-countries">Countries</span><small
						>{detailLabel('Cloudflare edge')}</small
					>
				</header>
				{#each view.countries as item (item.label)}
					<div class="bar-row">
						<span class="bar-label">{item.label}</span>
						<i class="bar-track"><b style="width:{bar(item.share)}"></b></i>
						<span class="bar-count">{item.count}</span>
					</div>
				{:else}<p class="empty">No country evidence yet.</p>{/each}
			</section>

			<section class="telemetry-panel" aria-labelledby="telemetry-devices">
				<header>
					<span id="telemetry-devices">Devices</span><small>{detailLabel('User agent class')}</small
					>
				</header>
				{#each view.devices as item (item.label)}
					<div class="bar-row">
						<span class="bar-label">{item.label}</span>
						<i class="bar-track"><b style="width:{bar(item.share)}"></b></i>
						<span class="bar-count">{item.count}</span>
					</div>
				{:else}<p class="empty">No device evidence yet.</p>{/each}
			</section>

			<section class="telemetry-panel" aria-labelledby="telemetry-referrers">
				<header>
					<span id="telemetry-referrers">Referrers</span><small
						>{detailLabel('Page-entry hosts')}</small
					>
				</header>
				{#each view.referrers as item (item.label)}
					<div class="bar-row">
						<span class="bar-label">{item.label}</span>
						<i class="bar-track"><b style="width:{bar(item.share)}"></b></i>
						<span class="bar-count">{item.count}</span>
					</div>
				{:else}<p class="empty">No referrer evidence yet.</p>{/each}
			</section>

			<section class="telemetry-panel" aria-labelledby="telemetry-browsers">
				<header>
					<span id="telemetry-browsers">Browsers</span><small
						>{detailLabel('Page-entry user agents')}</small
					>
				</header>
				{#each view.browsers as item (item.label)}
					<div class="bar-row">
						<span class="bar-label">{item.label}</span>
						<i class="bar-track"><b style="width:{bar(item.share)}"></b></i>
						<span class="bar-count">{item.count}</span>
					</div>
				{:else}<p class="empty">No browser evidence yet.</p>{/each}
			</section>

			<section class="telemetry-panel" aria-labelledby="telemetry-hours">
				<header>
					<span id="telemetry-hours">Hours</span><small>{detailLabel('UTC · page entries')}</small>
				</header>
				{#each view.hours as item (item.label)}
					<div class="bar-row">
						<span class="bar-label">{item.label}</span>
						<i class="bar-track"><b style="width:{bar(item.share)}"></b></i>
						<span class="bar-count">{item.count}</span>
					</div>
				{:else}<p class="empty">No hour evidence yet.</p>{/each}
			</section>

			<section class="telemetry-panel telemetry-contact" aria-labelledby="telemetry-contact">
				<header>
					<span id="telemetry-contact">Recruiter actions</span><small>Complete 30-day window</small>
				</header>
				<div class="boundary-metrics">
					<div><span>Email clicks</span><strong>{view.emailClicks}</strong></div>
					<div><span>LinkedIn clicks</span><strong>{view.linkedinClicks}</strong></div>
					<div><span>Contact sessions</span><strong>{view.contactSessions}</strong></div>
					<div>
						<span>Session action rate</span>
						<strong
							>{view.contactActionRatePercent === null
								? 'Awaiting traffic'
								: `${view.contactActionRatePercent}%`}</strong
						>
					</div>
				</div>
				<p>Clicks are observed actions; they do not prove that a message was sent.</p>
			</section>

			<section class="telemetry-panel telemetry-portfolio" aria-labelledby="telemetry-portfolio">
				<header>
					<span id="telemetry-portfolio">Portfolio paths</span><small>Complete 30-day window</small>
				</header>
				<div class="boundary-metrics">
					<div><span>OMG opens</span><strong>{view.featuredOmgOpens}</strong></div>
					<div><span>Weeknote opens</span><strong>{view.featuredWeeknoteOpens}</strong></div>
					<div><span>Evidence opens</span><strong>{view.liveEvidenceOpens}</strong></div>
					<div><span>Action sessions</span><strong>{view.portfolioSessions}</strong></div>
				</div>
				<p>Actions show chosen destinations; page views remain the evidence that a route loaded.</p>
			</section>

			<section class="telemetry-panel telemetry-recent" aria-labelledby="telemetry-recent">
				<header>
					<span id="telemetry-recent">Recent events</span><small>Latest beacons</small>
				</header>
				<div class="recent-list">
					{#each view.recent as event (event.id)}
						<article>
							<span class="event-kind">{event.eventType}</span>
							<strong>{eventLabel(event)}</strong>
							<small
								>{event.country ?? 'Unreported'} · {formatRelativeTime(
									event.recordedAt,
									referenceTime
								)}</small
							>
						</article>
					{:else}<p class="empty">No beacons received yet.</p>{/each}
				</div>
			</section>

			<section class="telemetry-panel telemetry-cloudflare" aria-labelledby="telemetry-cloudflare">
				<header>
					<span id="telemetry-cloudflare">Cloudflare request boundary</span><small
						>Account-wide · not unique visitors</small
					>
				</header>
				<div class="boundary-metrics">
					<div>
						<span>Worker requests</span><strong>{cloudflareMetric('workerRequests')}</strong>
					</div>
					<div><span>Worker errors</span><strong>{cloudflareMetric('workerErrors')}</strong></div>
				</div>
				<p>
					{cloudflare === null
						? 'Cloudflare usage snapshot is unavailable.'
						: 'Includes Worker traffic and internal fetches; use browser beacons above for page-entry evidence.'}
				</p>
			</section>

			<section class="telemetry-panel telemetry-boundary" aria-labelledby="telemetry-boundary">
				<header>
					<span id="telemetry-boundary">Collection boundary</span><small>How to read this</small>
				</header>
				<dl>
					<div>
						<dt>Source</dt>
						<dd>Browser beacons</dd>
					</div>
					<div>
						<dt>Retention</dt>
						<dd>30 days · {view.totalEvents} events</dd>
					</div>
					<div>
						<dt>Completeness</dt>
						<dd>
							{view.detailsTruncated
								? 'Complete totals; breakdowns sample the newest 5,000 events'
								: 'Complete 30-day window'}
						</dd>
					</div>
					<div>
						<dt>Edge enrichment</dt>
						<dd>Country from Cloudflare</dd>
					</div>
					<div>
						<dt>Excluded</dt>
						<dd>Cookies, raw IPs, full user agents</dd>
					</div>
					<div>
						<dt>Separate evidence</dt>
						<dd>Cloudflare edge traffic is not mixed into page views</dd>
					</div>
				</dl>
			</section>
		</div>
	{:else}
		<p class="telemetry-missing">
			<Users size={18} /> Start browsing the public site to collect the first beacon.
		</p>
	{/if}
</div>

<style>
	.telemetry-screen {
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr);
		gap: 1px;
		height: 100%;
		min-height: 0;
		background: var(--line);
		border: 1px solid var(--line);
	}
	.telemetry-overview {
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 1rem 1.25rem;
		background: var(--surface);
	}
	.telemetry-overview > div span {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font: 600 0.6rem/1 var(--mono);
		color: var(--accent);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.telemetry-overview h1 {
		margin: 0.35rem 0 0.2rem;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.03em;
	}
	.telemetry-overview p {
		margin: 0;
		color: var(--muted);
		font-size: 0.8rem;
	}
	.telemetry-overview section {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0;
		align-items: stretch;
		min-width: min(100%, 44rem);
	}
	.telemetry-overview section > div {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
		padding: 0.5rem 0.75rem;
		border-left: 1px solid var(--line);
	}
	.telemetry-overview section strong {
		font: 700 1.3rem/1 var(--mono);
	}
	.telemetry-overview section span {
		color: var(--muted);
		font-size: 0.68rem;
	}
	.telemetry-empty,
	.telemetry-missing {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--muted);
		font-size: 0.8rem;
	}
	.telemetry-vitals {
		padding: 0.9rem 1.25rem;
		background: var(--surface);
	}
	.telemetry-vitals > header,
	.telemetry-panel > header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.telemetry-vitals > header span,
	.telemetry-panel > header span {
		font-weight: 650;
		font-size: 0.82rem;
	}
	.telemetry-vitals > header small,
	.telemetry-panel > header small {
		color: var(--muted);
		font: 450 0.6rem/1 var(--mono);
	}
	.vital-grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 1rem;
		margin-top: 0.7rem;
	}
	.vital-grid > div {
		display: grid;
		gap: 0.15rem;
		padding: 0.6rem 0.8rem;
		border: 1px solid var(--line);
		background: var(--surface-deep);
	}
	.vital-grid span {
		color: var(--muted);
		font: 600 0.62rem/1 var(--mono);
	}
	.vital-grid strong {
		font: 700 1.4rem/1 var(--mono);
	}
	.vital-grid small {
		color: var(--faint);
		font-size: 0.65rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.vital-grid .pending strong {
		color: var(--muted);
		font-size: 0.95rem;
	}
	.vital-coverage strong {
		color: var(--accent);
	}
	.vital-grid .good strong {
		color: var(--positive);
	}
	.vital-grid .mid strong {
		color: var(--accent);
	}
	.vital-grid .poor strong {
		color: var(--negative);
	}
	.telemetry-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		grid-auto-rows: minmax(8rem, 1fr);
		gap: 1px;
		overflow: auto;
		min-height: 0;
		background: var(--line);
	}
	.telemetry-panel {
		min-width: 0;
		padding: 0.9rem 1.1rem;
		background: var(--surface);
	}
	.bar-row {
		display: grid;
		grid-template-columns: minmax(4rem, 8rem) minmax(0, 1fr) 2.5rem;
		align-items: center;
		gap: 0.6rem;
		margin-top: 0.5rem;
	}
	.bar-label {
		font-size: 0.75rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.bar-track {
		display: block;
		height: 0.45rem;
		background: var(--high);
	}
	.bar-track b {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.bar-count {
		text-align: right;
		font: 600 0.72rem/1 var(--mono);
	}
	.empty {
		margin: 0.8rem 0 0;
		color: var(--faint);
		font-size: 0.75rem;
	}
	.recent-list {
		display: grid;
		gap: 0.4rem;
		margin-top: 0.6rem;
		max-height: 16rem;
		overflow: auto;
	}
	.recent-list article {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.6rem;
		padding: 0.35rem 0.4rem;
		border-bottom: 1px solid var(--line);
	}
	.recent-list strong {
		font-size: 0.75rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.recent-list small {
		color: var(--muted);
		font: 450 0.6rem/1 var(--mono);
	}
	.event-kind {
		font: 600 0.58rem/1 var(--mono);
		color: var(--accent);
	}
	.boundary-metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.7rem;
		margin-top: 0.7rem;
	}
	.boundary-metrics div {
		display: grid;
		gap: 0.25rem;
		padding: 0.65rem;
		border: 1px solid var(--line);
		background: var(--surface-deep);
	}
	.boundary-metrics span {
		color: var(--muted);
		font: 600 0.6rem/1.2 var(--mono);
		text-transform: uppercase;
	}
	.boundary-metrics strong {
		font: 700 1.1rem/1 var(--mono);
	}
	.telemetry-cloudflare p,
	.telemetry-contact p,
	.telemetry-portfolio p {
		margin: 0.7rem 0 0;
		color: var(--muted);
		font-size: 0.68rem;
		line-height: 1.4;
	}
	.telemetry-boundary dl {
		display: grid;
		gap: 0.42rem;
		margin: 0.7rem 0 0;
	}
	.telemetry-boundary dl div {
		display: grid;
		grid-template-columns: 6rem minmax(0, 1fr);
		gap: 0.6rem;
		padding-bottom: 0.35rem;
		border-bottom: 1px solid var(--line);
	}
	.telemetry-boundary dt {
		color: var(--muted);
		font: 600 0.6rem/1.2 var(--mono);
		text-transform: uppercase;
	}
	.telemetry-boundary dd {
		margin: 0;
		color: var(--ink);
		font-size: 0.7rem;
	}
	@media (max-width: 900px) {
		.telemetry-grid {
			grid-template-columns: 1fr 1fr;
		}
		.vital-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (max-width: 640px) {
		.telemetry-grid {
			grid-template-columns: 1fr;
		}
		.telemetry-overview {
			flex-direction: column;
			gap: 0.8rem;
		}
		.telemetry-overview section {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			min-width: 0;
		}
		.vital-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
