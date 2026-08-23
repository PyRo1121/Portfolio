<script lang="ts">
	import {
		ArrowDownRight,
		ArrowUpRight,
		EnvelopeSimpleIcon as EnvelopeSimple,
		LinkedinLogoIcon as LinkedinLogo
	} from 'phosphor-svelte';
	import type { ContactAction } from '$lib/domain/telemetry';
	import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import { createTodayChangeScope, createTodayIntelligence } from '$lib/domain/dashboard-today';
	import type { ViewerActivityProjection } from '$lib/domain/dashboard-viewer-time';
	import {
		PUBLIC_AVAILABILITY_LINE,
		PUBLIC_CONTACT_EMAIL,
		PUBLIC_CONTACT_MAILTO,
		PUBLIC_LINKEDIN_URL,
		PUBLIC_RESUME_LINE
	} from '$lib/domain/public-seo';
	import {
		formatCompact,
		formatInteger,
		formatRelativeTime,
		formatSigned
	} from '$lib/presentation/dashboard-format';
	import AnimatedNumber from './AnimatedNumber.svelte';

	type Props = {
		readonly snapshot: GitHubDashboardSnapshot;
		readonly projection: ViewerActivityProjection;
		readonly onContact: (action: ContactAction) => void;
	};
	type TodayMobilePanel = 'change' | 'rhythm' | 'work' | 'commits';
	let { snapshot, projection, onContact }: Props = $props();
	const mobilePanels: ReadonlyArray<{ readonly id: TodayMobilePanel; readonly label: string }> = [
		{ id: 'change', label: 'Changes' },
		{ id: 'rhythm', label: 'Hours' },
		{ id: 'work', label: 'Repositories' },
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
	let hoveredHour = $state<number | null>(null);
	let pinnedHour = $state<number | null>(null);
	let mobilePanel = $state<TodayMobilePanel>('rhythm');
	const inspectedHour = $derived(hoveredHour ?? pinnedHour);
	const displayedHour = $derived(inspectedHour ?? peakHour);
	const changeScope = $derived(createTodayChangeScope(today, inspectedHour));
	const changeCaption = $derived(
		changeScope._tag === 'Hour'
			? `${changeScope.caption} ${projection.timeLabel}`
			: changeScope.caption
	);
	const fourthChangeLabel = $derived(changeScope._tag === 'Hour' ? 'Commits' : 'Prior average');
	const fourthChangeValue = $derived(
		changeScope._tag === 'Hour'
			? formatInteger(changeScope.commits)
			: today.priorDailyAverage.toFixed(1)
	);

	function inspectHour(hour: number): void {
		hoveredHour = hour;
	}

	function pinHour(hour: number): void {
		pinnedHour = pinnedHour === hour ? null : hour;
	}

	function clearHover(event: FocusEvent | PointerEvent): void {
		const next = event.relatedTarget;
		if (
			event.currentTarget instanceof HTMLElement &&
			next instanceof Node &&
			event.currentTarget.contains(next)
		) {
			return;
		}
		hoveredHour = null;
	}

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
	<section class="today-summary" aria-labelledby="today-heading">
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
			<h1 id="today-heading">Olen Latham’s engineering activity</h1>
			<span>{today.label}</span><small title={projection.timeZone}
				>{projection.timeLabel} · default branches</small
			>
		</header>
		<div class="today-total">
			<strong><AnimatedNumber value={today.commits} /></strong><span
				>{today.commits === 1 ? 'commit today' : 'commits today'}</span
			>
		</div>
		<div class="today-message">
			<span>{today.labelText}</span>
			<p>{today.message}</p>
		</div>
		<aside class="today-contact" aria-label="Contact Olen Latham">
			<div>
				<span>Open to opportunities</span>
				<p>{PUBLIC_AVAILABILITY_LINE}</p>
			</div>
			<nav aria-label="Recruiter contact actions">
				<a href={PUBLIC_CONTACT_MAILTO} rel="external" onclick={() => onContact('email_summary')}
					><EnvelopeSimple size={15} weight="fill" /> Email Olen</a
				>
				<a
					href={PUBLIC_LINKEDIN_URL}
					target="_blank"
					rel="external noreferrer"
					onclick={() => onContact('linkedin_summary')}
					><LinkedinLogo size={15} weight="fill" /> LinkedIn</a
				>
			</nav>
			<a
				class="today-contact__email"
				href={PUBLIC_CONTACT_MAILTO}
				rel="external"
				onclick={() => onContact('email_summary')}>{PUBLIC_CONTACT_EMAIL}</a
			>
			<p class="today-contact__resume">{PUBLIC_RESUME_LINE}</p>
		</aside>
		<div class="today-summary-grid">
			<div><span>Week share</span><strong>{today.weekShare}%</strong></div>
			<div><span>vs daily pace</span><strong>{formatSigned(today.paceDelta)}</strong></div>
			<div><span>Active repos</span><strong>{formatInteger(today.activeRepositories)}</strong></div>
		</div>
	</section>

	<section
		class={mobilePanel === 'change' ? 'today-change-panel panel-visible' : 'today-change-panel'}
	>
		<header><span>Changes</span><small>{changeCaption}</small></header>
		<div class="today-change-grid" aria-live="polite">
			<div><span>Added</span><strong>+{formatCompact(changeScope.additions)}</strong></div>
			<div><span>Removed</span><strong>−{formatCompact(changeScope.deletions)}</strong></div>
			<div>
				<span>File changes</span><strong>{formatInteger(changeScope.changedFiles)}</strong>
			</div>
			<div><span>{fourthChangeLabel}</span><strong>{fourthChangeValue}</strong></div>
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
			<span>Commits by hour</span><small
				>{hourLabel(displayedHour)}
				{projection.timeLabel} · {today.hourlyCommits[displayedHour] ?? 0}
				{(today.hourlyCommits[displayedHour] ?? 0) === 1 ? 'commit' : 'commits'}</small
			>
		</header>
		<div
			class="today-hours"
			role="group"
			aria-label={`Commits by hour in ${projection.timeZone}`}
			onpointerleave={clearHover}
			onfocusout={clearHover}
		>
			{#each today.hourlyCommits as commits, hour (hour)}
				<button
					type="button"
					class={hour === displayedHour ? 'selected active' : commits > 0 ? 'active' : ''}
					onpointerenter={() => inspectHour(hour)}
					onclick={() => pinHour(hour)}
					onfocus={() => inspectHour(hour)}
					aria-label={`${hourLabel(hour)} ${projection.timeLabel}, ${commits} commits`}
					aria-current={hour === displayedHour ? 'true' : undefined}
					aria-pressed={pinnedHour === hour}
				>
					<i
						style={`--hour-height:${Math.max(commits === 0 ? 0.012 : commits / maximumHour, 0.035)}`}
					></i>
					<span>{hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}</span>
				</button>
			{/each}
		</div>
		<footer>
			<span>Peak hour <strong>{today.peakHour}</strong></span><span
				>Active span <strong
					>{today.activitySpanHours === null ? '—' : `${today.activitySpanHours}h`}</strong
				></span
			>
		</footer>
	</section>

	<section class={mobilePanel === 'work' ? 'today-workstreams panel-visible' : 'today-workstreams'}>
		<header>
			<span>Active repositories</span><small>Commits / lines changed / files / share</small>
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
			{:else}<p>No default-branch repositories have commits today.</p>{/each}
		</div>
	</section>

	<section class={mobilePanel === 'commits' ? 'today-commits panel-visible' : 'today-commits'}>
		<header><span>Recent commits</span><small>Open on GitHub</small></header>
		<div>
			{#each today.recentCommits as commit (commit.sha)}
				{#if commit.isPrivate}
					<div
						class="private-commit"
						aria-label={`${commit.shortSha}, ${commit.message}, ${commit.repository}, private evidence`}
						title="Private commit evidence is not publicly linkable"
					>
						<span>{commit.shortSha}</span><strong>{commit.message}</strong><small
							>{commit.repository} · private</small
						><time datetime={commit.committedAt}
							>{formatRelativeTime(commit.committedAt, snapshot.generatedAt)}</time
						>
					</div>
				{:else}
					<a href={commit.url} target="_blank" rel="external noreferrer"
						><span>{commit.shortSha}</span><strong>{commit.message}</strong><small
							>{commit.repository}</small
						><time datetime={commit.committedAt}
							>{formatRelativeTime(commit.committedAt, snapshot.generatedAt)}</time
						></a
					>
				{/if}
			{:else}<p>Your first useful commit will appear here.</p>{/each}
		</div>
	</section>
</div>
