import type {
	CloudflareDeploymentSnapshot,
	CloudflareWorkerDeploymentEvidence,
	CloudflareWorkerVersionEvidence
} from './cloudflare-deployments';
import type { CloudflareResourceEvidence, CloudflareUsageSnapshot } from './cloudflare-usage';
import type {
	CommitSignal,
	DeliveryArtifact,
	GitHubDashboardSnapshot,
	PullRequestMergeEvidence,
	RepositoryIntelligence,
	RepositoryWorkflowSummaryInput,
	WorkflowRunInput
} from './github-intelligence';
import {
	PUBLIC_SHIPPING_RESOURCE_KINDS,
	type OwnerProject,
	type OwnerProjectResource,
	type OwnerProjectSnapshot
} from './owner-project';

/** Evidence state for one owner-confirmed project association. */
export type OwnerProjectResourceView = {
	readonly resource: OwnerProjectResource;
	readonly state: 'Observed' | 'Provisioned' | 'Unavailable';
	readonly detail: string;
	readonly cloudflare: CloudflareResourceEvidence | null;
};

/** Exact deployment chain for one owner-linked Worker. */
type OwnerProjectDeploymentView = {
	readonly resource: OwnerProjectResource;
	readonly state: 'Linked' | 'PartiallyLinked' | 'Unavailable';
	readonly detail: string;
	readonly deployment: CloudflareWorkerDeploymentEvidence | null;
	readonly activeVersion: CloudflareWorkerVersionEvidence | null;
	readonly commitSha: string | null;
	readonly commit: CommitSignal | null;
	readonly workflowRun: WorkflowRunInput | null;
	readonly pullRequest: PullRequestMergeEvidence | null;
};

/** Joined private dossier for one persisted owner project. */
export type OwnerProjectDossier = {
	readonly project: OwnerProject;
	readonly repository: RepositoryIntelligence | null;
	readonly repositoryState: 'Observed' | 'Unavailable';
	readonly workflow: RepositoryWorkflowSummaryInput | null;
	readonly latestArtifact: DeliveryArtifact | null;
	readonly deployments: ReadonlyArray<OwnerProjectDeploymentView>;
	readonly resources: ReadonlyArray<OwnerProjectResourceView>;
};

function cloudflareKind(resource: OwnerProjectResource): CloudflareResourceEvidence['kind'] | null {
	switch (resource.kind) {
		case 'CloudflareWorker':
			return 'Worker';
		case 'D1Database':
			return 'D1Database';
		case 'KVNamespace':
			return 'KVNamespace';
		case 'R2Bucket':
			return 'R2Bucket';
		case 'GitHubRepository':
		case 'Domain':
			return null;
	}
}

function resourceView(
	resource: OwnerProjectResource,
	snapshot: GitHubDashboardSnapshot | null,
	cloudflare: CloudflareUsageSnapshot | null
): OwnerProjectResourceView {
	if (resource.kind === 'GitHubRepository') {
		const observed = snapshot?.intelligence.repositories.some(
			(repository) => repository.fullName === resource.providerId
		);
		return {
			resource,
			state: observed === true ? 'Observed' : 'Unavailable',
			detail:
				observed === true
					? 'Matched the authenticated GitHub repository inventory.'
					: 'No matching repository exists in the current GitHub snapshot.',
			cloudflare: null
		};
	}
	if (resource.kind === 'Domain') {
		return {
			resource,
			state: 'Provisioned',
			detail: 'Owner-confirmed endpoint stored in the private project registry.',
			cloudflare: null
		};
	}
	const kind = cloudflareKind(resource);
	const observed = cloudflare?.resources.find(
		(item) => item.kind === kind && item.providerId === resource.providerId
	);
	return {
		resource,
		state: observed === undefined ? 'Unavailable' : 'Provisioned',
		detail:
			observed === undefined
				? cloudflare === null
					? 'Cloudflare inventory is unavailable.'
					: 'No matching resource exists in the current Cloudflare inventory.'
				: 'Matched the current Cloudflare account inventory.',
		cloudflare: observed ?? null
	};
}

function annotationCommitSha(message: string | null): string | null {
	const match = /^git:([0-9a-f]{40})$/i.exec(message ?? '');
	return match?.[1]?.toLocaleLowerCase() ?? null;
}

function deploymentView(
	resource: OwnerProjectResource,
	repository: RepositoryIntelligence | null,
	snapshot: GitHubDashboardSnapshot | null,
	deployments: CloudflareDeploymentSnapshot | null
): OwnerProjectDeploymentView {
	const deployment =
		deployments?.workers.find((worker) => worker.workerName === resource.providerId) ?? null;
	const activeVersion =
		deployment === null
			? null
			: ([...deployment.versions].sort((left, right) => right.percentage - left.percentage)[0] ??
				null);
	const deploymentSha = annotationCommitSha(deployment?.message ?? null);
	const versionSha = annotationCommitSha(activeVersion?.message ?? null);
	const annotationsConflict =
		deploymentSha !== null && versionSha !== null && deploymentSha !== versionSha;
	const commitSha = annotationsConflict ? null : (versionSha ?? deploymentSha);
	const commit =
		commitSha === null || repository === null || snapshot === null
			? null
			: (snapshot.intelligence.commits.find(
					(item) => item.repository === repository.fullName && item.sha === commitSha
				) ?? null);
	const workflowRun =
		commitSha === null || repository === null || snapshot === null
			? null
			: (snapshot.intelligence.delivery.workflows.current.recent.find(
					(run) =>
						run.repository === repository.fullName &&
						run.headSha === commitSha &&
						run.status === 'completed' &&
						run.conclusion === 'success'
				) ?? null);
	const pullRequest =
		commitSha === null || repository === null || snapshot === null
			? null
			: (snapshot.intelligence.delivery.pullRequestMerges.find(
					(pullRequest) =>
						pullRequest.repository === repository.fullName &&
						pullRequest.mergeCommitSha === commitSha
				) ?? null);
	const buildMatches =
		activeVersion?.build.state === 'Observed' && activeVersion.build.commitSha === commitSha;
	const state =
		deployment?.state !== 'Observed' || activeVersion === null || commitSha === null
			? 'Unavailable'
			: commit !== null && workflowRun !== null && pullRequest !== null && buildMatches
				? 'Linked'
				: 'PartiallyLinked';
	let detail = 'No readable deployment and immutable version pair is available.';
	if (annotationsConflict) {
		detail = 'Deployment and version annotations name different Git commits.';
	} else if (state === 'Linked') {
		detail =
			'PR, merge commit, successful workflow, Cloudflare Build, version, and deployment match.';
	} else if (state === 'PartiallyLinked') {
		detail = 'The deployment names an exact Git commit; missing chain records remain separate.';
	}
	return {
		resource,
		state,
		detail,
		deployment,
		activeVersion,
		commitSha,
		commit,
		workflowRun,
		pullRequest
	};
}

/** Join persisted project mappings with authenticated GitHub and Cloudflare evidence. */
export function createOwnerProjectDossiers(
	registry: OwnerProjectSnapshot,
	snapshot: GitHubDashboardSnapshot | null,
	cloudflare: CloudflareUsageSnapshot | null,
	deployments: CloudflareDeploymentSnapshot | null = null
): ReadonlyArray<OwnerProjectDossier> {
	return registry.projects.map((project) => {
		const repositoryLink = project.resources.find(
			(resource) => resource.kind === 'GitHubRepository'
		);
		const repository =
			repositoryLink === undefined || snapshot === null
				? null
				: (snapshot.intelligence.repositories.find(
						(item) => item.fullName === repositoryLink.providerId
					) ?? null);
		const workflow =
			repository === null || snapshot === null
				? null
				: (snapshot.intelligence.delivery.workflows.current.repositories.find(
						(item) => item.repository === repository.fullName
					) ?? null);
		const latestArtifact =
			repository === null || snapshot === null
				? null
				: (snapshot.intelligence.delivery.artifacts.find(
						(artifact) => artifact.repository === repository.fullName
					) ?? null);
		return {
			project,
			repository,
			repositoryState: repository === null ? 'Unavailable' : 'Observed',
			workflow,
			latestArtifact,
			deployments: project.resources
				.filter((resource) => resource.kind === 'CloudflareWorker')
				.map((resource) => deploymentView(resource, repository, snapshot, deployments)),
			resources: project.resources.map((resource) => resourceView(resource, snapshot, cloudflare))
		};
	});
}

type PublicShippingKind = (typeof PUBLIC_SHIPPING_RESOURCE_KINDS)[number];

function isPublicShippingKind(kind: OwnerProjectResource['kind']): kind is PublicShippingKind {
	return PUBLIC_SHIPPING_RESOURCE_KINDS.some((allowed) => allowed === kind);
}

/** True when a URL would expose a Cloudflare account dashboard path. */
export function isCloudflareDashboardUrl(url: string): boolean {
	try {
		const hostname = new URL(url).hostname.replace(/\.+$/, '').toLocaleLowerCase();
		return hostname === 'dash.cloudflare.com';
	} catch {
		// Fail closed: an unparseable stored URL is never treated as a public link.
		return true;
	}
}

function publicHref(canonicalUrl: string): string | null {
	return isCloudflareDashboardUrl(canonicalUrl) ? null : canonicalUrl;
}

function mappedGitHubProviderIds(
	projects: ReadonlyArray<PublicProjectShipping>
): ReadonlySet<string> {
	return new Set(
		projects.flatMap((project) =>
			project.links
				.filter((link) => link.kind === 'GitHubRepository')
				.map((link) => link.providerId)
		)
	);
}

function mappedShippingProjects(
	registry: OwnerProjectSnapshot,
	snapshot: GitHubDashboardSnapshot | null,
	deployments: CloudflareDeploymentSnapshot | null
): ReadonlyArray<PublicProjectShipping> {
	return registry.projects
		.filter((project) => project.resources.some((resource) => isPublicShippingKind(resource.kind)))
		.map((project) => {
			const repositoryLink = project.resources.find(
				(resource) => resource.kind === 'GitHubRepository'
			);
			const repository =
				repositoryLink === undefined || snapshot === null
					? null
					: (snapshot.intelligence.repositories.find(
							(item) => item.fullName === repositoryLink.providerId
						) ?? null);
			return {
				id: project.id,
				name: project.name,
				description: project.description,
				links: project.resources.flatMap((resource) =>
					isPublicShippingKind(resource.kind)
						? [
								{
									kind: resource.kind,
									providerId: resource.providerId,
									displayName: resource.displayName,
									href: publicHref(resource.canonicalUrl)
								}
							]
						: []
				),
				deployments: project.resources
					.filter((resource) => resource.kind === 'CloudflareWorker')
					.map((resource) => {
						const joined = deploymentView(resource, repository, snapshot, deployments);
						return {
							workerName: resource.providerId,
							state: joined.state,
							detail: joined.detail,
							commitSha: joined.commitSha
						};
					})
			};
		});
}

function observedGitHubShippingProjects(
	snapshot: GitHubDashboardSnapshot | null,
	mappedProviderIds: ReadonlySet<string>
): ReadonlyArray<PublicProjectShipping> {
	if (snapshot === null) return [];
	return snapshot.intelligence.repositories
		.filter(
			(repository) =>
				repository.commits > 0 &&
				repository.isArchived === false &&
				mappedProviderIds.has(repository.fullName) === false
		)
		.map((repository): PublicProjectShipping => ({
			id: `github:${repository.fullName}`,
			name: repository.name,
			description: repository.description,
			links: [
				{
					kind: 'GitHubRepository',
					providerId: repository.fullName,
					displayName: repository.fullName,
					href: publicHref(repository.url)
				}
			],
			deployments: []
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

/** One public shipping link for a confirmed GitHub, Worker, or domain identity. */
export type PublicShippingLink = {
	readonly kind: PublicShippingKind;
	readonly providerId: string;
	readonly displayName: string;
	readonly href: string | null;
};

/** Deployment join facts stripped of operator identity and account dashboard URLs. */
export type PublicShippingDeployment = {
	readonly workerName: string;
	readonly state: 'Linked' | 'PartiallyLinked' | 'Unavailable';
	readonly detail: string;
	readonly commitSha: string | null;
};

/** One public project card. Does not embed OwnerProject or D1/KV/R2 resources. */
export type PublicProjectShipping = {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly links: ReadonlyArray<PublicShippingLink>;
	readonly deployments: ReadonlyArray<PublicShippingDeployment>;
};

/** Public load payload for Projects. */
export type PublicShippingProjection = {
	readonly _tag: 'Current' | 'Unavailable';
	readonly reason: string;
	readonly projects: ReadonlyArray<PublicProjectShipping>;
};

/** Build the public shipping-link projection. Does not use CloudflareUsageSnapshot. */
export function createPublicShippingProjection(
	registry: OwnerProjectSnapshot | null,
	snapshot: GitHubDashboardSnapshot | null,
	deployments: CloudflareDeploymentSnapshot | null,
	access: { readonly _tag: 'Current' | 'Unavailable'; readonly reason: string }
): PublicShippingProjection {
	const mapped = registry === null ? [] : mappedShippingProjects(registry, snapshot, deployments);
	const projects = [
		...mapped,
		...observedGitHubShippingProjects(snapshot, mappedGitHubProviderIds(mapped))
	];
	return {
		_tag: projects.length > 0 ? 'Current' : access._tag,
		reason: access.reason,
		projects
	};
}
