<script lang="ts">
	import { ArrowDownRight, ArrowUpRight } from 'phosphor-svelte';
	import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import { createTodayIntelligence } from '$lib/domain/dashboard-today';
	import type { ViewerActivityProjection } from '$lib/domain/dashboard-viewer-time';
	import {
		formatCompact,
		formatInteger,
		formatRelativeTime,
		formatSigned
	} from '$lib/presentation/dashboard-format';
	import AnimatedNumber from './AnimatedNumber.svelte';
	import TodayPulse from './TodayPulse.svelte';

	type Props = {
		readonly snapshot: GitHubDashboardSnapshot;
		readonly projection: ViewerActivityProjection;
	};
	type TodayMobilePanel = 'pulse' | 'change' | 'rhythm' | 'work' | 'commits';
	let { snapshot, projection }: Props = $props();
	const mobilePanels: ReadonlyArray<{ readonly id: TodayMobilePanel; readonly label: string }> = [
		{ id: 'pulse', label: 'Hours' },
		{ id: 'change', label: 'Change' },
		{ id: 'rhythm', label: 'Rhythm' },
		{ id: 'work', label: 'Work' },
		{ id: 'commits', label: 'Commits' }
	];
	const today = $derived(createTodayIntelligence(snapshot, projection));
	const maximumHour = $derived(Math.max(1, ...today.hourlyCommits));
	const peakHour = $derived(
		today.hourlyCommits.reduce(
			(best, commits, hour) => (commits > (today.hourlyCommits[best] ?? 0) ? hour : best),
			0
		)
	);
	let selectedHour = $state<number | null>(null);
	let mobilePanel = $state<TodayMobilePanel>('rhythm');
	const displayedHour = $derived(selectedHour ?? peakHour);

	function hourLabel(hour: number): string {
		return `${String(hour).padStart(2, '0')}:00`;
	}
</script>

<div class="today-screen">
	<nav class="workspace-pages" aria-label="Today panels">
		{#each mobilePanels as panel (panel.id)}
			<button
				type="button"
				class={mobilePanel === panel.id ? 'active' : ''}
				aria-pressed={mobilePanel === panel.id}
				onclick={() => (mobilePanel = panel.id)}>{panel.label}</button
			>
		{/each}
	</nav>
	<section class="today-summary">
		<img
			class="today-portrait"
			src={snapshot.profile.avatarUrl}
			alt=""
			width="320"
			height="320"
			fetchpriority="high"
			referrerpolicy="no-referrer"
		/>
		<header>
			<span>{today.label}</span><small title={projection.timeZone}
				>{projection.timeLabel} · default branches</small
			>
		</header>
		<div class="today-total">
			<strong><AnimatedNumber value={today.commits} /></strong><span>commits today</span>
		</div>
		<div class="today-message">
			<span>{today.labelText}</span>
			<p>{today.message}</p>
		</div>
		<div class="today-summary-grid">
			<div><span>Week share</span><strong>{today.weekShare}%</strong></div>
			<div><span>vs daily pace</span><strong>{formatSigned(today.paceDelta)}</strong></div>
			<div><span>Active repos</span><strong>{formatInteger(today.activeRepositories)}</strong></div>
		</div>
	</section>

	<section
		class={mobilePanel === 'pulse' ? 'today-pulse-panel panel-visible' : 'today-pulse-panel'}
	>
		<header><span>Today by hour</span><small>Interactive viewer-local clock</small></header>
		<TodayPulse
			{today}
			timeLabel={projection.timeLabel}
			selectedHour={displayedHour}
			onSelectHour={(hour) => (selectedHour = hour)}
		/>
		<footer>
			<span>Peak <strong>{today.peakHour}</strong></span><span
				>Activity span <strong
					>{today.activitySpanHours === null ? '—' : `${today.activitySpanHours}h`}</strong
				></span
			>
		</footer>
	</section>

	<section
		class={mobilePanel === 'change' ? 'today-change-panel panel-visible' : 'today-change-panel'}
	>
		<header><span>Change mass</span><small>Today only</small></header>
		<div class="today-change-grid">
			<div><span>Added</span><strong>+{formatCompact(today.additions)}</strong></div>
			<div><span>Removed</span><strong>−{formatCompact(today.deletions)}</strong></div>
			<div><span>Files touched</span><strong>{formatInteger(today.changedFiles)}</strong></div>
			<div><span>Prior average</span><strong>{today.priorDailyAverage.toFixed(1)}</strong></div>
		</div>
		<div class="today-pace">
			{#if today.paceDelta >= 0}<ArrowUpRight size={18} weight="bold" />{:else}<ArrowDownRight
					size={18}
					weight="bold"
				/>{/if}
			<span
				>{Math.abs(today.paceDelta)} commits {today.paceDelta >= 0 ? 'above' : 'below'} the prior six-day
				average</span
			>
		</div>
	</section>

	<section
		class={mobilePanel === 'rhythm' ? 'today-hourly-panel panel-visible' : 'today-hourly-panel'}
	>
		<header>
			<span>Hourly rhythm</span><small
				>{hourLabel(displayedHour)}
				{projection.timeLabel} · {today.hourlyCommits[displayedHour] ?? 0}
				commits</small
			>
		</header>
		<div class="today-hours" role="list" aria-label={`Commits by hour in ${projection.timeZone}`}>
			{#each today.hourlyCommits as commits, hour (hour)}
				<button
					type="button"
					class={hour === displayedHour ? 'selected active' : commits > 0 ? 'active' : ''}
					onclick={() => (selectedHour = hour)}
					onfocus={() => (selectedHour = hour)}
					aria-label={`${hourLabel(hour)} ${projection.timeLabel}, ${commits} commits`}
					aria-current={hour === displayedHour ? 'true' : undefined}
				>
					<i
						style={`--hour-height:${Math.max(commits === 0 ? 0.012 : commits / maximumHour, 0.035)}`}
					></i>
					<span>{hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}</span>
				</button>
			{/each}
		</div>
	</section>

	<section class={mobilePanel === 'work' ? 'today-workstreams panel-visible' : 'today-workstreams'}>
		<header>
			<span>Today’s workstreams</span><small>Repository / commits / diff / files / share</small>
		</header>
		<div>
			{#each today.repositories.slice(0, 5) as repository (repository.fullName)}
				<article>
					<strong>{repository.name}</strong><span>{formatInteger(repository.commits)} commits</span
					><span
						>+{formatCompact(repository.additions)} / −{formatCompact(repository.deletions)}</span
					><span>{formatInteger(repository.changedFiles)} files</span>
					<div><i style={`transform:scaleX(${repository.share})`}></i></div>
				</article>
			{:else}<p>No default-branch workstreams yet today.</p>{/each}
		</div>
	</section>

	<section class={mobilePanel === 'commits' ? 'today-commits panel-visible' : 'today-commits'}>
		<header><span>Latest today</span><small>Exact commit evidence</small></header>
		<div>
			{#each today.recentCommits as commit (commit.sha)}
				<a href={commit.url} target="_blank" rel="external noreferrer"
					><span>{commit.shortSha}</span><strong>{commit.message}</strong><small
						>{commit.repository}</small
					><time datetime={commit.committedAt}
						>{formatRelativeTime(commit.committedAt, snapshot.generatedAt)}</time
					></a
				>
			{:else}<p>Your first useful commit will appear here.</p>{/each}
		</div>
	</section>
</div>
