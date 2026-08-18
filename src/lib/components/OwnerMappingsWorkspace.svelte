<script lang="ts">
	import type { CloudflareDeploymentSnapshot } from '$lib/domain/cloudflare-deployments';
	import type { CloudflareUsageSnapshot } from '$lib/domain/cloudflare-usage';
	import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import type { OwnerProjectSnapshot } from '$lib/domain/owner-project';
	import ProjectsWorkspace from './ProjectsWorkspace.svelte';

	type Props = {
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

	let {
		registry,
		snapshot,
		cloudflare,
		deployments,
		deploymentState,
		deploymentMessage,
		accessReason,
		actionMessage,
		requestedRepository
	}: Props = $props();
</script>

<ProjectsWorkspace
	{registry}
	{snapshot}
	{cloudflare}
	{deployments}
	{deploymentState}
	{deploymentMessage}
	{accessReason}
	{actionMessage}
	{requestedRepository}
/>
