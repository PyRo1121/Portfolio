<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		ArrowUpRightIcon as ArrowUpRight,
		CheckCircleIcon as CheckCircle,
		CloudIcon as Cloud,
		DatabaseIcon as Database,
		FolderOpenIcon as FolderOpen,
		GithubLogoIcon as GithubLogo,
		GlobeIcon as Globe,
		HardDrivesIcon as HardDrives,
		PencilSimpleIcon as PencilSimple,
		PlusIcon as Plus,
		TrashIcon as Trash,
		WarningCircleIcon as WarningCircle
	} from 'phosphor-svelte';
	import type { CloudflareDeploymentSnapshot } from '$lib/domain/cloudflare-deployments';
	import type { CloudflareUsageSnapshot } from '$lib/domain/cloudflare-usage';
	import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import type { OwnerProjectResourceKind, OwnerProjectSnapshot } from '$lib/domain/owner-project';
	import {
		createOwnerProjectDossiers,
		type OwnerProjectResourceView
	} from '$lib/domain/owner-project-view';
	import { formatInteger, formatRelativeTime } from '$lib/presentation/dashboard-format';
	import { formatCloudflareResourceBytes } from '$lib/presentation/cloudflare-resource-format';
	import { formatGitHubArtifactTitle } from '$lib/presentation/github-artifact-title';

	type OwnerProps = {
		readonly registry: OwnerProjectSnapshot | null;
		readonly snapshot: GitHubDashboardSnapshot | null;
		readonly cloudflare: CloudflareUsageSnapshot | null;
		readonly deployments: CloudflareDeploymentSnapshot | null;
		readonly deploymentState: 'Refreshing' | 'Current' | 'Fresh' | 'Unavailable';
		readonly deploymentMessage: string;
		readonly accessReason: string;
		readonly actionMessage: string;
		readonly requestedRepository: string | null;
	};
	let props: OwnerProps = $props();
	let selectedProjectId = $state('');
	let mobilePanel = $state<'projects' | 'dossier' | 'manage'>('dossier');
	let dossierTab = $state<'overview' | 'deployments' | 'resources'>('overview');
	const registry = $derived(props.registry);
	const snapshot = $derived(props.snapshot);
	const cloudflare = $derived(props.cloudflare);
	const deployments = $derived(props.deployments);
	const deploymentState = $derived(props.deploymentState);
	const deploymentMessage = $derived(props.deploymentMessage);
	const accessReason = $derived(props.accessReason);
	const actionMessage = $derived(props.actionMessage);
	const requestedRepository = $derived(props.requestedRepository);
	const dossiers = $derived(
		registry === null ? [] : createOwnerProjectDossiers(registry, snapshot, cloudflare, deployments)
	);
	const selected = $derived(
		dossiers.find((dossier) => dossier.project.id === selectedProjectId) ??
			dossiers.find((dossier) =>
				dossier.project.resources.some(
					(resource) =>
						resource.kind === 'GitHubRepository' && resource.providerId === requestedRepository
				)
			) ??
			dossiers[0] ??
			null
	);
	const referenceTime = $derived.by(
		() =>
			[
				snapshot?.generatedAt,
				cloudflare?.generatedAt,
				deployments?.generatedAt,
				selected?.project.updatedAt
			]
				.filter((value): value is string => value !== undefined)
				.sort()
				.at(-1) ?? ''
	);
	const observedResourceCount = $derived(
		selected?.resources.filter((resource) => resource.state !== 'Unavailable').length ?? 0
	);
	const panels = [
		{ id: 'projects' as const, label: 'Projects' },
		{ id: 'dossier' as const, label: 'Dossier' },
		{ id: 'manage' as const, label: 'Manage' }
	];
	const resourceKinds: ReadonlyArray<{
		readonly id: OwnerProjectResourceKind;
		readonly label: string;
	}> = [
		{ id: 'GitHubRepository', label: 'GitHub repository' },
		{ id: 'CloudflareWorker', label: 'Cloudflare Worker' },
		{ id: 'D1Database', label: 'D1 database' },
		{ id: 'KVNamespace', label: 'KV namespace' },
		{ id: 'R2Bucket', label: 'R2 bucket' },
		{ id: 'Domain', label: 'Domain' }
	];
	const enhanceAndClose: SubmitFunction = ({ formElement }) => {
		const editor = formElement.closest('details');
		return async ({ result, update }) => {
			if (result.type === 'success') editor?.removeAttribute('open');
			await update();
		};
	};

	function selectProject(id: string): void {
		selectedProjectId = id;
		dossierTab = 'overview';
		mobilePanel = 'dossier';
	}

	function shortIdentifier(value: string): string {
		return value.length > 16 ? value.slice(0, 12) : value;
	}

	function deploymentStateLabel(state: 'Linked' | 'PartiallyLinked' | 'Unavailable'): string {
		return state === 'PartiallyLinked' ? 'Partially linked' : state;
	}

	function resourceIcon(resource: OwnerProjectResourceView): typeof GithubLogo {
		switch (resource.resource.kind) {
			case 'GitHubRepository':
				return GithubLogo;
			case 'CloudflareWorker':
				return Cloud;
			case 'D1Database':
				return Database;
			case 'KVNamespace':
				return HardDrives;
			case 'R2Bucket':
				return FolderOpen;
			case 'Domain':
				return Globe;
		}
	}
</script>

<div class="projects-screen">
	<nav class="workspace-pages" aria-label="Project panels">
		{#each panels as panel (panel.id)}
			<button
				type="button"
				class={mobilePanel === panel.id ? 'active' : ''}
				aria-pressed={mobilePanel === panel.id}
				onclick={() => (mobilePanel = panel.id)}>{panel.label}</button
			>
		{/each}
	</nav>

	<header class="projects-overview">
		<div>
			<span><FolderOpen size={14} weight="fill" /> Owner registry</span>
			<h1>Projects</h1>
			<p>Confirmed links across GitHub and Cloudflare.</p>
		</div>
		{#if registry !== null}
			<section aria-label="Project registry summary">
				<div><strong>{registry.projects.length}</strong><span>projects</span></div>
				<div>
					<strong>{selected?.project.resources.length ?? 0}</strong><span>linked resources</span>
				</div>
				<div><strong>{observedResourceCount}</strong><span>currently matched</span></div>
			</section>
		{:else}
			<section class="projects-unavailable">
				<WarningCircle size={20} weight="duotone" />
				<strong>Project registry unavailable</strong>
				<span>{accessReason}</span>
			</section>
		{/if}
		{#if actionMessage}<p class="project-message" aria-live="polite">{actionMessage}</p>{/if}
	</header>

	{#if registry !== null}
		<aside class={mobilePanel === 'projects' ? 'project-list panel-visible' : 'project-list'}>
			<header>
				<span>Registered projects</span><small>Owner-confirmed mappings</small>
			</header>
			<div>
				{#each dossiers as dossier (dossier.project.id)}
					<button
						type="button"
						class={selected?.project.id === dossier.project.id ? 'active' : ''}
						aria-pressed={selected?.project.id === dossier.project.id}
						onclick={() => selectProject(dossier.project.id)}
					>
						<span class={dossier.project.lifecycle.toLowerCase()}>{dossier.project.lifecycle}</span>
						<strong>{dossier.project.name}</strong>
						<small>{dossier.project.resources.length} linked resources</small>
					</button>
				{:else}
					<p>No projects have been registered.</p>
				{/each}
			</div>
			<details class="project-create">
				<summary><Plus size={13} /> Add project</summary>
				<form method="POST" action="?/createOwnerProject" use:enhance={enhanceAndClose}>
					<label>Name<input name="name" maxlength="180" required /></label>
					<label
						>Slug<input
							name="slug"
							pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
							maxlength="64"
							required
						/></label
					>
					<label
						>Lifecycle<select name="lifecycle"
							><option>Active</option><option>Reviewing</option><option>Paused</option><option
								>Archived</option
							></select
						></label
					>
					<label
						>Description<textarea name="description" maxlength="1000" required></textarea></label
					>
					<button type="submit">Save project</button>
				</form>
			</details>
		</aside>

		<main class={mobilePanel === 'dossier' ? 'project-dossier panel-visible' : 'project-dossier'}>
			{#if selected !== null}
				<header class="dossier-header">
					<div>
						<span class={selected.project.lifecycle.toLowerCase()}
							>{selected.project.lifecycle}</span
						>
						<h2>{selected.project.name}</h2>
						<p>{selected.project.description}</p>
					</div>
					<small>Updated {formatRelativeTime(selected.project.updatedAt, referenceTime)}</small>
				</header>

				<nav class="dossier-tabs" aria-label="Project dossier sections">
					<button
						type="button"
						class={dossierTab === 'overview' ? 'active' : ''}
						aria-pressed={dossierTab === 'overview'}
						onclick={() => (dossierTab = 'overview')}>Overview</button
					>
					<button
						type="button"
						class={dossierTab === 'deployments' ? 'active' : ''}
						aria-pressed={dossierTab === 'deployments'}
						onclick={() => (dossierTab = 'deployments')}>Deployments</button
					>
					<button
						type="button"
						class={dossierTab === 'resources' ? 'active' : ''}
						aria-pressed={dossierTab === 'resources'}
						onclick={() => (dossierTab = 'resources')}>Resources</button
					>
				</nav>

				{#if dossierTab === 'overview'}
					<section class="project-repository dossier-panel">
						<header><span>GitHub</span><small>Authenticated repository evidence</small></header>
						{#if selected.repository !== null && snapshot !== null}
							<div class="repository-identity">
								<div>
									<span class="observed">Observed</span>
									<strong>{selected.repository.fullName}</strong>
									<small>{selected.repository.defaultBranch ?? 'Default branch unavailable'}</small>
								</div>
								<a
									href={selected.repository.url}
									target="_blank"
									rel="external noreferrer"
									aria-label="Open repository on GitHub"><ArrowUpRight size={15} /></a
								>
							</div>
							<div class="repository-facts">
								<div>
									<strong>{formatInteger(selected.repository.commits)}</strong><span
										>7-day commits</span
									>
								</div>
								<div>
									<strong>{formatInteger(selected.repository.openPullRequests)}</strong><span
										>open PRs</span
									>
								</div>
								<div>
									<strong>{formatInteger(selected.repository.openIssues)}</strong><span
										>open issues</span
									>
								</div>
								<div>
									<strong
										>{formatRelativeTime(
											selected.repository.pushedAt,
											snapshot.generatedAt
										)}</strong
									><span>latest activity</span>
								</div>
							</div>
							<div class="repository-verification">
								{#if selected.workflow !== null}
									<CheckCircle size={15} weight="duotone" />
									<strong
										>{selected.workflow.successful} passed · {selected.workflow.failed} failed · {selected
											.workflow.cancelled} cancelled</strong
									>
								{:else}
									<WarningCircle size={15} weight="duotone" />
									<strong>No repository-specific workflow totals are available.</strong>
								{/if}
								{#if selected.latestArtifact !== null}
									<a
										href={selected.latestArtifact.url}
										target="_blank"
										rel="external noreferrer"
										title={selected.latestArtifact.title}
										>{formatGitHubArtifactTitle(selected.latestArtifact.title)}
										<ArrowUpRight size={12} /></a
									>
								{/if}
							</div>
						{:else}
							<p class="dossier-missing">
								No exact repository match exists in the current GitHub snapshot.
							</p>
						{/if}
					</section>
				{:else if dossierTab === 'deployments'}
					<section class="project-deployments dossier-panel">
						<header>
							<span>Deployments</span>
							<small title={deploymentMessage}
								>{deploymentState === 'Refreshing'
									? 'Refreshing exact records'
									: deploymentState === 'Unavailable'
										? deployments === null
											? 'Collection unavailable'
											: 'Cached exact records'
										: 'Current exact records'}</small
							>
						</header>
						<div class="deployment-list">
							{#each selected.deployments as deployment (deployment.resource.id)}
								<article class="deployment-record">
									<header>
										<div>
											<span
												class={deployment.state === 'Linked'
													? 'linked'
													: deployment.state === 'PartiallyLinked'
														? 'partial'
														: 'unavailable'}>{deploymentStateLabel(deployment.state)}</span
											>
											<strong>{deployment.resource.displayName}</strong>
											<small>{deployment.detail}</small>
										</div>
										<a
											href={deployment.deployment?.evidenceUrl ?? deployment.resource.canonicalUrl}
											target="_blank"
											rel="external noreferrer"
											aria-label={`Open ${deployment.resource.displayName} deployments`}
											><ArrowUpRight size={14} /></a
										>
									</header>
									<div class="deployment-chain">
										<div>
											<span>Pull request</span>
											{#if deployment.pullRequest !== null}
												<a
													href={deployment.pullRequest.url}
													target="_blank"
													rel="external noreferrer"
													>Observed · {formatGitHubArtifactTitle(deployment.pullRequest.title)}</a
												>
											{:else}<strong>Unavailable</strong><small
													>No retained PR has this merge SHA.</small
												>{/if}
										</div>
										<div>
											<span>Merge commit</span>
											{#if deployment.commit !== null}
												<a
													href={deployment.commit.url}
													target="_blank"
													rel="external noreferrer"
													title={deployment.commit.sha}
													>Observed · {shortIdentifier(deployment.commit.sha)}</a
												>
											{:else}<strong>Unavailable</strong><small title={deployment.commitSha ?? ''}
													>{deployment.commitSha === null
														? 'No exact deployment SHA.'
														: shortIdentifier(deployment.commitSha)}</small
												>{/if}
										</div>
										<div>
											<span>Successful workflow</span>
											{#if deployment.workflowRun !== null}
												<a
													href={deployment.workflowRun.url}
													target="_blank"
													rel="external noreferrer">Observed · {deployment.workflowRun.name}</a
												>
											{:else}<strong>Unavailable</strong><small
													>No retained successful run matches.</small
												>{/if}
										</div>
										<div>
											<span>Cloudflare Build</span>
											{#if deployment.activeVersion?.build.state === 'Observed'}
												<strong title={deployment.activeVersion.build.buildId ?? ''}
													>Observed · {shortIdentifier(
														deployment.activeVersion.build.buildId ?? ''
													)}</strong
												><small
													>{deployment.activeVersion.build.status ?? 'Status unavailable'}</small
												>
											{:else if deployment.activeVersion?.build.state === 'NoRecord'}
												<strong>No record</strong><small
													>{deployment.activeVersion.build.detail}</small
												>
											{:else}<strong>Unavailable</strong><small
													>{deployment.activeVersion?.build.detail ??
														'Version evidence unavailable.'}</small
												>{/if}
										</div>
										<div>
											<span>Worker version</span>
											{#if deployment.activeVersion !== null}
												<strong title={deployment.activeVersion.versionId}
													>Observed · {shortIdentifier(deployment.activeVersion.versionId)}</strong
												><small
													>Version {deployment.activeVersion.number ?? '—'} · {deployment
														.activeVersion.percentage}% traffic</small
												>
											{:else}<strong>Unavailable</strong><small
													>No immutable version was retained.</small
												>{/if}
										</div>
										<div>
											<span>Active deployment</span>
											{#if deployment.deployment?.deploymentId !== null && deployment.deployment?.deploymentId !== undefined}
												<strong title={deployment.deployment.deploymentId}
													>Observed · {shortIdentifier(deployment.deployment.deploymentId)}</strong
												><small
													>{deployment.deployment.source ?? 'Source unavailable'} · {formatRelativeTime(
														deployment.deployment.createdAt,
														referenceTime
													)}</small
												>
											{:else}<strong>Unavailable</strong><small
													>No deployment record was returned.</small
												>{/if}
										</div>
									</div>
								</article>
							{:else}
								<p class="dossier-missing">No Cloudflare Worker is linked to this project.</p>
							{/each}
						</div>
					</section>
				{:else}
					<section class="project-resources dossier-panel">
						<header>
							<span>Linked resources</span><small>Exact provider identifiers</small>
						</header>
						<div>
							{#each selected.resources as resource (resource.resource.id)}
								{@const Icon = resourceIcon(resource)}
								<article>
									<Icon size={17} weight="duotone" />
									<div>
										<span class={resource.state.toLowerCase()}>{resource.state}</span>
										<strong>{resource.resource.displayName}</strong>
										<small>{resource.resource.environment} · {resource.detail}</small>
									</div>
									{#if resource.cloudflare?.sizeBytes !== null && resource.cloudflare?.sizeBytes !== undefined}
										<b>{formatCloudflareResourceBytes(resource.cloudflare.sizeBytes)}</b>
									{:else if resource.cloudflare?.modifiedAt}
										<b>{formatRelativeTime(resource.cloudflare.modifiedAt, referenceTime)}</b>
									{/if}
									<a
										href={resource.resource.canonicalUrl}
										target="_blank"
										rel="external noreferrer"
										aria-label={`Open ${resource.resource.displayName}`}
										><ArrowUpRight size={13} /></a
									>
								</article>
							{:else}
								<p class="dossier-missing">No resources are linked to this project.</p>
							{/each}
						</div>
					</section>
				{/if}
			{:else}
				<p class="dossier-missing">Add a project to build its evidence dossier.</p>
			{/if}
		</main>

		<aside class={mobilePanel === 'manage' ? 'project-manage panel-visible' : 'project-manage'}>
			<header><span>Manage registry</span><small>Persisted owner records</small></header>
			{#if selected !== null}
				<form method="POST" action="?/updateOwnerProject" use:enhance>
					<input type="hidden" name="id" value={selected.project.id} />
					<label
						>Name<input name="name" value={selected.project.name} maxlength="180" required /></label
					>
					<label
						>Slug<input
							name="slug"
							value={selected.project.slug}
							pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
							maxlength="64"
							required
						/></label
					>
					<label
						>Lifecycle<select name="lifecycle"
							>{#each ['Active', 'Reviewing', 'Paused', 'Archived'] as lifecycle (lifecycle)}<option
									selected={lifecycle === selected.project.lifecycle}>{lifecycle}</option
								>{/each}</select
						></label
					>
					<label
						>Description<textarea name="description" maxlength="1000" required
							>{selected.project.description}</textarea
						></label
					>
					<button type="submit"><PencilSimple size={13} /> Save details</button>
				</form>

				<details class="resource-create">
					<summary><Plus size={13} /> Link resource</summary>
					<form method="POST" action="?/addOwnerProjectResource" use:enhance={enhanceAndClose}>
						<input type="hidden" name="projectId" value={selected.project.id} />
						<label
							>Type<select name="kind"
								>{#each resourceKinds as kind (kind.id)}<option value={kind.id}>{kind.label}</option
									>{/each}</select
							></label
						>
						<label
							>Environment<select name="environment"
								><option>Production</option><option>Staging</option><option>Development</option
								><option>Shared</option></select
							></label
						>
						<label>Provider ID<input name="providerId" maxlength="512" required /></label>
						<label>Display name<input name="displayName" maxlength="180" required /></label>
						<label
							>Canonical URL<input
								name="canonicalUrl"
								type="url"
								maxlength="2048"
								required
							/></label
						>
						<button type="submit">Link resource</button>
					</form>
				</details>

				<div class="managed-resources">
					{#each selected.project.resources as resource (resource.id)}
						<article>
							<div>
								<strong>{resource.displayName}</strong><small
									>{resource.kind} · {resource.providerId}</small
								>
							</div>
							<form method="POST" action="?/removeOwnerProjectResource" use:enhance>
								<input type="hidden" name="id" value={resource.id} />
								<button type="submit" aria-label={`Remove ${resource.displayName} link`}
									><Trash size={13} /></button
								>
							</form>
						</article>
					{/each}
				</div>
			{:else}
				<p>Select or add a project.</p>
			{/if}
		</aside>
	{/if}
</div>

<style>
	@import '../styles/projects-workspace.css';
</style>
