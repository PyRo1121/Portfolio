<script lang="ts">
	import { ChartBarIcon as ChartBar, UsersIcon as Users } from 'phosphor-svelte';
	import type { TelemetryEvent } from '$lib/domain/telemetry';
	import type { TelemetryView } from '$lib/domain/telemetry-view';
	import { formatRelativeTime } from '$lib/presentation/dashboard-format';

	type Props = {
		readonly view: TelemetryView | null;
		readonly referenceTime: string;
	};

	let { view, referenceTime }: Props = $props();

	function bar(share: number): string {
		return `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;
	}

	function vitalsClass(lcpMs: number | null): string {
		if (lcpMs === null) return '';
		return lcpMs <= 2500 ? 'good' : lcpMs <= 4000 ? 'mid' : 'poor';
	}

	function eventLabel(event: TelemetryEvent): string {
		if (event.eventType === 'web_vital') return `${event.metricName} ${event.metricValue}`;
		if (event.eventType === 'workspace_view') return event.workspace ?? 'workspace';
		return 'page view';
	}
</script>

<div class="telemetry-screen">
	<header class="telemetry-overview">
		<div>
			<span><ChartBar size={14} weight="fill" /> Visitor telemetry</span>
			<h1>Visitors</h1>
			<p>Cookieless page, workspace, and Core Web Vitals evidence.</p>
		</div>
		{#if view !== null}
			<section aria-label="Visitor summary">
				<div><strong>{view.pageViews}</strong><span>page views</span></div>
				<div><strong>{view.uniqueSessions}</strong><span>sessions</span></div>
				<div><strong>{view.workspaceViews}</strong><span>workspace views</span></div>
			</section>
		{:else}
			<section class="telemetry-empty"><span>No telemetry collected yet.</span></section>
		{/if}
	</header>

	{#if view !== null}
		<section class="telemetry-vitals">
			<header><span>Core Web Vitals</span><small>Measured beacons · browser</small></header>
			<div class="vital-grid">
				<div class={vitalsClass(view.vitals.lcpMs)}>
					<span>LCP</span>
					<strong
						>{view.vitals.lcpMs === null
							? 'Unavailable'
							: `${Math.round(view.vitals.lcpMs)} ms`}</strong
					>
					<small>{view.vitals.lcpCount} samples</small>
				</div>
				<div>
					<span>CLS</span>
					<strong>{view.vitals.cls === null ? 'Unavailable' : view.vitals.cls.toFixed(3)}</strong>
					<small>{view.vitals.clsCount} samples</small>
				</div>
				<div>
					<span>Traffic</span>
					<strong>{view.pageViews}</strong>
					<small>{view.uniqueSessions} sessions</small>
				</div>
			</div>
		</section>

		<div class="telemetry-grid">
			<section class="telemetry-panel" aria-labelledby="telemetry-paths">
				<header><span id="telemetry-paths">Pages</span><small>Most visited</small></header>
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
					<span id="telemetry-workspaces">Workspaces</span><small>Dashboard sections</small>
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
					<span id="telemetry-countries">Countries</span><small>Cloudflare edge</small>
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
				<header><span id="telemetry-devices">Devices</span><small>User agent class</small></header>
				{#each view.devices as item (item.label)}
					<div class="bar-row">
						<span class="bar-label">{item.label}</span>
						<i class="bar-track"><b style="width:{bar(item.share)}"></b></i>
						<span class="bar-count">{item.count}</span>
					</div>
				{:else}<p class="empty">No device evidence yet.</p>{/each}
			</section>

			<section class="telemetry-panel" aria-labelledby="telemetry-hours">
				<header><span id="telemetry-hours">Hours</span><small>UTC · top 12</small></header>
				{#each view.hours as item (item.label)}
					<div class="bar-row">
						<span class="bar-label">{item.label}</span>
						<i class="bar-track"><b style="width:{bar(item.share)}"></b></i>
						<span class="bar-count">{item.count}</span>
					</div>
				{:else}<p class="empty">No hour evidence yet.</p>{/each}
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
								>{event.country ?? '—'} · {formatRelativeTime(
									event.recordedAt,
									referenceTime
								)}</small
							>
						</article>
					{:else}<p class="empty">No beacons received yet.</p>{/each}
				</div>
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
		grid-template-rows: auto minmax(0, 1fr);
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
		display: flex;
		gap: 1rem;
		align-items: center;
	}
	.telemetry-overview section > div {
		display: grid;
		gap: 0.1rem;
		min-width: 5.5rem;
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
		grid-template-columns: repeat(3, minmax(0, 1fr));
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
	@media (max-width: 900px) {
		.telemetry-grid {
			grid-template-columns: 1fr 1fr;
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
	}
</style>
