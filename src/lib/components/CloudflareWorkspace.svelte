<script lang="ts">
	import { ArrowUpRight, Cloud, Database, Gauge, ShieldCheck, Warning } from 'phosphor-svelte';
	import type { CloudflareUsageSnapshot } from '$lib/domain/cloudflare-usage';
	import { formatCloudflareMetric } from '$lib/domain/cloudflare-usage';
	import { formatGeneratedAt, formatInteger } from '$lib/presentation/dashboard-format';

	type CloudflarePanel = 'inventory' | 'usage' | 'health';
	type Props = {
		readonly snapshot: CloudflareUsageSnapshot | null;
		readonly refreshState: 'Refreshing' | 'Current' | 'Fresh' | 'Unavailable';
		readonly message: string;
	};

	let { snapshot, refreshState, message }: Props = $props();
	let mobilePanel = $state<CloudflarePanel>('inventory');
	const panels: ReadonlyArray<{ readonly id: CloudflarePanel; readonly label: string }> = [
		{ id: 'inventory', label: 'Inventory' },
		{ id: 'usage', label: 'Usage' },
		{ id: 'health', label: 'Health' }
	];
</script>

<div class="cloudflare-screen">
	<nav class="workspace-pages" aria-label="Cloudflare panels">
		{#each panels as panel (panel.id)}
			<button
				type="button"
				class={mobilePanel === panel.id ? 'active' : ''}
				aria-pressed={mobilePanel === panel.id}
				onclick={() => (mobilePanel = panel.id)}>{panel.label}</button
			>
		{/each}
	</nav>

	<header class="cloudflare-overview">
		<div class="cloudflare-title">
			<span><Cloud size={15} weight="fill" /> Account control plane</span>
			<h1>Cloudflare</h1>
			<p>Provisioned inventory and measured seven-day platform evidence.</p>
		</div>
		{#if snapshot === null}
			<div class="cloudflare-empty">
				<Warning size={22} weight="duotone" />
				<strong
					>{refreshState === 'Refreshing'
						? 'Collecting account evidence'
						: 'Evidence unavailable'}</strong
				>
				<span>{message || 'No Cloudflare snapshot is cached yet.'}</span>
			</div>
		{:else}
			<div class="cloudflare-summary">
				<div>
					<strong>{snapshot.summary.availableProducts}/{snapshot.summary.totalProducts}</strong>
					<span>products readable</span>
				</div>
				<div>
					<strong>{formatInteger(snapshot.summary.provisionedResources)}</strong>
					<span>resources provisioned</span>
				</div>
				<div>
					<strong>{snapshot.summary.measuredMetrics}</strong>
					<span>measured signals</span>
				</div>
			</div>
			<div class="cloudflare-stamp">
				<span class={refreshState === 'Unavailable' ? 'status status--warning' : 'status'}>
					<i></i>{refreshState === 'Unavailable' ? 'Cached evidence' : 'Live collector'}
				</span>
				<time datetime={snapshot.generatedAt}>{formatGeneratedAt(snapshot.generatedAt, 'UTC')}</time
				>
			</div>
		{/if}
	</header>

	{#if snapshot !== null}
		<section
			class={mobilePanel === 'inventory'
				? 'cloudflare-inventory panel-visible'
				: 'cloudflare-inventory'}
		>
			<header><span>Provisioned surface</span><small>Account API · not usage</small></header>
			<div class="product-grid">
				{#each snapshot.products as product (product.id)}
					<a href={product.evidenceUrl} target="_blank" rel="external noreferrer">
						<div>
							<span>{product.state}</span>
							<ArrowUpRight size={13} weight="light" />
						</div>
						<strong>{product.count === null ? '—' : formatInteger(product.count)}</strong>
						<h2>{product.label}</h2>
						<p>{product.detail}</p>
					</a>
				{/each}
			</div>
		</section>

		<section
			class={mobilePanel === 'usage' ? 'cloudflare-usage panel-visible' : 'cloudflare-usage'}
		>
			<header><span>Measured usage</span><small>{snapshot.period.label}</small></header>
			<div class="metric-grid">
				{#each snapshot.metrics as metric (metric.id)}
					<a href={metric.evidenceUrl} target="_blank" rel="external noreferrer">
						<div>
							<span
								class={metric.state === 'Unavailable' ? 'evidence evidence--missing' : 'evidence'}
								>{metric.state}</span
							>
							<ArrowUpRight size={13} weight="light" />
						</div>
						<strong>{formatCloudflareMetric(metric)}</strong>
						<h2>{metric.label}</h2>
						<p>{metric.detail}</p>
					</a>
				{/each}
			</div>
		</section>

		<aside
			class={mobilePanel === 'health' ? 'cloudflare-health panel-visible' : 'cloudflare-health'}
		>
			<header><span>Evidence contract</span><small>Fail closed</small></header>
			<div class="health-list">
				<div>
					<ShieldCheck size={17} weight="duotone" /><span
						><strong>Secret boundary</strong><small
							>Token remains Worker-only and is never serialized.</small
						></span
					>
				</div>
				<div>
					<Database size={17} weight="duotone" /><span
						><strong>Independent cache</strong><small
							>Cloudflare failures cannot replace GitHub evidence.</small
						></span
					>
				</div>
				<div>
					<Gauge size={17} weight="duotone" /><span
						><strong>No synthetic zeroes</strong><small
							>{snapshot.summary.unavailableMetrics} unavailable metrics remain visibly unavailable.</small
						></span
					>
				</div>
			</div>
			<p title={message}>{message || 'Collector healthy. Product failures remain isolated.'}</p>
		</aside>
	{/if}
</div>

<style>
	.cloudflare-screen {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(19rem, 0.75fr);
		grid-template-rows: auto minmax(0, 1fr) auto;
		gap: 1px;
		height: 100%;
		min-height: 0;
		background: var(--line);
	}
	:global(.cloudflare-screen .workspace-pages) {
		display: none;
	}
	.cloudflare-overview,
	.cloudflare-inventory,
	.cloudflare-usage,
	.cloudflare-health {
		min-width: 0;
		min-height: 0;
		background: var(--surface);
	}
	.cloudflare-overview {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: minmax(15rem, 1fr) auto auto;
		align-items: end;
		gap: clamp(1rem, 3vw, 3.2rem);
		padding: clamp(1rem, 2.2vw, 2rem);
		background:
			radial-gradient(circle at 72% -40%, rgb(216 165 74 / 13%), transparent 42%),
			var(--surface-deep);
	}
	.cloudflare-title > span,
	.cloudflare-overview p,
	.cloudflare-overview time,
	.cloudflare-overview .status,
	.cloudflare-inventory > header,
	.cloudflare-usage > header,
	.cloudflare-health > header {
		font: 500 0.54rem/1.2 var(--mono);
		text-transform: uppercase;
		letter-spacing: 0.055em;
	}
	.cloudflare-title > span {
		display: flex;
		align-items: center;
		gap: 0.42rem;
		color: var(--accent);
	}
	.cloudflare-title h1 {
		margin: 0.3rem 0 0;
		font-size: clamp(2.2rem, 5vw, 5rem);
		font-weight: 620;
		line-height: 0.82;
		letter-spacing: -0.07em;
	}
	.cloudflare-title p {
		margin: 0.8rem 0 0;
		color: var(--muted);
	}
	.cloudflare-summary {
		display: flex;
		gap: clamp(1rem, 2.5vw, 2.8rem);
	}
	.cloudflare-summary div {
		display: grid;
		gap: 0.25rem;
	}
	.cloudflare-summary strong {
		font: 620 clamp(1.25rem, 2.4vw, 2.2rem)/1 var(--mono);
		letter-spacing: -0.06em;
	}
	.cloudflare-summary span,
	.cloudflare-stamp time,
	.cloudflare-empty span {
		font: 480 0.5rem/1.2 var(--mono);
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.cloudflare-stamp {
		display: grid;
		justify-items: end;
		gap: 0.45rem;
	}
	.status {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		color: #9bc39a;
	}
	.status i {
		width: 0.36rem;
		height: 0.36rem;
		border-radius: 50%;
		background: currentColor;
		box-shadow: 0 0 0.7rem currentColor;
	}
	.status--warning {
		color: var(--accent);
	}
	.cloudflare-empty {
		grid-column: 2 / -1;
		display: grid;
		justify-items: start;
		gap: 0.4rem;
		color: var(--accent);
	}
	.cloudflare-empty strong {
		font-size: 1rem;
	}
	.cloudflare-inventory {
		grid-row: 2 / 4;
	}
	.cloudflare-inventory,
	.cloudflare-usage,
	.cloudflare-health {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		overflow: hidden;
	}
	.cloudflare-inventory > header,
	.cloudflare-usage > header,
	.cloudflare-health > header {
		display: flex;
		justify-content: space-between;
		padding: 0.72rem 0.85rem;
		border-bottom: 1px solid var(--line);
		color: var(--muted);
	}
	.product-grid,
	.metric-grid {
		display: grid;
		min-height: 0;
	}
	.product-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
	.metric-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.product-grid a,
	.metric-grid a {
		display: grid;
		align-content: start;
		gap: 0.35rem;
		min-width: 0;
		padding: clamp(0.75rem, 1.4vw, 1.25rem);
		border-right: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
		color: inherit;
		text-decoration: none;
		transition: background 160ms ease;
	}
	.product-grid a:hover,
	.metric-grid a:hover {
		background: var(--high);
	}
	.product-grid a > div,
	.metric-grid a > div {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font: 520 0.45rem/1 var(--mono);
		color: var(--accent);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.product-grid a > strong,
	.metric-grid a > strong {
		margin-top: 0.25rem;
		font: 620 clamp(1.35rem, 2.5vw, 2.4rem)/1 var(--mono);
		letter-spacing: -0.07em;
	}
	.product-grid h2,
	.metric-grid h2 {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 620;
	}
	.product-grid p,
	.metric-grid p {
		margin: 0.2rem 0 0;
		font: 450 0.48rem/1.4 var(--mono);
		color: var(--muted);
	}
	.evidence--missing {
		color: #d18070;
	}
	.cloudflare-health {
		grid-template-rows: auto auto auto;
	}
	.health-list {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.health-list > div {
		display: flex;
		gap: 0.55rem;
		padding: 0.8rem;
		border-right: 1px solid var(--line);
		color: var(--accent);
	}
	.health-list span {
		display: grid;
		gap: 0.2rem;
	}
	.health-list strong {
		font-size: 0.62rem;
		color: var(--ink);
	}
	.health-list small {
		font: 450 0.46rem/1.35 var(--mono);
		color: var(--muted);
	}
	.cloudflare-health > p {
		margin: 0;
		padding: 0.6rem 0.8rem;
		border-top: 1px solid var(--line);
		font: 450 0.48rem/1.3 var(--mono);
		color: var(--muted);
	}
	@media (max-width: 1180px) {
		.product-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.product-grid p {
			display: none;
		}
		.metric-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.metric-grid p {
			display: none;
		}
	}
	@media (max-width: 900px) {
		.cloudflare-screen {
			display: grid;
			grid-template-columns: 1fr;
			grid-template-rows: auto auto minmax(0, 1fr);
		}
		:global(.cloudflare-screen .workspace-pages) {
			display: flex;
		}
		.cloudflare-overview {
			grid-column: 1;
			grid-template-columns: 1fr auto;
			padding: 0.85rem;
		}
		.cloudflare-title p,
		.cloudflare-stamp,
		.cloudflare-summary div:nth-child(2) {
			display: none;
		}
		.cloudflare-summary {
			gap: 1rem;
		}
		.cloudflare-title h1 {
			font-size: 2.3rem;
		}
		.cloudflare-inventory,
		.cloudflare-usage,
		.cloudflare-health {
			display: none;
			grid-column: 1;
			grid-row: 3;
		}
		.cloudflare-inventory.panel-visible,
		.cloudflare-usage.panel-visible,
		.cloudflare-health.panel-visible {
			display: grid;
		}
		.product-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.product-grid a,
		.metric-grid a {
			padding: 0.72rem;
		}
		.product-grid a > strong,
		.metric-grid a > strong {
			font-size: 1.35rem;
		}
		.product-grid p,
		.metric-grid p {
			display: block;
			font-size: 0.43rem;
		}
		.metric-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.health-list {
			grid-template-columns: 1fr;
			align-content: start;
		}
		.health-list > div {
			border-right: 0;
			border-bottom: 1px solid var(--line);
		}
	}
	@media (max-width: 430px) {
		.cloudflare-overview {
			grid-template-columns: 1fr;
		}
		.cloudflare-summary {
			display: none;
		}
		.product-grid p,
		.metric-grid p {
			display: none;
		}
	}
</style>
