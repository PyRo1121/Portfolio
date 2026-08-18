<script lang="ts">
	import {
		ArrowClockwiseIcon as ArrowClockwise,
		CommandIcon as Command,
		EnvelopeSimpleIcon as EnvelopeSimple,
		GithubLogoIcon as GithubLogo,
		GlobeSimpleIcon as GlobeSimple,
		XLogoIcon as XLogo
	} from 'phosphor-svelte';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import ActivityWorkspace from '$lib/components/ActivityWorkspace.svelte';
	import BriefWorkspace from '$lib/components/BriefWorkspace.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import CraftWorkspace from '$lib/components/CraftWorkspace.svelte';
	import DashboardSkeleton from '$lib/components/DashboardSkeleton.svelte';
	import DeliveryWorkspace from '$lib/components/DeliveryWorkspace.svelte';
	import ProjectsWorkspace from '$lib/components/ProjectsWorkspace.svelte';
	import TodayWorkspace from '$lib/components/TodayWorkspace.svelte';
	import WorkspaceRail from '$lib/components/WorkspaceRail.svelte';
	import { createWorkspaceSignals } from '$lib/domain/dashboard-navigation';
	import { resolvedViewerTimeZone, SSR_VIEWER_TIME_ZONE } from '$lib/domain/dashboard-time';
	import { publicWorkspaceDefinitions, shortcutMapFor } from '$lib/domain/dashboard-workspace';
	import { createViewerActivityProjection } from '$lib/domain/dashboard-viewer-time';
	import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import { createPublicShippingNavigationSignal } from '$lib/domain/owner-project-navigation';
	import { getClientTelemetry } from '$lib/telemetry/client-telemetry';
	import { DashboardView } from '$lib/state/dashboard-view.svelte';

	let { data }: PageProps = $props();
	let freshSnapshot: GitHubDashboardSnapshot | null = $state.raw(null);
	let snapshot: GitHubDashboardSnapshot | null = $derived(freshSnapshot ?? data.snapshot);
	let refreshState = $state<'Refreshing' | 'Current' | 'Fresh' | 'Unavailable'>('Refreshing');
	let refreshMessage = $state('');
	let viewerTimeZone = $derived(SSR_VIEWER_TIME_ZONE);
	const dashboardView = new DashboardView({
		initialWorkspace: 'today',
		shortcuts: shortcutMapFor(publicWorkspaceDefinitions)
	});
	const clientTelemetry = getClientTelemetry();
	const viewerProjection = $derived(
		snapshot === null ? null : createViewerActivityProjection(snapshot, viewerTimeZone)
	);
	const workspaceSignals = $derived.by(() => {
		if (snapshot === null || viewerProjection === null) return null;
		return {
			...createWorkspaceSignals(snapshot, viewerProjection),
			repositories: createPublicShippingNavigationSignal(data.shipping)
		};
	});
	const connectionClass = $derived(
		refreshState === 'Refreshing' ? 'connection refreshing' : 'connection'
	);
	const status = $derived.by(() => {
		if (refreshState === 'Refreshing')
			return snapshot === null ? 'Warming cache' : 'Public · refreshing';
		if (refreshState === 'Unavailable')
			return snapshot === null ? 'GitHub delayed' : 'Public · cached';
		return 'Public · current';
	});
	const refreshIconClass = $derived(
		dashboardView.isRefreshing || refreshState === 'Refreshing' ? 'spinning' : ''
	);

	$effect(() => {
		viewerTimeZone = resolvedViewerTimeZone();
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
		void activeRefresh.then((result) => {
			if (cancelled) return;
			refreshState = result._tag;
			if (result._tag === 'Fresh') freshSnapshot = result.snapshot;
			if (result._tag === 'Unavailable') refreshMessage = result.reason;
		});
		return () => {
			cancelled = true;
		};
	});
</script>

<svelte:head>
	<meta
		name="description"
		content="Olen Latham’s public engineering dashboard covering GitHub development activity, software projects, deployments, Cloudflare Workers, and a transition into full-stack development."
	/>
	<link rel="canonical" href="https://latham.cloud/" />
	<meta property="og:type" content="profile" />
	<meta
		property="og:title"
		content="Olen Latham - Software developer building toward full-stack work"
	/>
	<meta
		property="og:description"
		content="Public engineering activity, delivery evidence, deployments, and Cloudflare projects."
	/>
	<meta property="og:url" content="https://latham.cloud/" />
	<meta property="og:image" content="https://latham.cloud/og-image.svg" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="theme-color" content="#0b0d0e" />
	<link rel="icon" href="/og-image.svg" type="image/svg+xml" />
	<meta
		name="twitter:title"
		content="Olen Latham - Software developer building toward full-stack work"
	/>
	<meta
		name="twitter:description"
		content="Public engineering activity, delivery evidence, deployments, and Cloudflare projects."
	/>
	<meta name="twitter:image" content="https://latham.cloud/og-image.svg" />
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "ProfilePage",
			"@id": "https://latham.cloud/#profile",
			"url": "https://latham.cloud/",
			"name": "Olen Latham - Software developer building toward full-stack work",
			"mainEntity": {
				"@type": "Person",
				"@id": "https://latham.cloud/#olen-latham",
				"name": "Olen Latham",
				"url": "https://latham.cloud/",
				"jobTitle": "Software developer",
				"sameAs": ["https://github.com/PyRo1121", "https://x.com/PyRo1121"]
			}
		}
	</script>
	<title>Olen Latham — Software developer building toward full-stack work</title>
</svelte:head>
<a class="skip-link" href="#workspace-stage">Skip to dashboard</a>

<div class="app" {@attach dashboardView.attachApplication}>
	<header class="topbar">
		{#if snapshot === null}
			<span class="brand"><GithubLogo size={18} weight="fill" /><span>Olen Latham</span></span>
		{:else}
			<div class="brand-group">
				<a
					class="brand"
					href="https://github.com/PyRo1121"
					target="_blank"
					rel="external noreferrer"
				>
					<span class="brand__portrait">
						<img
							src={snapshot.profile.avatarUrl}
							alt=""
							width="30"
							height="30"
							fetchpriority="high"
						/>
					</span>
					<span class="brand__identity"><strong>Olen Latham</strong></span>
				</a>
				<nav class="social-links" aria-label="Social profiles">
					<a
						href="https://github.com/PyRo1121"
						target="_blank"
						rel="external noreferrer"
						aria-label="Olen Latham on GitHub"
						title="GitHub"><GithubLogo size={15} weight="fill" /></a
					>
					<a
						href="https://x.com/PyRo1121"
						target="_blank"
						rel="external noreferrer"
						aria-label="Olen Latham on X"
						title="X"><XLogo size={15} weight="fill" /></a
					>
					<a href="mailto:olen@latham.cloud" aria-label="Email Olen Latham" title="Email"
						><EnvelopeSimple size={15} weight="fill" /></a
					>
				</nav>
			</div>
		{/if}
		<WorkspaceRail
			workspaces={publicWorkspaceDefinitions}
			activeWorkspace={dashboardView.activeWorkspace}
			signals={workspaceSignals}
			onWorkspace={(workspace) => {
				dashboardView.navigate(workspace);
				clientTelemetry?.recordWorkspace(workspace);
			}}
		/>
		<div class="actions">
			<span class={connectionClass} title={refreshMessage}>
				<i></i><GlobeSimple size={12} />{status}
			</span>
			<a href={resolve('/owner')} data-sveltekit-reload aria-label="Owner home">Owner</a>
			<button
				type="button"
				onclick={() => dashboardView.toggleCommand()}
				aria-label="Open navigation palette"><Command size={15} /><kbd>⌘K</kbd></button
			>
			<button
				type="button"
				onclick={() => dashboardView.refresh(invalidateAll)}
				disabled={dashboardView.isRefreshing}
				aria-label="Refresh GitHub data"
				><ArrowClockwise size={16} class={refreshIconClass} /></button
			>
		</div>
	</header>

	<main id="workspace-stage" class="stage">
		{#if dashboardView.activeWorkspace === 'repositories'}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('repositories')}
			>
				<ProjectsWorkspace
					audience="public"
					shipping={data.shipping}
					requestedRepository={dashboardView.selectedRepository}
				/>
			</section>
		{:else if snapshot === null}
			<DashboardSkeleton
				failed={refreshState === 'Unavailable'}
				message={refreshMessage}
				onRetry={() => invalidateAll()}
			/>
		{:else if viewerProjection !== null}
			<section
				class={dashboardView.activeWorkspace === 'today' ? 'active' : ''}
				aria-hidden={dashboardView.activeWorkspace !== 'today'}
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('today')}
			>
				<TodayWorkspace {snapshot} projection={viewerProjection} />
			</section>
			<section
				class={dashboardView.activeWorkspace === 'brief' ? 'active' : ''}
				aria-hidden={dashboardView.activeWorkspace !== 'brief'}
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('brief')}
			>
				<BriefWorkspace
					{snapshot}
					projection={viewerProjection}
					onSelectRepository={(fullName) => {
						dashboardView.selectRepository(fullName);
						dashboardView.navigate('repositories');
						clientTelemetry?.recordWorkspace('repositories');
					}}
				/>
			</section>
			<section
				class={dashboardView.activeWorkspace === 'delivery' ? 'active' : ''}
				aria-hidden={dashboardView.activeWorkspace !== 'delivery'}
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('delivery')}
			>
				<DeliveryWorkspace {snapshot} />
			</section>
			<section
				class={dashboardView.activeWorkspace === 'craft' ? 'active' : ''}
				aria-hidden={dashboardView.activeWorkspace !== 'craft'}
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('craft')}
			>
				<CraftWorkspace {snapshot} />
			</section>
			<section
				class={dashboardView.activeWorkspace === 'activity' ? 'active' : ''}
				aria-hidden={dashboardView.activeWorkspace !== 'activity'}
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('activity')}
			>
				<ActivityWorkspace {snapshot} projection={viewerProjection} />
			</section>
		{/if}
	</main>
	<CommandPalette
		open={dashboardView.commandOpen}
		workspaces={publicWorkspaceDefinitions}
		onClose={() => dashboardView.closeCommand()}
		onWorkspace={(workspace) => {
			dashboardView.navigate(workspace);
			clientTelemetry?.recordWorkspace(workspace);
		}}
	/>
</div>
