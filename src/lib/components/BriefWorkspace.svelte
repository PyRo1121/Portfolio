<script lang="ts">
	import { ArrowDownRight, ArrowUpRight, Minus } from 'phosphor-svelte';
	import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import { createDashboardMomentum } from '$lib/domain/dashboard-momentum';
	import type { ViewerActivityProjection } from '$lib/domain/dashboard-viewer-time';
	import { formatCompact, formatInteger, formatSigned } from '$lib/presentation/dashboard-format';
	import AnimatedNumber from './AnimatedNumber.svelte';
	import ChangeTerrain from './ChangeTerrain.svelte';

	type Props = {
		readonly snapshot: GitHubDashboardSnapshot;
		readonly projection: ViewerActivityProjection;
		readonly onSelectRepository: (fullName: string) => void;
	};
	type WeekMobilePanel = 'terrain' | 'signals' | 'work';

	let { snapshot, projection, onSelectRepository }: Props = $props();
	let mobilePanel = $state<WeekMobilePanel>('signals');
	const mobilePanels: ReadonlyArray<{ readonly id: WeekMobilePanel; readonly label: string }> = [
		{ id: 'terrain', label: 'Terrain' },
		{ id: 'signals', label: 'Signals' },
		{ id: 'work', label: 'Workstreams' }
	];
	const activeRepositories = $derived(
		snapshot.intelligence.repositories.filter((repository) => repository.commits > 0).slice(0, 6)
	);
	const comparison = $derived(snapshot.intelligence.comparison);
	const peakDay = $derived(
		[...projection.days].sort((left, right) => right.commits - left.commits)[0]
	);
	const changedFiles = $derived(
		snapshot.intelligence.repositories.reduce(
			(total, repository) => total + repository.changedFiles,
			0
		)
	);
	const additionShare = $derived(
		snapshot.totals.churn === 0
			? 0
			: Math.round((snapshot.totals.additions / snapshot.totals.churn) * 100)
	);
	const momentum = $derived(createDashboardMomentum(snapshot, projection));
</script>

<div class="week-screen">
	<nav class="workspace-pages" aria-label="Week panels">
		{#each mobilePanels as panel (panel.id)}
			<button
				type="button"
				class={mobilePanel === panel.id ? 'active' : ''}
				aria-pressed={mobilePanel === panel.id}
				onclick={() => (mobilePanel = panel.id)}>{panel.label}</button
			>
		{/each}
	</nav>
	<section class="week-summary">
		<header>
			<div>
				<span>{projection.periodLabel}</span>
				<h1>This week</h1>
			</div>
			<p title={projection.timeZone}>Collected evidence · viewed in {projection.timeLabel}</p>
		</header>
		<div class="headline-metric">
			<strong><AnimatedNumber value={snapshot.totals.commits} /></strong>
			<span>commits</span>
		</div>
		<div class="motivation-line">
			<span>Momentum {momentum.score}</span>
			<strong>{momentum.label}</strong>
			<p>{momentum.message}</p>
		</div>
		<div class="summary-stats">
			<div><span>Lines moved</span><strong>{formatCompact(snapshot.totals.churn)}</strong></div>
			<div>
				<span>Active repos</span><strong
					>{formatInteger(snapshot.intelligence.account.activeRepositories)}</strong
				>
			</div>
			<div class="comparison">
				<span>vs last week</span>
				<strong>
					{#if comparison.direction === 'up'}<ArrowUpRight
							size={15}
							weight="bold"
						/>{:else if comparison.direction === 'down'}<ArrowDownRight
							size={15}
							weight="bold"
						/>{:else}<Minus size={15} weight="bold" />{/if}
					{formatSigned(comparison.commitDelta)}
				</strong>
			</div>
		</div>
	</section>

	<section class={mobilePanel === 'terrain' ? 'terrain-panel panel-visible' : 'terrain-panel'}>
		<header><span>Change mass</span><small>Additions / deletions by day</small></header>
		<ChangeTerrain days={projection.days} />
		<div class="terrain-meta">
			<span
				>Peak day <strong>{peakDay?.label ?? '—'} · {formatInteger(peakDay?.commits ?? 0)}</strong
				></span
			>
			<span>Peak hour <strong>{projection.peakHour} {projection.timeLabel}</strong></span>
		</div>
	</section>

	<div class={mobilePanel === 'signals' ? 'signal-column panel-visible' : 'signal-column'}>
		<section class="rhythm-panel">
			<header><span>Daily rhythm</span><small>Commits</small></header>
			<div class="rhythm-bars">
				{#each projection.days as day (day.date)}
					<div class="rhythm-bar">
						<strong>{formatInteger(day.commits)}</strong>
						<div><i style={`height:${day.height}`}></i></div>
						<span>{day.label}</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="composition-panel">
			<header><span>Change mix</span><small>Measured line movement</small></header>
			<figure
				class="change-mix"
				aria-label={`${additionShare}% of measured line movement was additions`}
			>
				<div class="change-mix__values">
					<div><span>Added</span><strong>+{formatCompact(snapshot.totals.additions)}</strong></div>
					<div>
						<span>Removed</span><strong>−{formatCompact(snapshot.totals.deletions)}</strong>
					</div>
				</div>
				<div class="change-mix__track" aria-hidden="true">
					<i style={`width:${additionShare}%`}></i>
				</div>
				<figcaption>
					<span><strong>{additionShare}%</strong> additions</span>
					<span><strong>{formatInteger(changedFiles)}</strong> files touched</span>
				</figcaption>
			</figure>
		</section>
	</div>

	<section class={mobilePanel === 'work' ? 'workstream-panel panel-visible' : 'workstream-panel'}>
		<header>
			<span>Active workstreams</span>
			<small>Repository / commits / diff / files / share</small>
		</header>
		<div class="compact-workstreams">
			{#each activeRepositories as repository, index (repository.fullName)}
				<button type="button" onclick={() => onSelectRepository(repository.fullName)}>
					<span class="workstream-index">0{index + 1}</span>
					<span class="workstream-artwork"
						><img
							src={repository.imageUrl}
							alt=""
							width="48"
							height="48"
							loading="lazy"
							decoding="async"
						/></span
					>
					<div class="workstream-identity">
						<strong>{repository.name}</strong>
						<small
							>{repository.primaryLanguage} · {repository.isPrivate ? 'private' : 'public'}</small
						>
					</div>
					<div class="workstream-value">
						<strong>{formatInteger(repository.commits)}</strong><small>commits</small>
					</div>
					<div class="workstream-value workstream-diff">
						<strong
							>+{formatCompact(repository.additions)} / −{formatCompact(
								repository.deletions
							)}</strong
						>
						<small>lines changed</small>
					</div>
					<div class="workstream-value">
						<strong>{formatInteger(repository.changedFiles)}</strong><small>files touched</small>
					</div>
					<div class="workstream-share">
						<div class="share-track">
							<i style={`transform:scaleX(${repository.activityShare})`}></i>
						</div>
						<small>{Math.round(repository.activityShare * 100)}% of commits</small>
					</div>
				</button>
			{/each}
		</div>
	</section>
</div>
