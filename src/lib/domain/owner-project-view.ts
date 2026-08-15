import type { CloudflareResourceEvidence, CloudflareUsageSnapshot } from './cloudflare-usage';
import type {
	DeliveryArtifact,
	GitHubDashboardSnapshot,
	RepositoryIntelligence,
	RepositoryWorkflowSummaryInput
} from './github-intelligence';
import type { OwnerProject, OwnerProjectResource, OwnerProjectSnapshot } from './owner-project';

/** Evidence state for one owner-confirmed project association. */
export type OwnerProjectResourceView = {
	readonly resource: OwnerProjectResource;
	readonly state: 'Observed' | 'Provisioned' | 'Unavailable';
	readonly detail: string;
	readonly cloudflare: CloudflareResourceEvidence | null;
};

/** Joined private dossier for one persisted owner project. */
export type OwnerProjectDossier = {
	readonly project: OwnerProject;
	readonly repository: RepositoryIntelligence | null;
	readonly repositoryState: 'Observed' | 'Unavailable';
	readonly workflow: RepositoryWorkflowSummaryInput | null;
	readonly latestArtifact: DeliveryArtifact | null;
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

/** Join persisted project mappings with authenticated GitHub and Cloudflare evidence. */
export function createOwnerProjectDossiers(
	registry: OwnerProjectSnapshot,
	snapshot: GitHubDashboardSnapshot | null,
	cloudflare: CloudflareUsageSnapshot | null
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
			resources: project.resources.map((resource) => resourceView(resource, snapshot, cloudflare))
		};
	});
}
