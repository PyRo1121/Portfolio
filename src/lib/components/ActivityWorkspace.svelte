<script lang="ts">
	import { ArrowLeft, ArrowRight, ArrowUpRight, FileCode, GitCommit } from 'phosphor-svelte';
	import {
		commitsForViewerDate,
		type ViewerActivityProjection
	} from '$lib/domain/dashboard-viewer-time';
	import type { CommitSignal, GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import {
		formatCompact,
		formatGeneratedAt,
		formatInteger
	} from '$lib/presentation/dashboard-format';

	type Props = {
		readonly snapshot: GitHubDashboardSnapshot;
		readonly projection: ViewerActivityProjection;
	};
	let { snapshot, projection }: Props = $props();
	let selectedDate = $state('');
	const resolvedDate = $derived(
		selectedDate ||
			[...projection.days].reverse().find((day) => day.commits > 0)?.date ||
			projection.days.at(-1)?.date ||
			''
	);
	let page = $state(0);
	let selectedCommitSha = $state('');
	const pageSize = 10;
	const selectedDay = $derived(
		projection.days.find((day) => day.date === resolvedDate) ?? projection.days[0]
	);
	const commits = $derived(
		commitsForViewerDate(snapshot.intelligence.commits, resolvedDate, projection.timeZone)
	);
	const pageCount = $derived(Math.max(1, Math.ceil(commits.length / pageSize)));
	const boundedPage = $derived(Math.min(page, pageCount - 1));
	const pageCommits = $derived(commits.slice(boundedPage * pageSize, (boundedPage + 1) * pageSize));
	const selectedCommit = $derived.by<CommitSignal | null>(() => {
		return pageCommits.find((commit) => commit.sha === selectedCommitSha) ?? pageCommits[0] ?? null;
	});

	function selectDay(date: string): void {
		selectedDate = date;
		selectedCommitSha = '';
		page = 0;
	}
</script>

<div class="ledger-screen">
	<header class="ledger-toolbar">
		<div>
			<span>Commits</span><strong
				>{formatInteger(snapshot.totals.commits)} commits · {formatCompact(snapshot.totals.churn)} lines
				changed</strong
			>
		</div>
		<nav aria-label={`Select engineering day in ${projection.timeZone}`}>
			{#each projection.days as day (day.date)}
				<button
					type="button"
					class={resolvedDate === day.date ? 'active' : ''}
					aria-pressed={resolvedDate === day.date}
					onclick={() => selectDay(day.date)}
					><span>{day.label}</span><strong>{formatInteger(day.commits)}</strong></button
				>
			{/each}
		</nav>
	</header>

	<section class="ledger-table">
		<header>
			<div>
				<span>{selectedDay?.longLabel ?? 'Selected day'}</span><strong
					>{formatInteger(selectedDay?.commits ?? 0)}
					{(selectedDay?.commits ?? 0) === 1 ? 'commit' : 'commits'}</strong
				>
			</div>
			<div>
				<span>Lines changed</span><strong
					>+{formatCompact(selectedDay?.additions ?? 0)} / −{formatCompact(
						selectedDay?.deletions ?? 0
					)}</strong
				>
			</div>
		</header>
		<div class="commit-header">
			<span>SHA</span><span>Commit</span><span>Repository</span><span>Diff</span><span></span>
		</div>
		<ol>
			{#each pageCommits as commit (commit.sha)}
				<li class={selectedCommit?.sha === commit.sha ? 'selected' : ''}>
					<a
						href={commit.url}
						target="_blank"
						rel="external noreferrer"
						onpointerenter={() => (selectedCommitSha = commit.sha)}
						onfocus={() => (selectedCommitSha = commit.sha)}
						><span>{commit.shortSha}</span><strong title={commit.message}>{commit.message}</strong
						><span title={commit.repository}>{commit.repository}</span><span class="diff"
							><b>+{formatInteger(commit.additions)}</b><i>−{formatInteger(commit.deletions)}</i
							></span
						><ArrowUpRight size={14} weight="light" /></a
					>
				</li>
			{:else}<li class="empty-ledger">No commits on this day.</li>{/each}
		</ol>
		{#if selectedCommit !== null}
			<aside class="commit-inspector" aria-live="polite">
				<div class="commit-inspector__identity">
					<GitCommit size={17} weight="duotone" />
					<span>{selectedCommit.shortSha}</span>
					<strong>{selectedCommit.message}</strong>
				</div>
				<div class="commit-inspector__facts">
					<span><b>{selectedCommit.repository}</b> repository</span>
					<span
						><FileCode size={13} /> <b>{formatInteger(selectedCommit.changedFiles)}</b> files</span
					>
					<span><b>+{formatInteger(selectedCommit.additions)}</b> added</span>
					<span><b>−{formatInteger(selectedCommit.deletions)}</b> removed</span>
					<time datetime={selectedCommit.committedAt}
						>{formatGeneratedAt(selectedCommit.committedAt, projection.timeZone)}</time
					>
				</div>
				<a href={selectedCommit.url} target="_blank" rel="external noreferrer"
					>Open on GitHub <ArrowUpRight size={13} /></a
				>
			</aside>
		{/if}
		<footer>
			<span
				>{commits.length === 0
					? '0'
					: `${boundedPage * pageSize + 1}–${Math.min((boundedPage + 1) * pageSize, commits.length)}`}
				of {formatInteger(commits.length)}</span
			>
			<div>
				<button
					type="button"
					disabled={boundedPage === 0}
					onclick={() => (page = Math.max(0, boundedPage - 1))}
					aria-label="Previous commit page"><ArrowLeft size={15} /></button
				><button
					type="button"
					disabled={boundedPage >= pageCount - 1}
					onclick={() => (page = Math.min(pageCount - 1, boundedPage + 1))}
					aria-label="Next commit page"><ArrowRight size={15} /></button
				>
			</div>
		</footer>
	</section>
</div>
