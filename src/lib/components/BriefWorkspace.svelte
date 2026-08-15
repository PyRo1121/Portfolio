<script lang="ts">
	import { ArrowDownRight, ArrowUpRight, Minus } from 'phosphor-svelte';
	import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import type { ViewerActivityProjection } from '$lib/domain/dashboard-viewer-time';
	import { formatCompact, formatInteger, formatSigned } from '$lib/presentation/dashboard-format';
	import {
		createWeekChangeChartModel,
		createWeekCommitChartModel
	} from '$lib/presentation/week-chart-model';
	import AnimatedNumber from './AnimatedNumber.svelte';
	import WeekBarChart from './WeekBarChart.svelte';

	type Props = {
		readonly snapshot: GitHubDashboardSnapshot;
		readonly projection: ViewerActivityProjection;
		readonly onSelectRepository: (fullName: string) => void;
	};
	type WeekMobilePanel = 'changes' | 'signals' | 'work';

	let { snapshot, projection, onSelectRepository }: Props = $props();
	let mobilePanel = $state<WeekMobilePanel>('signals');
	const mobilePanels: ReadonlyArray<{ readonly id: WeekMobilePanel; readonly label: string }> = [
		{ id: 'changes', label: 'Changes' },
		{ id: 'signals', label: 'Breakdown' },
		{ id: 'work', label: 'Repositories' }
	];
	const activeRepositories = $derived(
		snapshot.intelligence.repositories.filter((repository) => repository.commits > 0).slice(0, 6)
	);
	const comparison = $derived(snapshot.intelligence.comparison);
	let selectedChangeDate = $state('');
	let selectedCommitDate = $state('');
	const peakDay = $derived(
		[...projection.days].sort((left, right) => right.commits - left.commits)[0]
	);
	const peakChangeDay = $derived(
		[...projection.days].sort((left, right) => right.totalChanges - left.totalChanges)[0]
	);
	const displayedChangeDay = $derived(
		projection.days.find((day) => day.date === selectedChangeDate) ?? peakChangeDay
	);
	const displayedCommitDay = $derived(
		projection.days.find((day) => day.date === selectedCommitDate) ?? peakDay
	);
	const changeChartModel = $derived(createWeekChangeChartModel(projection.days));
	const commitChartModel = $derived(createWeekCommitChartModel(projection.days));
	const activeDayCount = $derived(projection.days.filter((day) => day.commits > 0).length);
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
	function selectChangeDay(index: number): void {
		selectedChangeDate = changeChartModel.dates[index] ?? '';
	}
	function selectCommitDay(index: number): void {
		selectedCommitDate = commitChartModel.dates[index] ?? '';
	}
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
				<h1>Last 7 days</h1>
			</div>
			<p title={projection.timeZone}>GitHub data · times in {projection.timeLabel}</p>
		</header>
		<div class="headline-metric">
			<strong><AnimatedNumber value={snapshot.totals.commits} /></strong>
			<span>commits</span>
		</div>
		<div class="motivation-line">
			<span>Current window</span>
			<strong>{activeDayCount} active {activeDayCount === 1 ? 'day' : 'days'}</strong>
			<p>
				Peak activity was {peakDay?.label ?? '—'} with {formatInteger(peakDay?.commits ?? 0)}
				commits.
			</p>
		</div>
		<div class="summary-stats">
			<div><span>Lines changed</span><strong>{formatCompact(snapshot.totals.churn)}</strong></div>
			<div>
				<span>Active repos</span><strong
					>{formatInteger(snapshot.intelligence.account.activeRepositories)}</strong
				>
			</div>
			<div class="comparison">
				<span>vs prior 7 days</span>
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

	<section class={mobilePanel === 'changes' ? 'weekly-changes panel-visible' : 'weekly-changes'}>
		<header>
			<span>Lines changed by day</span><small
				>{displayedChangeDay?.longLabel ?? 'Selected day'} · +{formatCompact(
					displayedChangeDay?.additions ?? 0
				)} / −{formatCompact(displayedChangeDay?.deletions ?? 0)}</small
			>
		</header>
		<div class="weekly-change-chart">
			<WeekBarChart model={changeChartModel} onSelect={selectChangeDay} />
		</div>
		<footer class="weekly-changes-meta">
			<span>Gold <strong>added</strong> · red <strong>removed</strong></span>
			<span>Peak hour <strong>{projection.peakHour} {projection.timeLabel}</strong></span>
		</footer>
	</section>

	<div class={mobilePanel === 'signals' ? 'signal-column panel-visible' : 'signal-column'}>
		<section class="rhythm-panel">
			<header>
				<span>Commits by day</span><small
					>{displayedCommitDay?.longLabel ?? 'Selected day'} · {formatInteger(
						displayedCommitDay?.commits ?? 0
					)}
					{(displayedCommitDay?.commits ?? 0) === 1 ? 'commit' : 'commits'}</small
				>
			</header>
			<div class="weekly-commit-chart">
				<WeekBarChart model={commitChartModel} onSelect={selectCommitDay} />
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
			<span>Active repositories</span>
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
