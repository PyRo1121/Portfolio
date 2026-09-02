<script lang="ts">
	import {
		ArrowClockwiseIcon as ArrowClockwise,
		CommandIcon as Command,
		EnvelopeSimpleIcon as EnvelopeSimple,
		GithubLogoIcon as GithubLogo,
		GlobeSimpleIcon as GlobeSimple,
		LinkedinLogoIcon as LinkedinLogo
	} from 'phosphor-svelte';
	import { createDeferredRefreshPoll } from '$lib/state/deferred-refresh';
	import { invalidateAll } from '$app/navigation';
	import { asset, resolve } from '$app/paths';
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
	import {
		evidenceSeo,
		jsonLdScriptTag,
		PUBLIC_CONTACT_MAILTO,
		PUBLIC_GITHUB_URL,
		PUBLIC_IDENTITY_LINE,
		PUBLIC_LINKEDIN_URL,
		PUBLIC_SOCIAL_IMAGE_URL
	} from '$lib/domain/public-seo';
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
	const poll = createDeferredRefreshPoll();
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
		if (dashboardView.refreshError !== null) return 'Public · refresh failed';
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
		return poll(
			activeRefresh,
			() => {
				refreshState = 'Refreshing';
				refreshMessage = 'Another edge isolate is publishing verified evidence.';
			},
			(result) => {
				refreshState = result._tag;
				if (result._tag === 'Fresh') freshSnapshot = result.snapshot;
				if (result._tag === 'Unavailable') refreshMessage = result.reason;
			}
		);
	});

	$effect(() => stayAlive.start());
</script>

<svelte:document onvisibilitychange={() => stayAlive.noticeVisibility()} />

<svelte:head>
	<title>{evidenceSeo.title}</title>
	<meta name="description" content={evidenceSeo.description} />
	<link rel="canonical" href={evidenceSeo.canonical} />
	<link rel="me" href={PUBLIC_GITHUB_URL} />
	<link rel="me" href={PUBLIC_LINKEDIN_URL} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="latham.cloud" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={evidenceSeo.title} />
	<meta property="og:description" content={evidenceSeo.description} />
	<meta property="og:url" content={evidenceSeo.canonical} />
	<meta property="og:image" content={PUBLIC_SOCIAL_IMAGE_URL} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Olen Latham — software, systems, and cloud work" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={evidenceSeo.title} />
	<meta name="twitter:description" content={evidenceSeo.description} />
	<meta name="twitter:image" content={PUBLIC_SOCIAL_IMAGE_URL} />
	<meta name="twitter:image:alt" content="Olen Latham — software, systems, and cloud work" />
	<!-- JSON-LD is serialized from local constants, not untrusted input. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdScriptTag(evidenceSeo.jsonLd)}
</svelte:head>
<a class="skip-link" href="#workspace-stage">Skip to live evidence</a>

<div class="app" {@attach dashboardView.attachApplication}>
	<header class="topbar">
		{#if snapshot === null}
			<span class="brand"
				><GithubLogo size={18} weight="fill" /><span class="brand__identity"
					><strong>Olen Latham</strong><small>{PUBLIC_IDENTITY_LINE}</small></span
				></span
			>
		{:else}
			<div class="brand-group">
				<a class="brand" href={resolve('/')}>
					<span class="brand__portrait">
						<img src={asset('/portrait.webp')} alt="" width="30" height="30" />
					</span>
					<span class="brand__identity"
						><strong>Olen Latham</strong><small>{PUBLIC_IDENTITY_LINE}</small></span
					>
				</a>
				<nav class="social-links" aria-label="Social profiles">
					<a
						href={PUBLIC_GITHUB_URL}
						target="_blank"
						rel="external noreferrer"
						aria-label="Olen Latham on GitHub"
						title="GitHub"><GithubLogo size={15} weight="fill" /></a
					>
					<a
						href={PUBLIC_LINKEDIN_URL}
						target="_blank"
						rel="external noreferrer"
						aria-label="Olen Latham on LinkedIn"
						title="LinkedIn"
						onclick={() => clientTelemetry?.recordContact('linkedin_social')}
						><LinkedinLogo size={15} weight="fill" /></a
					>
					<a
						href={PUBLIC_CONTACT_MAILTO}
						rel="external"
						aria-label="Email Olen Latham"
						title="Email"
						onclick={() => clientTelemetry?.recordContact('email_social')}
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
			<span class={connectionClass} title={dashboardView.refreshError ?? refreshMessage}>
				<i></i><GlobeSimple size={12} />{status}
			</span>
			<a href={resolve('/')}>Portfolio</a>
			<a
				class="contact-action"
				href={PUBLIC_CONTACT_MAILTO}
				rel="external"
				onclick={() => clientTelemetry?.recordContact('email_header')}>Contact</a
			>
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
				<TodayWorkspace
					{snapshot}
					projection={viewerProjection}
					onContact={(action) => clientTelemetry?.recordContact(action)}
				/>
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
