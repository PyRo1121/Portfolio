<script lang="ts">
	import {
		ArrowUpRightIcon as ArrowUpRight,
		FolderOpenIcon as FolderOpen,
		WarningCircleIcon as WarningCircle
	} from 'phosphor-svelte';
	import type { PublicShippingProjection } from '$lib/domain/owner-project-view';

	type Props = {
		readonly shipping: PublicShippingProjection;
		readonly requestedRepository: string | null;
	};

	let { shipping, requestedRepository }: Props = $props();
	let selectedProjectId = $state('');
	let mobilePanel = $state<'projects' | 'dossier'>('dossier');
	const shippingProjects = $derived(shipping.projects);
	const selectedShipping = $derived(
		shippingProjects.find((project) => project.id === selectedProjectId) ??
			shippingProjects.find((project) =>
				project.links.some(
					(link) => link.kind === 'GitHubRepository' && link.providerId === requestedRepository
				)
			) ??
			shippingProjects[0] ??
			null
	);

	function selectProject(id: string): void {
		selectedProjectId = id;
		mobilePanel = 'dossier';
	}

	function shortIdentifier(value: string): string {
		return value.length > 16 ? value.slice(0, 12) : value;
	}

	function deploymentStateLabel(state: 'Linked' | 'PartiallyLinked' | 'Unavailable'): string {
		return state === 'PartiallyLinked' ? 'Partially linked' : state;
	}
</script>

<div class="projects-screen projects-screen--public">
	<nav class="workspace-pages" aria-label="Project panels">
		<button
			type="button"
			class={mobilePanel === 'projects' ? 'active' : ''}
			aria-pressed={mobilePanel === 'projects'}
			onclick={() => (mobilePanel = 'projects')}>Projects</button
		>
		<button
			type="button"
			class={mobilePanel === 'dossier' ? 'active' : ''}
			aria-pressed={mobilePanel === 'dossier'}
			onclick={() => (mobilePanel = 'dossier')}>Dossier</button
		>
	</nav>

	<header class="projects-overview">
		<div>
			<span><FolderOpen size={14} weight="fill" /> Linked identities</span>
			<h1>Projects</h1>
			<p>GitHub work from this window, plus confirmed Worker and domain links.</p>
		</div>
		{#if shipping._tag === 'Current'}
			<section aria-label="Shipping summary">
				<div><strong>{shippingProjects.length}</strong><span>projects</span></div>
				<div>
					<strong>{selectedShipping?.links.length ?? 0}</strong><span>linked identities</span>
				</div>
				<div>
					<strong>{selectedShipping?.deployments.length ?? 0}</strong><span>deployment records</span
					>
				</div>
			</section>
		{:else}
			<section class="projects-unavailable">
				<WarningCircle size={20} weight="duotone" />
				<strong>Linked identities unavailable</strong>
				<span>{shipping.reason}</span>
			</section>
		{/if}
	</header>

	{#if shipping._tag === 'Current'}
		<aside class={mobilePanel === 'projects' ? 'project-list panel-visible' : 'project-list'}>
			<header>
				<span>Linked projects</span><small>Owner-confirmed public identities</small>
			</header>
			<div>
				{#each shippingProjects as project (project.id)}
					<button
						type="button"
						class={selectedShipping?.id === project.id ? 'active' : ''}
						aria-pressed={selectedShipping?.id === project.id}
						onclick={() => selectProject(project.id)}
					>
						<strong>{project.name}</strong>
						<small>{project.links.length} linked identities</small>
					</button>
				{:else}
					<p>No confirmed public identities are published.</p>
				{/each}
			</div>
		</aside>

		<main class={mobilePanel === 'dossier' ? 'project-dossier panel-visible' : 'project-dossier'}>
			{#if selectedShipping !== null}
				<header class="dossier-header">
					<div>
						<h2>{selectedShipping.name}</h2>
						<p>{selectedShipping.description}</p>
					</div>
				</header>
				<section class="project-resources dossier-panel">
					<header><span>Linked identities</span><small>GitHub, Worker, and domain</small></header>
					<div>
						{#each selectedShipping.links as link (`${link.kind}:${link.providerId}`)}
							<article>
								<div>
									<span class="observed">{link.kind}</span>
									<strong>{link.displayName}</strong>
									<small>{link.providerId}</small>
								</div>
								{#if link.href !== null}
									<a
										href={link.href}
										target="_blank"
										rel="external noreferrer"
										aria-label={`Open ${link.displayName}`}><ArrowUpRight size={13} /></a
									>
								{/if}
							</article>
						{:else}
							<p class="dossier-missing">No public identities are attached.</p>
						{/each}
					</div>
				</section>
				<section class="project-deployments dossier-panel">
					<header>
						<span>Worker deployments</span><small>Join facts without operator identity</small>
					</header>
					<div class="deployment-list">
						{#each selectedShipping.deployments as deployment (deployment.workerName)}
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
										<strong>{deployment.workerName}</strong>
										<small>{deployment.detail}</small>
									</div>
								</header>
								{#if deployment.commitSha !== null}
									<p class="dossier-missing">
										Commit {shortIdentifier(deployment.commitSha)}
									</p>
								{/if}
							</article>
						{:else}
							<p class="dossier-missing">No Worker deployment facts are published.</p>
						{/each}
					</div>
				</section>
			{:else}
				<p class="dossier-missing">No confirmed projects are published yet.</p>
			{/if}
		</main>
	{/if}
</div>

<style>
	@import '../styles/projects-workspace.css';
</style>
