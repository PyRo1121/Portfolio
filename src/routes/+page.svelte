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
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import DashboardSkeleton from '$lib/components/DashboardSkeleton.svelte';
	import TodayWorkspace from '$lib/components/TodayWorkspace.svelte';
	import WorkspaceRail from '$lib/components/WorkspaceRail.svelte';
	import { createWorkspaceSignals } from '$lib/domain/dashboard-navigation';
	import {
		createDashboardStayAlive,
		PUBLIC_DASHBOARD_STAY_ALIVE_MS
	} from '$lib/domain/dashboard-stay-alive';
	import { resolvedViewerTimeZone, SSR_VIEWER_TIME_ZONE } from '$lib/domain/dashboard-time';
	import { publicWorkspaceDefinitions, shortcutMapFor } from '$lib/domain/dashboard-workspace';
	import { createViewerActivityProjection } from '$lib/domain/dashboard-viewer-time';
	import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import { createPublicShippingNavigationSignal } from '$lib/domain/owner-project-navigation';
	import { homeSeo, jsonLdScriptTag } from '$lib/domain/public-seo';
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
	const stayAlive = createDashboardStayAlive(PUBLIC_DASHBOARD_STAY_ALIVE_MS, {
		now: () => Date.now(),
		isVisible: () => document.visibilityState === 'visible',
		schedule: (callback, delayMs) => {
			const id = window.setTimeout(callback, delayMs);
			return () => window.clearTimeout(id);
		},
		reload: invalidateAll
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
		if (data.snapshot === null) refreshState = 'Refreshing';
		refreshMessage = data.cache.cachedAt === null ? '' : `cached ${data.cache.cachedAt}`;
		stayAlive.markReloaded();
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

	$effect(() => stayAlive.start());
</script>

<svelte:document onvisibilitychange={() => stayAlive.noticeVisibility()} />

<svelte:head>
	<title>{homeSeo.title}</title>
	<meta name="description" content={homeSeo.description} />
	<link rel="canonical" href={homeSeo.canonical} />
	<link rel="me" href="https://github.com/PyRo1121" />
	<meta property="og:type" content="profile" />
	<meta property="og:site_name" content="latham.cloud" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={homeSeo.title} />
	<meta property="og:description" content={homeSeo.description} />
	<meta property="og:url" content={homeSeo.canonical} />
	<meta property="og:image" content="https://latham.cloud/og-image.svg" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="theme-color" content="#0b0d0e" />
	<link rel="icon" href="/og-image.svg" type="image/svg+xml" />
	<meta name="twitter:title" content={homeSeo.title} />
	<meta name="twitter:description" content={homeSeo.description} />
	<meta name="twitter:image" content="https://latham.cloud/og-image.svg" />
	<!-- JSON-LD is serialized from local constants, not untrusted input. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScriptTag(homeSeo.jsonLd)}
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
			<a href={resolve('/about')}>About</a>
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
				{#await import('$lib/components/PublicProjectsWorkspace.svelte') then { default: PublicProjectsWorkspace }}
					<PublicProjectsWorkspace
						shipping={data.shipping}
						requestedRepository={dashboardView.selectedRepository}
					/>
				{/await}
			</section>
		{:else if snapshot === null}
			<DashboardSkeleton
				failed={refreshState === 'Unavailable'}
				message={refreshMessage}
				onRetry={() => invalidateAll()}
			/>
		{:else if viewerProjection !== null && dashboardView.activeWorkspace === 'today'}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('today')}
			>
				<TodayWorkspace {snapshot} projection={viewerProjection} />
			</section>
		{:else if viewerProjection !== null && dashboardView.activeWorkspace === 'brief'}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('brief')}
			>
				{#await import('$lib/components/BriefWorkspace.svelte') then { default: BriefWorkspace }}
					<BriefWorkspace
						{snapshot}
						projection={viewerProjection}
						onSelectRepository={(fullName) => {
							dashboardView.selectRepository(fullName);
							dashboardView.navigate('repositories');
							clientTelemetry?.recordWorkspace('repositories');
						}}
					/>
				{/await}
			</section>
		{:else if viewerProjection !== null && dashboardView.activeWorkspace === 'delivery'}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('delivery')}
			>
				{#await import('$lib/components/DeliveryWorkspace.svelte') then { default: DeliveryWorkspace }}
					<DeliveryWorkspace {snapshot} />
				{/await}
			</section>
		{:else if viewerProjection !== null && dashboardView.activeWorkspace === 'craft'}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('craft')}
			>
				{#await import('$lib/components/CraftWorkspace.svelte') then { default: CraftWorkspace }}
					<CraftWorkspace {snapshot} />
				{/await}
			</section>
		{:else if viewerProjection !== null && dashboardView.activeWorkspace === 'activity'}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('activity')}
			>
				{#await import('$lib/components/ActivityWorkspace.svelte') then { default: ActivityWorkspace }}
					<ActivityWorkspace {snapshot} projection={viewerProjection} />
				{/await}
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
