<script lang="ts">
	import {
		ArrowLeft,
		ArrowRight,
		ArrowUpRight,
		LockSimple,
		MagnifyingGlass
	} from 'phosphor-svelte';
	import type {
		GitHubDashboardSnapshot,
		RepositoryIntelligence
	} from '$lib/domain/github-intelligence';
	import { repositoryCollectionEvidence } from '$lib/domain/dashboard-repository-collection';
	import type { RepositoryFilter } from '$lib/domain/dashboard-workspace';
	import {
		formatCompact,
		formatInteger,
		formatRelativeTime
	} from '$lib/presentation/dashboard-format';
	import { formatGitHubArtifactTitle } from '$lib/presentation/github-artifact-title';

	type Props = {
		readonly snapshot: GitHubDashboardSnapshot;
		readonly repositories: ReadonlyArray<RepositoryIntelligence>;
		readonly selected: RepositoryIntelligence | null;
		readonly filter: RepositoryFilter;
		readonly query: string;
		readonly onFilter: (filter: RepositoryFilter) => void;
		readonly onQuery: (query: string) => void;
		readonly onSelect: (fullName: string) => void;
	};

	let { snapshot, repositories, selected, filter, query, onFilter, onQuery, onSelect }: Props =
		$props();
	let page = $state(0);
	const pageSize = 7;
	const pageCount = $derived(Math.max(1, Math.ceil(repositories.length / pageSize)));
	const boundedPage = $derived(Math.min(page, pageCount - 1));
	const pageRepositories = $derived(
		repositories.slice(boundedPage * pageSize, (boundedPage + 1) * pageSize)
	);
	const collectionEvidence = $derived(repositoryCollectionEvidence(snapshot));
	const oldestStaleAge = $derived(
		collectionEvidence.oldestStaleAt === null
			? null
			: formatRelativeTime(collectionEvidence.oldestStaleAt, snapshot.generatedAt)
	);
	const selectedWorkflow = $derived(
		selected === null
			? null
			: (snapshot.intelligence.delivery.workflows.current.repositories.find(
					(repository) => repository.repository === selected.fullName
				) ?? null)
	);
	const selectedArtifact = $derived(
		selected === null
			? null
			: (snapshot.intelligence.delivery.artifacts.find(
					(artifact) => artifact.repository === selected.fullName
				) ?? null)
	);
	const filters: ReadonlyArray<{ readonly id: RepositoryFilter; readonly label: string }> = [
		{ id: 'active', label: 'Active' },
		{ id: 'private', label: 'Private' },
		{ id: 'public', label: 'Public' },
		{ id: 'all', label: 'All' }
	];

	function changeFilter(next: RepositoryFilter): void {
		page = 0;
		onFilter(next);
	}
	function changeQuery(next: string): void {
		page = 0;
		onQuery(next);
	}
</script>

<div class="repositories-screen">
	<header class="screen-toolbar">
		<div>
			<span>Repositories</span><strong>{formatInteger(repositories.length)} results</strong>
			<small class={collectionEvidence.state.toLocaleLowerCase()}
				>{collectionEvidence.state} · {collectionEvidence.detail}{#if oldestStaleAge}
					Oldest retained
					{oldestStaleAge}.{/if}</small
			>
			<small class={collectionEvidence.graphQL.state.toLocaleLowerCase()}
				>{collectionEvidence.graphQL.state} · {collectionEvidence.graphQL.detail}</small
			>
		</div>
		<label
			><MagnifyingGlass size={15} weight="light" /><span class="sr-only">Search repositories</span
			><input
				type="search"
				value={query}
				placeholder="Search repositories"
				oninput={(event) => changeQuery(event.currentTarget.value)}
			/></label
		>
		<nav aria-label="Repository visibility">
			{#each filters as option (option.id)}<button
					type="button"
					class={filter === option.id ? 'active' : ''}
					aria-pressed={filter === option.id}
					onclick={() => changeFilter(option.id)}>{option.label}</button
				>{/each}
		</nav>
	</header>

	<div class="repository-layout">
		<section class="repository-table">
			<header>
				<span>Repository</span><span>Language</span><span>7-day commits</span><span>Updated</span>
			</header>
			<div class="repository-rows">
				{#each pageRepositories as repository (repository.fullName)}
					<button
						type="button"
						class={selected?.fullName === repository.fullName ? 'active' : ''}
						aria-pressed={selected?.fullName === repository.fullName}
						onclick={() => onSelect(repository.fullName)}
					>
						<div>
							<span class="repository-row-artwork"
								><img
									src={repository.imageUrl}
									alt=""
									width="64"
									height="64"
									loading="lazy"
									decoding="async"
								/></span
							>
							<i style={`background:${repository.languageColor}`}></i><span
								><strong>{repository.name}</strong><small
									>{repository.isPrivate ? 'Private' : 'Public'}</small
								></span
							>
						</div>
						<span>{repository.primaryLanguage}</span>
						<strong>{formatInteger(repository.commits)}</strong>
						<span>{formatRelativeTime(repository.pushedAt, snapshot.generatedAt)}</span>
					</button>
				{/each}
			</div>
			<footer>
				<span>Page {boundedPage + 1} / {pageCount}</span>
				<div>
					<button
						type="button"
						disabled={boundedPage === 0}
						onclick={() => (page = Math.max(0, boundedPage - 1))}
						aria-label="Previous repository page"><ArrowLeft size={15} /></button
					><button
						type="button"
						disabled={boundedPage >= pageCount - 1}
						onclick={() => (page = Math.min(pageCount - 1, boundedPage + 1))}
						aria-label="Next repository page"><ArrowRight size={15} /></button
					>
				</div>
			</footer>
		</section>

		<aside class="repository-inspector">
			{#if selected}
				<header class="repository-inspector__header">
					<span class="repository-inspector__image"
						><img
							src={selected.imageUrl}
							alt=""
							width="72"
							height="72"
							loading="eager"
							decoding="async"
						/></span
					>
					<div>
						<span>{selected.isPrivate ? 'Private' : 'Public'} · {selected.primaryLanguage}</span>
						<div class="inspector-title">
							{#if selected.isPrivate}<LockSimple size={16} weight="light" />{/if}
							<h2>{selected.name}</h2>
						</div>
						<small>{selected.fullName}</small>
					</div>
					<a
						href={selected.url}
						target="_blank"
						rel="external noreferrer"
						aria-label={`Open ${selected.name} on GitHub`}
						><ArrowUpRight size={17} weight="bold" /></a
					>
				</header>
				<p>{selected.description}</p>
				<div class="repository-inspector__activity">
					<span>Latest GitHub activity</span><strong
						>{formatRelativeTime(selected.pushedAt, snapshot.generatedAt)}</strong
					>
				</div>
				<div class="inspector-primary">
					<div><span>Commits</span><strong>{formatInteger(selected.commits)}</strong></div>
					<div>
						<span>Lines changed</span><strong
							>{formatCompact(selected.additions + selected.deletions)}</strong
						>
					</div>
				</div>
				<dl>
					<div>
						<dt>Prior-week commits</dt>
						<dd>{formatInteger(selected.previousCommits)}</dd>
					</div>
					<div>
						<dt>Added</dt>
						<dd>+{formatCompact(selected.additions)}</dd>
					</div>
					<div>
						<dt>Removed</dt>
						<dd>−{formatCompact(selected.deletions)}</dd>
					</div>
					<div>
						<dt>Files</dt>
						<dd>{formatInteger(selected.changedFiles)}</dd>
					</div>
					<div>
						<dt>Open issues</dt>
						<dd>{formatInteger(selected.openIssues)}</dd>
					</div>
					<div>
						<dt>Open PRs</dt>
						<dd>{formatInteger(selected.openPullRequests)}</dd>
					</div>
				</dl>
				<section class="repository-inspector__evidence">
					<header>
						<span>Repository evidence</span><small>Checks and recent GitHub records</small>
					</header>
					{#if selectedWorkflow}
						<div class="repository-inspector__checks">
							<div>
								<strong>{formatInteger(selectedWorkflow.successful)}</strong><span>passed</span>
							</div>
							<div>
								<strong>{formatInteger(selectedWorkflow.failed)}</strong><span>failed</span>
							</div>
							<div>
								<strong>{formatInteger(selectedWorkflow.cancelled)}</strong><span>cancelled</span>
							</div>
						</div>
					{:else}
						<p>No accessible workflow totals for this repository.</p>
					{/if}
					{#if selectedArtifact}
						<a href={selectedArtifact.url} target="_blank" rel="external noreferrer">
							<span
								>{selectedArtifact.kind === 'WorkflowRun'
									? 'Workflow run'
									: selectedArtifact.kind}</span
							>
							<strong title={selectedArtifact.title}
								>{formatGitHubArtifactTitle(selectedArtifact.title)}</strong
							>
							<ArrowUpRight size={13} />
						</a>
					{:else}
						<p>No retained outcome or workflow record for this repository.</p>
					{/if}
				</section>
			{:else}<p>Select a repository.</p>{/if}
		</aside>
	</div>
</div>
