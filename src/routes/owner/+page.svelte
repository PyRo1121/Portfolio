<script lang="ts">
	import {
		ArrowClockwiseIcon as ArrowClockwise,
		CommandIcon as Command,
		GithubLogoIcon as GithubLogo,
		LockSimpleIcon as LockSimple
	} from 'phosphor-svelte';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import CareerAccountabilityWorkspace from '$lib/components/CareerAccountabilityWorkspace.svelte';
	import CloudflareWorkspace from '$lib/components/CloudflareWorkspace.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import OwnerBriefingWorkspace from '$lib/components/OwnerBriefingWorkspace.svelte';
	import OwnerMappingsWorkspace from '$lib/components/OwnerMappingsWorkspace.svelte';
	import TelemetryWorkspace from '$lib/components/TelemetryWorkspace.svelte';
	import WorkspaceRail from '$lib/components/WorkspaceRail.svelte';
	import { createCareerAccountabilityReview } from '$lib/domain/career-review';
	import { createCareerStoryEvidenceOptions } from '$lib/domain/career-story-evidence';
	import type {
		CloudflareDeploymentRefreshResult,
		CloudflareDeploymentSnapshot
	} from '$lib/domain/cloudflare-deployments';
	import type {
		CloudflareUsageRefreshResult,
		CloudflareUsageSnapshot
	} from '$lib/domain/cloudflare-usage';
	import {
		resolvedViewerTimeZone,
		SSR_VIEWER_TIME_ZONE,
		zonedDateKey
	} from '$lib/domain/dashboard-time';
	import {
		ownerWorkspaceDefinitions,
		shortcutMapFor,
		type DashboardWorkspace
	} from '$lib/domain/dashboard-workspace';
	import { createOwnerBriefingView } from '$lib/domain/owner-briefing';
	import { createOwnerWorkspaceSignals } from '$lib/domain/owner-workspace-navigation';
	import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import { getClientTelemetry } from '$lib/telemetry/client-telemetry';
	import { DashboardView } from '$lib/state/dashboard-view.svelte';

	let { data, form }: PageProps = $props();
	let freshSnapshot: GitHubDashboardSnapshot | null = $state.raw(null);
	let snapshot: GitHubDashboardSnapshot | null = $derived(freshSnapshot ?? data.snapshot);
	let freshCloudflare: CloudflareUsageSnapshot | null = $state.raw(null);
	let cloudflare: CloudflareUsageSnapshot | null = $derived(freshCloudflare ?? data.cloudflare);
	let freshCloudflareDeployments: CloudflareDeploymentSnapshot | null = $state.raw(null);
	let cloudflareDeployments: CloudflareDeploymentSnapshot | null = $derived(
		freshCloudflareDeployments ?? data.cloudflareDeployments
	);
	let refreshState = $state<'Refreshing' | 'Current' | 'Fresh' | 'Unavailable'>('Refreshing');
	let refreshMessage = $state('');
	let cloudflareRefreshState = $state<'Refreshing' | 'Current' | 'Fresh' | 'Unavailable'>(
		'Refreshing'
	);
	let cloudflareMessage = $state('');
	let deploymentRefreshState = $state<'Refreshing' | 'Current' | 'Fresh' | 'Unavailable'>(
		'Refreshing'
	);
	let deploymentMessage = $state('');
	let viewerTimeZone = $derived(SSR_VIEWER_TIME_ZONE);
	let clockMs = $state(Date.now());
	const viewerToday = $derived(zonedDateKey(new Date(clockMs), viewerTimeZone));
	const dashboardView = new DashboardView({
		initialWorkspace: 'briefing',
		shortcuts: shortcutMapFor(ownerWorkspaceDefinitions)
	});
	const clientTelemetry = getClientTelemetry();
	const accountabilityReview = $derived(
		snapshot === null || data.career === null
			? null
			: createCareerAccountabilityReview(snapshot, data.career, cloudflare, viewerToday)
	);
	const storyEvidenceOptions = $derived(
		snapshot === null ? [] : createCareerStoryEvidenceOptions(snapshot)
	);
	const briefingView = $derived(
		createOwnerBriefingView(data.career, viewerToday, data.careerAccess.reason)
	);
	const workspaceSignals = $derived(
		createOwnerWorkspaceSignals({
			briefing: briefingView,
			career: data.career,
			today: viewerToday,
			cloudflare,
			telemetry: data.telemetry,
			registry: data.ownerProjects
		})
	);
	const telemetryReferenceTime = $derived(
		data.telemetry?.recent.at(0)?.recordedAt ?? new Date().toISOString()
	);
	const connectionClass = $derived(
		refreshState === 'Refreshing' ? 'connection refreshing' : 'connection'
	);
	const status = $derived.by(() => {
		if (dashboardView.refreshError !== null) return 'Owner · refresh failed';
		if (refreshState === 'Refreshing') return 'Owner · refreshing';
		if (refreshState === 'Unavailable') return 'Owner · cached';
		return 'Owner · current';
	});
	const refreshIconClass = $derived(
		dashboardView.isRefreshing || refreshState === 'Refreshing' ? 'spinning' : ''
	);

	function openOwnerWorkspace(workspace: DashboardWorkspace): void {
		dashboardView.navigate(workspace);
	}

	$effect(() => {
		viewerTimeZone = resolvedViewerTimeZone();
	});

	$effect(() => {
		const id = window.setInterval(() => {
			clockMs = Date.now();
		}, 60_000);
		return () => window.clearInterval(id);
	});

	$effect(() => {
		if (clientTelemetry === null) return;
		clientTelemetry.recordWorkspace(dashboardView.activeWorkspace);
	});

	$effect(() => {
		const activeRefresh = data.refresh;
		freshSnapshot = null;
		refreshState = 'Refreshing';
		refreshMessage = data.cache.cachedAt === null ? '' : `cached ${data.cache.cachedAt}`;
		let cancelled = false;
		let retryId: number | undefined;
		void activeRefresh.then((result) => {
			if (cancelled) return;
			if (result._tag === 'Deferred') {
				refreshState = 'Refreshing';
				refreshMessage = 'Another edge isolate is publishing verified evidence.';
				retryId = window.setTimeout(() => void invalidateAll(), result.retryAfterMs);
				return;
			}
			refreshState = result._tag;
			if (result._tag === 'Fresh') freshSnapshot = result.snapshot;
			if (result._tag === 'Unavailable') refreshMessage = result.reason;
		});
		return () => {
			cancelled = true;
			if (retryId !== undefined) window.clearTimeout(retryId);
		};
	});

	$effect(() => {
		const activeRefresh = data.cloudflareRefresh;
		freshCloudflare = null;
		cloudflareRefreshState = 'Refreshing';
		cloudflareMessage =
			data.cloudflareCache.cachedAt === null ? '' : `cached ${data.cloudflareCache.cachedAt}`;
		let cancelled = false;
		let retryId: number | undefined;
		void activeRefresh.then((result: CloudflareUsageRefreshResult) => {
			if (cancelled) return;
			if (result._tag === 'Deferred') {
				cloudflareRefreshState = 'Refreshing';
				cloudflareMessage = 'Another edge isolate is publishing Cloudflare evidence.';
				retryId = window.setTimeout(() => void invalidateAll(), result.retryAfterMs);
				return;
			}
			cloudflareRefreshState = result._tag;
			if (result._tag === 'Fresh') freshCloudflare = result.snapshot;
			if (result._tag === 'Unavailable') cloudflareMessage = result.reason;
		});
		return () => {
			cancelled = true;
			if (retryId !== undefined) window.clearTimeout(retryId);
		};
	});

	$effect(() => {
		const activeRefresh = data.cloudflareDeploymentRefresh;
		freshCloudflareDeployments = null;
		deploymentRefreshState = 'Refreshing';
		deploymentMessage =
			data.cloudflareDeploymentCache.cachedAt === null
				? data.cloudflareDeploymentCache._tag === 'Cold'
					? 'Warming deployment evidence.'
					: ''
				: `cached ${data.cloudflareDeploymentCache.cachedAt}`;
		let cancelled = false;
		let retryId: number | undefined;
		void activeRefresh.then((result: CloudflareDeploymentRefreshResult) => {
			if (cancelled) return;
			if (result._tag === 'Deferred') {
				deploymentRefreshState = 'Refreshing';
				deploymentMessage = 'Another edge isolate is publishing deployment evidence.';
				retryId = window.setTimeout(() => void invalidateAll(), result.retryAfterMs);
				return;
			}
			deploymentRefreshState = result._tag;
			if (result._tag === 'Fresh') freshCloudflareDeployments = result.snapshot;
			if (result._tag === 'Unavailable') deploymentMessage = result.reason;
		});
		return () => {
			cancelled = true;
			if (retryId !== undefined) window.clearTimeout(retryId);
		};
	});
</script>

<svelte:head>
	<title>Owner home — Weeknote</title>
	<meta name="robots" content="noindex" />
</svelte:head>
<a class="skip-link" href="#workspace-stage">Skip to dashboard</a>

<div class="app" {@attach dashboardView.attachApplication}>
	<header class="topbar">
		<div class="brand-group">
			<a class="brand" href={resolve('/')} aria-label="Public portfolio">
				<GithubLogo size={18} weight="fill" /><span>Olen Latham</span>
			</a>
		</div>
		<WorkspaceRail
			workspaces={ownerWorkspaceDefinitions}
			activeWorkspace={dashboardView.activeWorkspace}
			signals={workspaceSignals}
			onWorkspace={openOwnerWorkspace}
		/>
		<div class="actions">
			<span class={connectionClass} title={dashboardView.refreshError ?? refreshMessage}>
				<i></i><LockSimple size={12} />{status}
			</span>
			<button
				type="button"
				onclick={() => dashboardView.toggleCommand()}
				aria-label="Open navigation palette"><Command size={15} /><kbd>⌘K</kbd></button
			>
			<button
				type="button"
				onclick={() => dashboardView.refresh(invalidateAll)}
				disabled={dashboardView.isRefreshing}
				aria-label="Refresh owner data"
				><ArrowClockwise size={16} class={refreshIconClass} /></button
			>
		</div>
	</header>

	<main id="workspace-stage" class="stage">
		{#if dashboardView.activeWorkspace === 'briefing'}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('briefing')}
			>
				<OwnerBriefingWorkspace view={briefingView} onWorkspace={openOwnerWorkspace} />
			</section>
		{:else if dashboardView.activeWorkspace === 'career'}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('career')}
			>
				<CareerAccountabilityWorkspace
					snapshot={data.career}
					evidenceOptions={storyEvidenceOptions}
					review={accountabilityReview}
					accessReason={data.careerAccess.reason}
					today={viewerToday}
					actionMessage={form?.careerMessage ?? ''}
				/>
			</section>
		{:else if dashboardView.activeWorkspace === 'cloudflare'}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('cloudflare')}
			>
				<CloudflareWorkspace
					snapshot={cloudflare}
					refreshState={cloudflareRefreshState}
					message={cloudflareMessage}
				/>
			</section>
		{:else if dashboardView.activeWorkspace === 'telemetry'}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('telemetry')}
			>
				<TelemetryWorkspace
					view={data.telemetry}
					{cloudflare}
					referenceTime={telemetryReferenceTime}
				/>
			</section>
		{:else}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('mappings')}
			>
				<OwnerMappingsWorkspace
					registry={data.ownerProjects}
					{snapshot}
					{cloudflare}
					deployments={cloudflareDeployments}
					deploymentState={deploymentRefreshState}
					{deploymentMessage}
					accessReason={data.ownerProjectAccess.reason}
					actionMessage={form?.ownerProjectMessage ?? ''}
					requestedRepository={dashboardView.selectedRepository}
				/>
			</section>
		{/if}
	</main>
	<CommandPalette
		open={dashboardView.commandOpen}
		workspaces={ownerWorkspaceDefinitions}
		onClose={() => dashboardView.closeCommand()}
		onWorkspace={openOwnerWorkspace}
	/>
</div>
