<script lang="ts">
	import {
		ArrowClockwiseIcon as ArrowClockwise,
		CommandIcon as Command,
		GithubLogoIcon as GithubLogo,
		GlobeSimpleIcon as GlobeSimple,
		XLogoIcon as XLogo,
		LockSimpleIcon as LockSimple
	} from 'phosphor-svelte';
	import { invalidateAll } from '$app/navigation';
	import type { PageProps as GeneratedPageProps } from './$types';
	import ActivityWorkspace from '$lib/components/ActivityWorkspace.svelte';
	import BriefWorkspace from '$lib/components/BriefWorkspace.svelte';
	import CareerAccountabilityWorkspace from '$lib/components/CareerAccountabilityWorkspace.svelte';
	import CloudflareWorkspace from '$lib/components/CloudflareWorkspace.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import CraftWorkspace from '$lib/components/CraftWorkspace.svelte';
	import DashboardSkeleton from '$lib/components/DashboardSkeleton.svelte';
	import DeliveryWorkspace from '$lib/components/DeliveryWorkspace.svelte';
	import ProjectsWorkspace from '$lib/components/ProjectsWorkspace.svelte';
	import TodayWorkspace from '$lib/components/TodayWorkspace.svelte';
	import WorkspaceRail from '$lib/components/WorkspaceRail.svelte';
	import type { CareerSnapshot } from '$lib/domain/career-accountability';
	import { createCareerAccountabilityReview } from '$lib/domain/career-review';
	import { createCareerNavigationSignal } from '$lib/domain/career-navigation';
	import { createCareerStoryEvidenceOptions } from '$lib/domain/career-story-evidence';
	import type {
		CloudflareDeploymentRefreshResult,
		CloudflareDeploymentSnapshot
	} from '$lib/domain/cloudflare-deployments';
	import type {
		CloudflareUsageRefreshResult,
		CloudflareUsageSnapshot
	} from '$lib/domain/cloudflare-usage';
	import { createWorkspaceSignals } from '$lib/domain/dashboard-navigation';
	import {
		resolvedViewerTimeZone,
		SSR_VIEWER_TIME_ZONE,
		zonedDateKey
	} from '$lib/domain/dashboard-time';
	import { createViewerActivityProjection } from '$lib/domain/dashboard-viewer-time';
	import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import type { OwnerProjectSnapshot } from '$lib/domain/owner-project';
	import { createOwnerProjectNavigationSignal } from '$lib/domain/owner-project-navigation';
	import { DashboardView } from '$lib/state/dashboard-view.svelte';

	type DashboardPageData = {
		readonly ownerAuthorized: boolean;
		readonly career: CareerSnapshot | null;
		readonly ownerProjects: OwnerProjectSnapshot | null;
		readonly ownerProjectAccess: {
			readonly _tag: 'Current' | 'Unavailable';
			readonly reason: string;
		};
		readonly careerAccess: {
			readonly _tag: 'Current' | 'Unavailable';
			readonly reason: string;
		};
		readonly cloudflare: CloudflareUsageSnapshot | null;
		readonly cloudflareCache: {
			readonly _tag: 'Cold' | 'Cached';
			readonly cachedAt: string | null;
		};
		readonly cloudflareRefresh: Promise<CloudflareUsageRefreshResult>;
		readonly cloudflareDeployments: CloudflareDeploymentSnapshot | null;
		readonly cloudflareDeploymentCache: {
			readonly _tag: 'Cold' | 'Cached';
			readonly cachedAt: string | null;
		};
		readonly cloudflareDeploymentRefresh: Promise<CloudflareDeploymentRefreshResult>;
	};
	type ActionData = {
		readonly careerMessage?: string;
		readonly ownerProjectMessage?: string;
	};
	type PageProps = Omit<GeneratedPageProps, 'data' | 'form'> & {
		readonly data: GeneratedPageProps['data'] & DashboardPageData;
		readonly form: ActionData | null;
	};

	let { data, form }: PageProps = $props();
	let snapshot: GitHubDashboardSnapshot | null = $derived(data.snapshot);
	let career: CareerSnapshot | null = $derived(data.career);
	let cloudflare: CloudflareUsageSnapshot | null = $derived(data.cloudflare);
	let cloudflareDeployments: CloudflareDeploymentSnapshot | null = $derived(
		data.cloudflareDeployments
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
	const viewerToday = $derived(zonedDateKey(new Date(), viewerTimeZone));
	const dashboardView = new DashboardView();
	const viewerProjection = $derived(
		snapshot === null ? null : createViewerActivityProjection(snapshot, viewerTimeZone)
	);
	const accountabilityReview = $derived(
		snapshot === null || career === null
			? null
			: createCareerAccountabilityReview(snapshot, career, cloudflare, viewerToday)
	);
	const storyEvidenceOptions = $derived(
		snapshot === null ? [] : createCareerStoryEvidenceOptions(snapshot)
	);
	const workspaceSignals = $derived.by(() => {
		if (snapshot === null || viewerProjection === null) return null;
		return {
			...createWorkspaceSignals(snapshot, viewerProjection, cloudflare),
			repositories: createOwnerProjectNavigationSignal(data.ownerProjects),
			career: createCareerNavigationSignal(career, viewerToday)
		};
	});
	const status = $derived.by(() => {
		const audience = data.ownerAuthorized ? 'Owner' : 'Public';
		if (refreshState === 'Refreshing')
			return snapshot === null ? 'Warming cache' : `${audience} · refreshing`;
		if (refreshState === 'Unavailable')
			return snapshot === null ? 'GitHub delayed' : `${audience} · cached`;
		return `${audience} · current`;
	});

	$effect(() => {
		viewerTimeZone = resolvedViewerTimeZone();
	});

	$effect(() => {
		const activeRefresh = data.refresh;
		snapshot = data.snapshot;
		refreshState = 'Refreshing';
		refreshMessage = data.cache.cachedAt === null ? '' : `cached ${data.cache.cachedAt}`;
		let cancelled = false;
		void activeRefresh.then((result) => {
			if (cancelled) return;
			refreshState = result._tag;
			if (result._tag === 'Fresh') snapshot = result.snapshot;
			if (result._tag === 'Unavailable') refreshMessage = result.reason;
		});
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const activeRefresh = data.cloudflareRefresh;
		cloudflare = data.cloudflare;
		cloudflareRefreshState = 'Refreshing';
		cloudflareMessage =
			data.cloudflareCache.cachedAt === null ? '' : `cached ${data.cloudflareCache.cachedAt}`;
		let cancelled = false;
		void activeRefresh.then((result) => {
			if (cancelled) return;
			cloudflareRefreshState = result._tag;
			if (result._tag === 'Fresh') cloudflare = result.snapshot;
			if (result._tag === 'Unavailable') cloudflareMessage = result.reason;
		});
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const activeRefresh = data.cloudflareDeploymentRefresh;
		cloudflareDeployments = data.cloudflareDeployments;
		deploymentRefreshState = 'Refreshing';
		deploymentMessage =
			data.cloudflareDeploymentCache.cachedAt === null
				? data.cloudflareDeploymentCache._tag === 'Cold'
					? 'Warming deployment evidence.'
					: ''
				: `cached ${data.cloudflareDeploymentCache.cachedAt}`;
		let cancelled = false;
		void activeRefresh.then((result) => {
			if (cancelled) return;
			deploymentRefreshState = result._tag;
			if (result._tag === 'Fresh') cloudflareDeployments = result.snapshot;
			if (result._tag === 'Unavailable') deploymentMessage = result.reason;
		});
		return () => {
			cancelled = true;
		};
	});
</script>

<svelte:head>
	<title>{snapshot?.profile.login ?? 'Weeknote'} / Weeknote</title>
	<meta
		name="description"
		content="A public, evidence-backed dashboard for GitHub activity, Cloudflare delivery, and career records."
	/>
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
				</nav>
			</div>
		{/if}
		<WorkspaceRail
			activeWorkspace={dashboardView.activeWorkspace}
			signals={workspaceSignals}
			onWorkspace={(workspace) => dashboardView.navigate(workspace)}
		/>
		<div class="actions">
			<span
				class:refreshing={refreshState === 'Refreshing'}
				class="connection"
				title={refreshMessage}
			>
				<i></i>{#if data.ownerAuthorized}<LockSimple size={12} />{:else}<GlobeSimple
						size={12}
					/>{/if}{status}
			</span><button
				type="button"
				onclick={() => dashboardView.toggleCommand()}
				aria-label="Open navigation palette"><Command size={15} /><kbd>⌘K</kbd></button
			><button
				type="button"
				onclick={() => dashboardView.refresh(invalidateAll)}
				disabled={dashboardView.isRefreshing}
				aria-label="Refresh GitHub and Cloudflare data"
				><ArrowClockwise
					size={16}
					class={dashboardView.isRefreshing || refreshState === 'Refreshing' ? 'spinning' : ''}
				/></button
			>
		</div>
	</header>

	<main id="workspace-stage" class="stage">
		{#if dashboardView.activeWorkspace === 'career'}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('career')}
			>
				<CareerAccountabilityWorkspace
					snapshot={career}
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
		{:else if dashboardView.activeWorkspace === 'repositories'}
			<section
				class="active"
				aria-hidden="false"
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('repositories')}
			>
				<ProjectsWorkspace
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
		{:else if snapshot === null}
			<DashboardSkeleton
				failed={refreshState === 'Unavailable'}
				message={refreshMessage}
				onRetry={() => invalidateAll()}
			/>
		{:else if viewerProjection !== null}
			<section
				class:active={dashboardView.activeWorkspace === 'today'}
				aria-hidden={dashboardView.activeWorkspace !== 'today'}
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('today')}
			>
				<TodayWorkspace {snapshot} projection={viewerProjection} />
			</section>
			<section
				class:active={dashboardView.activeWorkspace === 'brief'}
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
					}}
				/>
			</section>
			<section
				class:active={dashboardView.activeWorkspace === 'delivery'}
				aria-hidden={dashboardView.activeWorkspace !== 'delivery'}
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('delivery')}
			>
				<DeliveryWorkspace {snapshot} />
			</section>
			<section
				class:active={dashboardView.activeWorkspace === 'craft'}
				aria-hidden={dashboardView.activeWorkspace !== 'craft'}
				tabindex="-1"
				{@attach dashboardView.workspaceAttachment('craft')}
			>
				<CraftWorkspace {snapshot} />
			</section>
			<section
				class:active={dashboardView.activeWorkspace === 'activity'}
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
		onClose={() => dashboardView.closeCommand()}
		onWorkspace={(workspace) => dashboardView.navigate(workspace)}
	/>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}
	:global(html),
	:global(body) {
		width: 100%;
		height: 100%;
		margin: 0;
		overflow: hidden;
		background: #0b0d0e;
		color: #f0f0eb;
	}
	:global(body) {
		font-family: 'Geist Variable', sans-serif;
		-webkit-font-smoothing: antialiased;
	}
	:global(button),
	:global(input),
	:global(a) {
		font: inherit;
	}
	:global(:focus-visible) {
		outline: 2px solid #d8a54a;
		outline-offset: 2px;
	}
	:global(::selection) {
		background: #d8a54a;
		color: #0b0d0e;
	}
	.app {
		--bg: #0b0d0e;
		--surface: #111416;
		--surface-deep: #0e1112;
		--high: #191d1f;
		--ink: #f0f0eb;
		--muted: #979b96;
		--faint: #5f6562;
		--line: rgba(231, 232, 225, 0.115);
		--strong: rgba(231, 232, 225, 0.23);
		--accent: #d8a54a;
		--accent-soft: rgba(216, 165, 74, 0.12);
		--positive: #93b49b;
		--negative: #c98272;
		--mono: 'Observatory Mono', 'JetBrains Mono Variable', monospace;
		--ease: cubic-bezier(0.16, 1, 0.3, 1);
		display: grid;
		width: 100vw;
		height: 100dvh;
		grid-template-rows: 58px minmax(0, 1fr);
		overflow: hidden;
		background:
			linear-gradient(rgba(240, 240, 235, 0.018) 1px, transparent 1px),
			linear-gradient(90deg, rgba(240, 240, 235, 0.018) 1px, transparent 1px), var(--bg);
		background-size: 2.75rem 2.75rem;
		color: var(--ink);
	}
	.app::after {
		content: '';
		position: fixed;
		inset: 0;
		pointer-events: none;
		opacity: 0.018;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.78' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
	}
	.skip-link {
		position: fixed;
		z-index: 20;
		top: 0.5rem;
		left: 0.5rem;
		padding: 0.6rem 0.8rem;
		background: var(--ink);
		color: var(--bg);
		transform: translateY(-150%);
	}
	.skip-link:focus {
		transform: none;
	}
	.topbar {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: stretch;
		padding-inline: clamp(0.75rem, 2vw, 2rem);
		border-bottom: 1px solid var(--line);
		background: rgba(11, 12, 11, 0.92);
	}
	.brand {
		display: inline-flex;
		width: max-content;
		align-items: center;
		gap: 0.65rem;
		color: var(--ink);
		text-decoration: none;
	}
	:global(.brand svg) {
		color: var(--accent);
	}
	.brand__portrait {
		position: relative;
		display: block;
		width: 2.1rem;
		height: 2.1rem;
		overflow: hidden;
		background: var(--high);
		clip-path: polygon(0 0, 82% 0, 100% 18%, 100% 100%, 0 100%);
		mask-image: radial-gradient(circle at 48% 42%, black 48%, transparent 79%);
	}
	.brand__portrait::after {
		content: '';
		position: absolute;
		inset: 0;
		border-bottom: 2px solid var(--accent);
		background: linear-gradient(135deg, transparent 56%, rgb(216 165 74 / 20%));
	}
	.brand__portrait img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 50% 34%;
		filter: saturate(0.72) contrast(1.08);
		transition:
			filter 240ms ease,
			transform 360ms ease;
	}
	.brand:hover .brand__portrait img,
	.brand:focus-visible .brand__portrait img {
		filter: saturate(1) contrast(1.04);
		transform: scale(1.045);
	}
	.brand-group {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}
	.brand__identity {
		display: grid;
		gap: 0.05rem;
	}
	.social-links {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.social-links a {
		display: grid;
		place-items: center;
		width: 1.35rem;
		height: 1.35rem;
		border: 1px solid var(--line);
		color: var(--muted);
		text-decoration: none;
	}
	.social-links a:hover,
	.social-links a:focus-visible {
		border-color: var(--accent);
		color: var(--accent);
	}
	.brand__identity strong {
		font-size: 0.78rem;
		font-weight: 680;
		letter-spacing: -0.035em;
	}
	:global(.workspace-rail) {
		display: flex;
		height: 100%;
	}
	:global(.workspace-link) {
		position: relative;
		display: grid;
		min-width: 7.6rem;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.48rem;
		padding: 0 0.62rem;
		border: 0;
		border-right: 1px solid var(--line);
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		transition:
			background 180ms ease,
			color 180ms ease;
	}
	:global(.workspace-link:first-child) {
		border-left: 1px solid var(--line);
	}
	:global(.workspace-link:hover),
	:global(.workspace-link--active) {
		background: var(--high);
		color: var(--ink);
	}
	:global(.workspace-link--active) {
		box-shadow: inset 0 -2px var(--accent);
	}
	:global(.workspace-link__index),
	:global(.workspace-link kbd),
	:global(.workspace-link__copy small) {
		display: none;
	}
	:global(.workspace-link__copy) {
		display: grid;
		min-width: 0;
		text-align: left;
	}
	:global(.workspace-link__copy strong) {
		font: 520 0.6rem/1 var(--mono);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	:global(.workspace-label-compact) {
		display: none;
	}
	:global(.workspace-link__signal) {
		display: grid;
		min-width: 2rem;
		gap: 0.08rem;
		padding-left: 0.48rem;
		border-left: 1px solid var(--line);
		text-align: right;
	}
	:global(.workspace-link__signal b) {
		font: 640 0.64rem/1 var(--mono);
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	:global(.workspace-link__signal small) {
		font: 450 0.38rem/1 var(--mono);
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	:global(.workspace-link__signal--attention b) {
		color: var(--accent);
	}
	:global(.workspace-link:active) {
		transform: translateY(1px);
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		align-items: stretch;
	}
	.actions button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0 0.8rem;
		border: 0;
		border-left: 1px solid var(--line);
		background: transparent;
		color: var(--muted);
		cursor: pointer;
	}
	.actions button:hover {
		background: var(--high);
		color: var(--ink);
	}
	.actions kbd {
		font: 450 0.52rem/1 var(--mono);
	}
	.connection {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-right: 0.8rem;
		font: 500 0.56rem/1 var(--mono);
		color: var(--muted);
	}
	.connection i {
		width: 0.35rem;
		height: 0.35rem;
		border-radius: 50%;
		background: var(--positive);
	}
	:global(.spinning) {
		animation: spin 0.8s linear infinite;
	}
	.stage {
		min-height: 0;
		padding: clamp(0.7rem, 1.5vw, 1.4rem) clamp(0.75rem, 2vw, 2rem);
		overflow: hidden;
	}
	.stage > section {
		display: none;
		width: 100%;
		height: 100%;
		min-height: 0;
		outline: 0;
	}
	.stage > section.active {
		display: block;
		animation: enter 0.35s var(--ease) both;
	}
	:global(.workspace-pages) {
		display: none;
	}

	:global(.week-screen) {
		display: grid;
		height: 100%;
		min-height: 0;
		grid-template-columns: minmax(15rem, 0.62fr) minmax(22rem, 1.1fr) minmax(18rem, 0.78fr);
		grid-template-rows: minmax(0, 1.16fr) minmax(0, 0.84fr);
		gap: 1px;
		background: var(--line);
		border: 1px solid var(--line);
	}
	:global(.week-screen > section),
	:global(.signal-column) {
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		background: var(--surface);
	}
	:global(.week-summary) {
		grid-row: 1 / 3;
		display: flex;
		flex-direction: column;
		padding: clamp(1.2rem, 2.5vw, 2.4rem);
	}
	:global(.week-summary header) {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}
	:global(.week-summary header span),
	:global(.week-summary header p),
	:global(.weekly-changes header),
	:global(.rhythm-panel header),
	:global(.composition-panel header),
	:global(.workstream-panel header) {
		font: 500 0.66rem/1.35 var(--mono);
		color: var(--muted);
	}
	:global(.week-summary header h1) {
		margin: 0.25rem 0 0;
		font-size: clamp(1.3rem, 2vw, 2rem);
		font-weight: 520;
		letter-spacing: -0.045em;
	}
	:global(.week-summary header p) {
		max-width: 10rem;
		margin: 0;
		text-align: right;
	}
	:global(.headline-metric) {
		display: grid;
		margin: auto 0;
	}
	:global(.headline-metric strong) {
		display: block;
		font-size: clamp(6rem, 11vw, 11.5rem);
		font-weight: 500;
		line-height: 0.75;
		letter-spacing: -0.095em;
		color: var(--accent);
	}
	:global(.headline-metric strong > span) {
		display: block;
		font: inherit;
		letter-spacing: inherit;
	}
	:global(.headline-metric > span) {
		margin-top: 0.85rem;
		font: 500 0.7rem/1 var(--mono);
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	:global(.motivation-line) {
		position: relative;
		display: grid;
		gap: 0.28rem;
		margin: 0 0 clamp(0.75rem, 1.4vw, 1.3rem);
		padding: 0.75rem 0 0.75rem 1rem;
		border-left: 1px solid var(--accent);
	}
	:global(.motivation-line > span) {
		font: 500 0.62rem/1 var(--mono);
		color: var(--accent);
		text-transform: uppercase;
		letter-spacing: 0.07em;
	}
	:global(.motivation-line strong) {
		font-size: clamp(0.85rem, 1.3vw, 1.1rem);
		font-weight: 560;
	}
	:global(.motivation-line p) {
		max-width: 31rem;
		margin: 0;
		color: var(--muted);
		font-size: clamp(0.7rem, 0.85vw, 0.78rem);
		line-height: 1.35;
	}
	:global(.summary-stats) {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--line);
	}
	:global(.summary-stats > div) {
		display: grid;
		gap: 0.35rem;
		padding: 0.8rem;
		background: var(--high);
	}
	:global(.summary-stats span) {
		font: 500 0.62rem/1 var(--mono);
		color: var(--muted);
	}
	:global(.summary-stats strong) {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: clamp(0.95rem, 1.5vw, 1.4rem);
	}
	:global(.weekly-changes) {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		background: var(--surface) !important;
		color: var(--ink);
	}
	:global(.weekly-changes > header),
	:global(.rhythm-panel > header),
	:global(.composition-panel > header),
	:global(.workstream-panel > header) {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.65rem 0.8rem;
		border-bottom: 1px solid var(--line);
	}
	:global(.weekly-changes header span),
	:global(.rhythm-panel header span),
	:global(.composition-panel header span),
	:global(.workstream-panel header span) {
		color: var(--ink);
		font: 590 0.74rem/1.2 var(--sans);
		letter-spacing: -0.015em;
	}
	:global(.weekly-changes header small),
	:global(.rhythm-panel header small),
	:global(.composition-panel header small),
	:global(.workstream-panel header small) {
		font: 500 0.63rem/1.2 var(--mono);
		color: var(--muted);
	}
	:global(.weekly-change-chart),
	:global(.weekly-commit-chart) {
		position: relative;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		padding: 0.2rem 0.25rem 0;
	}
	:global(.weekly-changes-meta) {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.6rem 0.8rem;
		border-top: 1px solid var(--line);
		font: 500 0.62rem/1 var(--mono);
		color: var(--muted);
	}
	:global(.weekly-changes-meta strong) {
		color: var(--ink);
	}
	:global(.signal-column) {
		display: grid;
		grid-template-rows: minmax(0, 1.15fr) minmax(7rem, 0.85fr);
		gap: 1px;
		background: var(--line);
	}
	:global(.rhythm-panel),
	:global(.composition-panel) {
		display: grid;
		min-height: 0;
		grid-template-rows: auto minmax(0, 1fr);
		background: var(--surface);
	}
	:global(.composition-panel) {
		grid-template-rows: auto minmax(0, 1fr);
	}
	:global(.change-mix) {
		display: grid;
		min-height: 0;
		align-content: center;
		gap: clamp(0.55rem, 1.2vh, 0.8rem);
		margin: 0;
		padding: 0.7rem 0.9rem 0.8rem;
	}
	:global(.change-mix__values) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}
	:global(.change-mix__values > div) {
		display: grid;
		gap: 0.22rem;
	}
	:global(.change-mix__values > div:last-child) {
		text-align: right;
	}
	:global(.change-mix__values span) {
		font: 500 0.65rem/1 var(--mono);
		color: var(--muted);
	}
	:global(.change-mix__values strong) {
		font-size: clamp(0.92rem, 1.45vw, 1.25rem);
		font-weight: 570;
		letter-spacing: -0.035em;
	}
	:global(.change-mix__track) {
		height: 0.42rem;
		overflow: hidden;
		border: 1px solid var(--strong);
		background: var(--high);
	}
	:global(.change-mix__track i) {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	:global(.change-mix figcaption) {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		font: 500 0.65rem/1.25 var(--mono);
		color: var(--muted);
	}
	:global(.change-mix figcaption strong) {
		color: var(--ink);
		font-weight: 620;
	}
	:global(.workstream-panel) {
		grid-column: 2 / 4;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
	}
	:global(.compact-workstreams) {
		display: flex;
		min-height: 0;
		flex-direction: column;
	}
	:global(.compact-workstreams button) {
		display: grid;
		min-height: 0;
		flex: 1;
		grid-template-columns:
			2rem 2.35rem minmax(10rem, 1.5fr) minmax(4.5rem, 0.55fr) minmax(8.5rem, 0.95fr)
			minmax(5rem, 0.55fr) minmax(8rem, 0.8fr);
		align-items: center;
		gap: clamp(0.65rem, 1.2vw, 1.2rem);
		padding: 0.45rem 0.8rem;
		border: 0;
		border-bottom: 1px solid var(--line);
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		text-align: left;
		transition:
			background 260ms var(--ease),
			padding 260ms var(--ease);
	}
	:global(.compact-workstreams button:hover) {
		padding-inline: 1rem;
		background: var(--high);
	}
	:global(.workstream-artwork) {
		display: block;
		width: 2.25rem;
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: 0.15rem 0.7rem 0.15rem 0.15rem;
		background: var(--high);
	}
	:global(.workstream-artwork img) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: saturate(0.65) contrast(1.08);
	}
	:global(.workstream-index),
	:global(.compact-workstreams small) {
		font: 500 0.58rem/1.25 var(--mono);
		color: var(--muted);
	}
	:global(.workstream-identity),
	:global(.workstream-value),
	:global(.workstream-share) {
		display: grid;
		min-width: 0;
		gap: 0.22rem;
	}
	:global(.compact-workstreams strong) {
		overflow: hidden;
		font-size: clamp(0.76rem, 0.9vw, 0.9rem);
		font-weight: 560;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.workstream-value strong) {
		font-size: clamp(0.8rem, 1vw, 1rem);
	}
	:global(.workstream-diff strong) {
		color: var(--positive);
	}
	:global(.share-track) {
		height: 3px;
		background: var(--line);
		overflow: hidden;
	}
	:global(.share-track i) {
		display: block;
		width: 100%;
		height: 100%;
		background: var(--accent);
		transform-origin: left;
	}

	:global(.today-screen),
	:global(.craft-screen) {
		display: grid;
		height: 100%;
		min-height: 0;
		gap: 1px;
		border: 1px solid var(--line);
		background: var(--line);
	}
	:global(.today-screen) {
		grid-template-columns: minmax(16rem, 0.62fr) minmax(14rem, 0.64fr) minmax(16rem, 0.82fr) minmax(
				16rem,
				0.72fr
			);
		grid-template-rows: minmax(0, 1.05fr) minmax(0, 0.95fr);
	}
	:global(.today-screen > section),
	:global(.craft-screen > section) {
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		background: var(--surface);
	}
	:global(.today-screen section > header),
	:global(.craft-screen section > header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		padding: 0.68rem 0.8rem;
		border-bottom: 1px solid var(--line);
		font: 580 0.72rem/1.2 var(--sans);
		color: var(--ink);
		letter-spacing: -0.012em;
	}
	:global(.today-screen section > header small),
	:global(.craft-screen section > header small) {
		font: 500 0.62rem/1.2 var(--mono);
		color: var(--muted);
	}
	:global(.today-summary) {
		position: relative;
		isolation: isolate;
		grid-row: 1 / 3;
		display: flex;
		flex-direction: column;
		padding: clamp(1rem, 2vw, 1.8rem);
		background:
			linear-gradient(90deg, rgb(11 13 14 / 98%) 0%, rgb(11 13 14 / 88%) 47%, transparent 82%),
			var(--surface-deep) !important;
	}
	:global(.today-summary::after),
	:global(.delivery-summary::after),
	:global(.quality-summary::after) {
		content: '';
		position: absolute;
		z-index: -1;
		inset: 0;
		background:
			linear-gradient(90deg, var(--surface-deep) 0%, transparent 58%),
			linear-gradient(0deg, var(--surface-deep) 0%, transparent 42%);
		pointer-events: none;
	}
	:global(.today-portrait),
	:global(.delivery-portrait),
	:global(.craft-portrait) {
		position: absolute;
		z-index: -2;
		top: -4%;
		right: -14%;
		width: min(27rem, 112%);
		height: 108%;
		object-fit: cover;
		object-position: 58% 30%;
		opacity: 0.32;
		filter: grayscale(0.78) saturate(0.62) contrast(1.18);
		mix-blend-mode: luminosity;
		mask-image: radial-gradient(
			ellipse 72% 82% at 63% 40%,
			black 34%,
			rgb(0 0 0 / 78%) 55%,
			transparent 86%
		);
	}
	:global(.delivery-portrait) {
		object-position: 60% 34%;
	}
	:global(.craft-portrait) {
		right: -20%;
		object-position: 56% 32%;
	}
	:global(.today-summary > header) {
		padding: 0 0 0.8rem !important;
	}
	:global(.today-total) {
		display: grid;
		margin: auto 0;
	}
	:global(.today-total strong),
	:global(.today-total strong > span) {
		display: block;
		font-size: clamp(6.5rem, 10vw, 10.5rem);
		font-weight: 500;
		line-height: 0.74;
		letter-spacing: -0.1em;
		color: var(--accent);
	}
	:global(.today-total > span) {
		margin-top: 0.85rem;
		font: 500 0.7rem/1 var(--mono);
		color: var(--muted);
		text-transform: uppercase;
	}
	:global(.today-message) {
		display: grid;
		gap: 0.35rem;
		margin-bottom: 1rem;
		padding-left: 1rem;
		border-left: 1px solid var(--accent);
	}
	:global(.today-message > span) {
		font-size: clamp(1.05rem, 1.45vw, 1.35rem);
		font-weight: 570;
	}
	:global(.today-message p) {
		max-width: 30ch;
		margin: 0;
		color: var(--muted);
		font-size: 0.82rem;
		line-height: 1.42;
	}
	:global(.today-summary-grid) {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--line);
	}
	:global(.today-summary-grid > div) {
		display: grid;
		gap: 0.3rem;
		padding: 0.72rem;
		background: var(--high);
	}
	:global(.today-summary-grid span) {
		font: 500 0.56rem/1 var(--mono);
		color: var(--muted);
	}
	:global(.today-summary-grid strong) {
		font-size: 1rem;
	}
	:global(.today-change-panel) {
		grid-column: 4;
		grid-row: 1;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
	}
	:global(.today-change-grid) {
		display: grid;
		min-height: 0;
		grid-template-columns: repeat(2, 1fr);
		grid-template-rows: repeat(2, 1fr);
	}
	:global(.today-change-grid > div) {
		display: grid;
		align-content: center;
		gap: 0.25rem;
		padding: 0.7rem;
		border-right: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}
	:global(.today-change-grid span),
	:global(.today-pace span) {
		font: 500 0.58rem/1.3 var(--mono);
		color: var(--muted);
	}
	:global(.today-change-grid strong) {
		font-size: clamp(1.15rem, 2vw, 1.8rem);
		font-weight: 560;
	}
	:global(.today-pace) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.62rem 0.75rem;
		color: var(--accent);
	}
	:global(.today-hourly-panel),
	:global(.today-workstreams),
	:global(.today-commits) {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
	}
	:global(.today-hourly-panel) {
		grid-column: 2 / 4;
		grid-row: 1;
		grid-template-rows: auto minmax(0, 1fr) auto;
	}
	:global(.today-workstreams) {
		grid-column: 2 / 4;
		grid-row: 2;
	}
	:global(.today-commits) {
		grid-column: 4;
		grid-row: 2;
	}
	:global(.today-hourly-panel footer) {
		display: flex;
		justify-content: space-between;
		padding: 0.55rem 0.75rem;
		border-top: 1px solid var(--line);
		font: 500 0.6rem/1 var(--mono);
		color: var(--muted);
	}
	:global(.today-hourly-panel footer strong) {
		color: var(--ink);
	}
	:global(.today-hours) {
		display: grid;
		min-height: 0;
		grid-template-columns: repeat(24, minmax(0, 1fr));
		gap: 1px;
		padding: 0.65rem 0.55rem 0.38rem;
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0,
			transparent calc(25% - 1px),
			var(--line) 25%
		);
	}
	:global(.today-hours button) {
		display: grid;
		min-width: 0;
		min-height: 0;
		grid-template-rows: minmax(0, 1fr) 0.8rem;
		gap: 0.2rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}
	:global(.today-hours button:hover),
	:global(.today-hours button.selected) {
		background: rgb(216 165 74 / 7%);
	}
	:global(.today-hours button:focus-visible) {
		outline: 1px solid var(--accent);
		outline-offset: 0;
	}
	:global(.today-hours i) {
		align-self: end;
		justify-self: center;
		display: block;
		width: min(72%, 0.72rem);
		height: calc(var(--hour-height) * 100%);
		min-height: 1px;
		background: var(--faint);
		transition:
			height 180ms ease,
			background 120ms ease,
			width 120ms ease;
	}
	:global(.today-hours button.active i) {
		background: var(--accent);
	}
	:global(.today-hours button.selected i) {
		width: min(92%, 0.9rem);
		background: var(--ink);
		box-shadow: 0 0 0 1px var(--accent);
	}
	:global(.today-hours span) {
		align-self: end;
		justify-self: center;
		font: 500 0.43rem/1 var(--mono);
		color: var(--muted);
		white-space: nowrap;
	}
	:global(.today-workstreams > div),
	:global(.today-commits > div) {
		display: flex;
		min-height: 0;
		flex-direction: column;
	}
	:global(.today-workstreams article) {
		display: grid;
		min-height: 0;
		flex: 1;
		grid-template-columns: minmax(7rem, 1fr) auto minmax(6rem, auto) auto minmax(4rem, 0.6fr);
		align-items: center;
		gap: 0.6rem;
		padding: 0.38rem 0.65rem;
		border-bottom: 1px solid var(--line);
	}
	:global(.today-workstreams article strong) {
		overflow: hidden;
		font-size: 0.72rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.today-workstreams article span) {
		font: 500 0.54rem/1 var(--mono);
		color: var(--muted);
	}
	:global(.today-workstreams article > div) {
		height: 3px;
		overflow: hidden;
		background: var(--line);
	}
	:global(.today-workstreams article > div i) {
		display: block;
		width: 100%;
		height: 100%;
		background: var(--accent);
		transform-origin: left;
	}
	:global(.today-commits a) {
		display: grid;
		min-height: 0;
		flex: 1;
		grid-template-columns: 3.6rem minmax(0, 1fr) minmax(6rem, 0.5fr) 4.4rem;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.6rem;
		border-bottom: 1px solid var(--line);
		color: var(--ink);
		text-decoration: none;
	}
	:global(.today-commits a:hover) {
		background: var(--high);
	}
	:global(.today-commits a > span),
	:global(.today-commits small),
	:global(.today-commits time) {
		overflow: hidden;
		font: 500 0.52rem/1.2 var(--mono);
		color: var(--muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.today-commits a strong) {
		overflow: hidden;
		font-size: 0.66rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.today-commits time) {
		text-align: right;
	}
	:global(.today-workstreams p),
	:global(.today-commits p) {
		margin: auto;
		color: var(--muted);
		font-size: 0.7rem;
	}

	:global(.craft-screen) {
		grid-template-columns: minmax(16rem, 0.6fr) minmax(17rem, 0.78fr) minmax(17rem, 0.78fr) minmax(
				16rem,
				0.68fr
			);
		grid-template-rows: minmax(0, 0.92fr) minmax(0, 1.08fr);
	}
	:global(.quality-summary),
	:global(.craft-verification),
	:global(.reviewability-panel),
	:global(.craft-mix),
	:global(.commit-discipline),
	:global(.quality-coverage) {
		display: grid;
		min-height: 0;
		grid-template-rows: auto minmax(0, 1fr);
	}
	:global(.quality-summary) {
		position: relative;
		isolation: isolate;
		grid-template-rows: auto minmax(0, 1fr) auto auto;
		background: var(--surface-deep) !important;
	}
	:global(.quality-summary__value) {
		display: grid;
		align-content: center;
		padding: 0.9rem;
	}
	:global(.quality-summary__value strong) {
		font-size: clamp(4.8rem, 8vw, 8rem);
		font-weight: 510;
		line-height: 0.75;
		letter-spacing: -0.09em;
		color: var(--accent);
	}
	:global(.quality-summary__value span) {
		margin-top: 0.7rem;
		font: 550 0.7rem/1 var(--mono);
		color: var(--muted);
	}
	:global(.quality-summary article) {
		display: grid;
		gap: 0.35rem;
		margin: 0 0.9rem 0.8rem;
		padding-left: 0.8rem;
		border-left: 1px solid var(--accent);
	}
	:global(.quality-summary article strong) {
		font-size: 1rem;
	}
	:global(.quality-summary article p) {
		margin: 0;
		font-size: 0.76rem;
		line-height: 1.45;
		color: var(--muted);
	}
	:global(.quality-summary footer) {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.7rem 0.8rem;
		background: var(--high);
		font: 500 0.6rem/1.25 var(--mono);
		color: var(--muted);
	}
	:global(.quality-summary footer strong) {
		color: var(--ink);
	}
	:global(.craft-verification) {
		grid-column: 2 / 4;
		grid-template-rows: auto minmax(0, 1fr) auto;
	}
	:global(.craft-verification-body) {
		display: grid;
		min-height: 0;
		grid-template-columns: minmax(10rem, 0.72fr) minmax(16rem, 1.28fr);
	}
	:global(.craft-pass-rate) {
		display: grid;
		align-content: center;
		gap: 0.35rem;
		padding: 1rem;
		border-right: 1px solid var(--line);
	}
	:global(.craft-pass-rate strong) {
		font-size: clamp(3rem, 5.5vw, 5.5rem);
		font-weight: 520;
		line-height: 0.78;
		letter-spacing: -0.08em;
		color: var(--accent);
	}
	:global(.craft-pass-rate span) {
		font-size: 0.78rem;
		color: var(--muted);
	}
	:global(.quality-verification-detail) {
		display: grid;
		align-content: center;
		gap: 0.85rem;
		padding: 1rem;
	}
	:global(.quality-verification-track) {
		height: 0.55rem;
		overflow: hidden;
		background: rgba(206, 117, 103, 0.58);
	}
	:global(.quality-verification-track i) {
		display: block;
		width: 100%;
		height: 100%;
		background: var(--positive);
		transform-origin: left;
	}
	:global(.quality-verification-detail p) {
		max-width: 44ch;
		margin: 0;
		font-size: 0.76rem;
		line-height: 1.45;
		color: var(--muted);
	}
	:global(.craft-checks) {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--line);
	}
	:global(.craft-checks > div) {
		display: grid;
		grid-template-columns: auto auto;
		align-items: center;
		justify-content: start;
		gap: 0.2rem 0.4rem;
		padding: 0.65rem;
		background: var(--high);
	}
	:global(.craft-checks span) {
		grid-column: 1 / 3;
		font: 500 0.62rem/1 var(--mono);
		color: var(--muted);
	}
	:global(.reviewability-panel) {
		grid-template-rows: auto minmax(0, 1fr);
	}
	:global(.reviewability-grid) {
		display: grid;
		min-height: 0;
		grid-template-columns: repeat(2, 1fr);
		grid-template-rows: repeat(2, 1fr);
	}
	:global(.reviewability-grid > div) {
		display: grid;
		align-content: center;
		gap: 0.28rem;
		padding: 0.7rem;
		border-right: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}
	:global(.reviewability-grid span),
	:global(.reviewability-grid small) {
		font: 500 0.62rem/1.25 var(--mono);
		color: var(--muted);
	}
	:global(.reviewability-grid strong) {
		font-size: clamp(1.15rem, 2.3vw, 2rem);
	}
	:global(.craft-mix) {
		grid-column: 1 / 3;
		grid-template-rows: auto auto minmax(0, 1fr);
	}
	:global(.craft-spectrum) {
		display: flex;
		height: 5px;
		gap: 1px;
		margin: 0.75rem 0.8rem 0;
	}
	:global(.craft-spectrum > div) {
		background: var(--accent);
	}
	:global(.craft-spectrum > div:nth-child(2)) {
		opacity: 0.8;
	}
	:global(.craft-spectrum > div:nth-child(3)) {
		opacity: 0.65;
	}
	:global(.craft-spectrum > div:nth-child(4)) {
		opacity: 0.5;
	}
	:global(.craft-spectrum > div:nth-child(5)) {
		opacity: 0.38;
	}
	:global(.craft-spectrum > div:nth-child(n + 6)) {
		opacity: 0.22;
	}
	:global(.craft-categories) {
		display: grid;
		min-height: 0;
		grid-template-columns: repeat(4, 1fr);
		padding: 0.55rem 0.8rem 0.7rem;
	}
	:global(.craft-categories article) {
		display: grid;
		align-content: center;
		gap: 0.24rem;
		padding-right: 0.7rem;
	}
	:global(.craft-categories span) {
		font: 500 0.62rem/1.2 var(--mono);
		color: var(--muted);
	}
	:global(.craft-categories strong) {
		font-size: 1rem;
	}
	:global(.craft-categories article > div) {
		height: 2px;
		overflow: hidden;
		background: var(--line);
	}
	:global(.craft-categories i) {
		display: block;
		width: 100%;
		height: 100%;
		background: var(--accent);
		transform-origin: left;
	}
	:global(.commit-discipline) {
		grid-template-rows: auto minmax(0, 1fr) auto;
	}
	:global(.discipline-value) {
		display: grid;
		align-content: center;
		gap: 0.3rem;
		padding: 0.8rem;
	}
	:global(.discipline-value strong) {
		font-size: clamp(2.6rem, 4.5vw, 4.5rem);
		font-weight: 530;
		line-height: 0.8;
		color: var(--accent);
	}
	:global(.discipline-value span),
	:global(.commit-discipline p) {
		font-size: 0.66rem;
		line-height: 1.35;
		color: var(--muted);
	}
	:global(.commit-discipline p) {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
		margin: 0;
		padding: 0.65rem 0.75rem;
		border-top: 1px solid var(--line);
	}
	:global(.quality-coverage > div) {
		display: flex;
		min-height: 0;
		flex-direction: column;
	}
	:global(.quality-coverage p) {
		display: grid;
		min-height: 0;
		flex: 1;
		grid-template-columns: 0.45rem 1fr;
		align-items: center;
		gap: 0.55rem;
		margin: 0;
		padding: 0.55rem 0.7rem;
		border-bottom: 1px solid var(--line);
		font: 500 0.63rem/1.42 var(--mono);
		color: var(--muted);
	}
	:global(.quality-coverage p i) {
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: var(--faint);
	}

	:global(.delivery-screen) {
		display: grid;
		height: 100%;
		min-height: 0;
		grid-template-columns: minmax(17rem, 0.58fr) minmax(21rem, 0.92fr) minmax(21rem, 0.92fr);
		grid-template-rows: minmax(0, 0.88fr) minmax(0, 1.12fr);
		gap: 1px;
		border: 1px solid var(--line);
		background: var(--line);
	}
	:global(.delivery-screen > section) {
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		background: var(--surface);
	}
	:global(.delivery-screen section > header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.7rem 0.85rem;
		border-bottom: 1px solid var(--line);
		font: 580 0.72rem/1.2 var(--sans);
		color: var(--ink);
		letter-spacing: -0.012em;
	}
	:global(.delivery-screen section > header small) {
		font: 500 0.62rem/1.2 var(--mono);
		color: var(--muted);
	}
	:global(.delivery-summary) {
		position: relative;
		isolation: isolate;
		grid-row: 1 / 3;
		display: flex;
		flex-direction: column;
		padding: clamp(1rem, 2vw, 1.8rem);
		background: var(--surface-deep) !important;
	}
	:global(.delivery-summary > header) {
		padding: 0 0 0.8rem !important;
	}
	:global(.delivery-summary__value) {
		display: grid;
		margin: auto 0;
	}
	:global(.delivery-summary__value strong) {
		font-size: clamp(7rem, 12vw, 12rem);
		font-weight: 500;
		line-height: 0.74;
		letter-spacing: -0.1em;
		color: var(--accent);
	}
	:global(.delivery-summary__value span) {
		margin-top: 0.85rem;
		font: 550 0.72rem/1 var(--mono);
		color: var(--muted);
	}
	:global(.delivery-message) {
		display: grid;
		gap: 0.35rem;
		margin-bottom: 1.2rem;
		padding-left: 1rem;
		border-left: 1px solid var(--accent);
	}
	:global(.delivery-message span) {
		font-size: clamp(1rem, 1.45vw, 1.35rem);
		font-weight: 570;
	}
	:global(.delivery-message p) {
		margin: 0;
		color: var(--muted);
		font-size: 0.78rem;
		line-height: 1.45;
	}
	:global(.delivery-summary__facts) {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		margin-top: 1px;
		background: var(--line);
	}
	:global(.delivery-summary__facts > div) {
		display: grid;
		gap: 0.25rem;
		padding: 0.65rem 0.7rem;
		background: var(--high);
	}
	:global(.delivery-summary__facts span) {
		font: 500 0.58rem/1.2 var(--mono);
		color: var(--muted);
	}
	:global(.delivery-summary__facts strong) {
		font-size: 0.78rem;
	}
	:global(.outcome-panel),
	:global(.verification-panel),
	:global(.delivery-trail),
	:global(.repository-verification) {
		display: grid;
		min-height: 0;
		grid-template-rows: auto minmax(0, 1fr);
	}
	:global(.outcome-panel) {
		grid-template-rows: auto minmax(0, 1fr) auto;
	}
	:global(.outcome-metrics) {
		display: grid;
		min-height: 0;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--line);
	}
	:global(.outcome-metrics > div) {
		display: grid;
		align-content: center;
		gap: 0.35rem;
		padding: 0.8rem;
		background: var(--surface);
	}
	:global(.outcome-metrics svg) {
		color: var(--accent);
	}
	:global(.outcome-metrics strong) {
		font-size: clamp(1.8rem, 3.3vw, 3.4rem);
		font-weight: 540;
		line-height: 0.9;
		letter-spacing: -0.07em;
	}
	:global(.outcome-metrics span),
	:global(.outcome-metrics small),
	:global(.outcome-comparison span) {
		font: 500 0.62rem/1.2 var(--mono);
		color: var(--muted);
	}
	:global(.outcome-comparison) {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.75rem 0.85rem;
		border-top: 1px solid var(--line);
		color: var(--accent);
	}
	:global(.outcome-comparison > div) {
		display: grid;
		gap: 0.18rem;
	}
	:global(.outcome-comparison strong) {
		font-size: 1rem;
		color: var(--ink);
	}
	:global(.verification-panel) {
		grid-template-rows: auto minmax(0, 1fr) auto auto auto;
	}
	:global(.verification-headline) {
		display: grid;
		align-content: center;
		gap: 0.35rem;
		padding: 0.8rem;
	}
	:global(.verification-headline strong) {
		font-size: clamp(2.7rem, 5vw, 5rem);
		font-weight: 520;
		line-height: 0.8;
		letter-spacing: -0.08em;
		color: var(--accent);
	}
	:global(.verification-headline span) {
		max-width: 25rem;
		font-size: 0.72rem;
		line-height: 1.35;
		color: var(--muted);
	}
	:global(.verification-track),
	:global(.repository-check-track) {
		height: 3px;
		overflow: hidden;
		background: rgba(206, 117, 103, 0.55);
	}
	:global(.verification-track) {
		margin-inline: 0.8rem;
	}
	:global(.verification-track i),
	:global(.repository-check-track i) {
		display: block;
		width: 100%;
		height: 100%;
		background: var(--positive);
		transform-origin: left;
	}
	:global(.verification-counts) {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		padding: 0.75rem 0.8rem;
	}
	:global(.verification-counts > div) {
		display: grid;
		grid-template-columns: auto auto;
		justify-content: start;
		align-items: center;
		gap: 0.2rem 0.4rem;
	}
	:global(.verification-counts > div span) {
		grid-column: 1 / 3;
		font: 500 0.62rem/1 var(--mono);
		color: var(--muted);
	}
	:global(.verification-annotation) {
		display: grid;
		gap: 0.35rem;
		padding: 0.6rem 0.8rem;
		border-top: 1px solid var(--line);
		background: rgba(206, 117, 103, 0.06);
		color: var(--ink);
		text-decoration: none;
	}
	:global(.verification-annotation:hover) {
		background: rgba(206, 117, 103, 0.11);
	}
	:global(.verification-annotation > div) {
		display: grid;
		gap: 0.18rem;
		min-width: 0;
	}
	:global(.verification-annotation small),
	:global(.verification-annotation > span) {
		font: 500 0.6rem/1.3 var(--mono);
		color: var(--muted);
	}
	:global(.verification-annotation small) {
		color: var(--negative);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	:global(.verification-annotation strong) {
		display: -webkit-box;
		overflow: hidden;
		font-size: 0.7rem;
		font-weight: 530;
		line-height: 1.3;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}
	:global(.verification-annotation > span) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.coverage-warning) {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
		padding: 0.55rem 0.8rem;
		border-top: 1px solid var(--line);
		font: 500 0.58rem/1.3 var(--mono);
		color: var(--negative);
	}
	:global(.artifact-list) {
		display: flex;
		min-height: 0;
		flex-direction: column;
	}
	:global(.artifact-list > a) {
		display: grid;
		min-height: 0;
		flex: 1;
		grid-template-columns: 0.45rem 5.5rem minmax(0, 1fr) 4.5rem;
		align-items: center;
		gap: 0.65rem;
		padding: 0.35rem 0.75rem;
		border-bottom: 1px solid var(--line);
		color: var(--ink);
		text-decoration: none;
	}
	:global(.artifact-list > a:hover) {
		background: var(--high);
	}
	:global(.artifact-status) {
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: var(--muted);
	}
	:global(.artifact-status--shipped),
	:global(.artifact-status--passed) {
		background: var(--positive);
	}
	:global(.artifact-status--failed) {
		background: var(--negative);
	}
	:global(.artifact-status--cancelled) {
		background: var(--faint);
	}
	:global(.artifact-status--running) {
		background: var(--accent);
		box-shadow: 0 0 0 4px rgba(216, 165, 74, 0.1);
	}
	:global(.artifact-kind),
	:global(.artifact-list small),
	:global(.artifact-list time) {
		font: 500 0.62rem/1.25 var(--mono);
		color: var(--muted);
	}
	:global(.artifact-list > a > div) {
		display: grid;
		min-width: 0;
		gap: 0.2rem;
	}
	:global(.artifact-list strong),
	:global(.artifact-list small) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.artifact-list strong) {
		font-size: 0.76rem;
		font-weight: 550;
	}
	:global(.artifact-list time) {
		text-align: right;
	}
	:global(.artifact-list > p),
	:global(.repository-verification > div > p) {
		margin: auto;
		color: var(--muted);
		font-size: 0.72rem;
	}
	:global(.repository-verification > div) {
		display: flex;
		min-height: 0;
		flex-direction: column;
	}
	:global(.repository-verification article) {
		display: grid;
		min-height: 0;
		flex: 1;
		grid-template-columns: minmax(8rem, 1fr) minmax(6rem, 0.9fr) repeat(3, auto);
		align-items: center;
		gap: 0.7rem;
		padding: 0.45rem 0.75rem;
		border-bottom: 1px solid var(--line);
	}
	:global(.repository-verification article strong) {
		overflow: hidden;
		font-size: 0.72rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.repository-verification article span) {
		font: 500 0.62rem/1 var(--mono);
		color: var(--muted);
	}

	:global(.repositories-screen),
	:global(.ledger-screen) {
		display: grid;
		height: 100%;
		min-height: 0;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.8rem;
	}
	:global(.screen-toolbar) {
		display: grid;
		grid-template-columns: 1fr minmax(15rem, 0.6fr) auto;
		align-items: center;
		gap: 1rem;
	}
	:global(.screen-toolbar > div),
	:global(.ledger-toolbar > div) {
		display: grid;
		gap: 0.2rem;
	}
	:global(.screen-toolbar span),
	:global(.screen-toolbar strong),
	:global(.ledger-toolbar span),
	:global(.ledger-toolbar strong) {
		font: 500 0.6rem/1.25 var(--mono);
		color: var(--muted);
	}
	:global(.screen-toolbar strong),
	:global(.ledger-toolbar strong) {
		color: var(--ink);
	}
	:global(.screen-toolbar small) {
		max-width: 34rem;
		color: var(--muted);
		font: 460 0.57rem/1.4 var(--mono);
	}
	:global(.screen-toolbar small.unavailable) {
		color: var(--accent);
	}
	:global(.screen-toolbar label) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--line);
		color: var(--muted);
	}
	:global(.screen-toolbar input) {
		width: 100%;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--ink);
		font: 500 0.62rem/1 var(--mono);
	}
	:global(.screen-toolbar nav) {
		display: flex;
	}
	:global(.screen-toolbar nav button) {
		padding: 0.58rem 0.7rem;
		border: 1px solid var(--line);
		border-left: 0;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		font: 500 0.58rem/1 var(--mono);
	}
	:global(.screen-toolbar nav button:first-child) {
		border-left: 1px solid var(--line);
	}
	:global(.screen-toolbar nav button.active) {
		background: var(--ink);
		color: var(--bg);
	}
	:global(.repository-layout) {
		display: grid;
		min-height: 0;
		grid-template-columns: minmax(0, 1.5fr) minmax(17rem, 0.5fr);
		gap: 0.8rem;
	}
	:global(.repository-table) {
		display: grid;
		min-height: 0;
		grid-template-rows: auto minmax(0, 1fr) auto;
		border: 1px solid var(--line);
	}
	:global(.repository-table > header),
	:global(.repository-table .repository-rows button) {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 7.5rem 4.5rem 6rem;
		align-items: center;
		gap: 0.6rem;
	}
	:global(.repository-table > header) {
		padding: 0.55rem 0.7rem;
		border-bottom: 1px solid var(--line);
		font: 500 0.56rem/1 var(--mono);
		color: var(--muted);
		text-transform: uppercase;
	}
	:global(.repository-rows) {
		display: grid;
		min-height: 0;
		grid-template-rows: repeat(7, minmax(0, 1fr));
	}
	:global(.repository-rows button) {
		min-height: 0;
		padding: 0.35rem 0.7rem;
		border: 0;
		border-bottom: 1px solid var(--line);
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		text-align: left;
	}
	:global(.repository-rows button:hover),
	:global(.repository-rows button.active) {
		background: var(--high);
		color: var(--ink);
		box-shadow: inset 2px 0 var(--accent);
	}
	:global(.repository-rows button > div) {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.55rem;
	}
	:global(.repository-row-artwork) {
		display: block !important;
		width: 2.15rem;
		height: 2.15rem;
		flex: none;
		overflow: hidden !important;
		border-radius: 0.1rem 0.65rem 0.1rem 0.1rem;
		background: var(--high);
	}
	:global(.repository-row-artwork img) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: saturate(0.65) contrast(1.08);
	}
	:global(.repository-rows i) {
		width: 0.35rem;
		height: 1.8rem;
		flex: none;
	}
	:global(.repository-rows button > div span) {
		display: grid;
		min-width: 0;
		gap: 0.15rem;
	}
	:global(.repository-rows strong) {
		overflow: hidden;
		color: var(--ink);
		font-size: 0.76rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.repository-rows span),
	:global(.repository-rows small) {
		overflow: hidden;
		font: 500 0.59rem/1.2 var(--mono);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.repository-table footer),
	:global(.ledger-table footer) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.45rem 0.7rem;
		font: 500 0.56rem/1 var(--mono);
		color: var(--muted);
	}
	:global(.repository-table footer div),
	:global(.ledger-table footer div) {
		display: flex;
	}
	:global(.repository-table footer button),
	:global(.ledger-table footer button) {
		display: grid;
		width: 1.8rem;
		height: 1.65rem;
		place-items: center;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--ink);
		cursor: pointer;
	}
	:global(.repository-table footer button:disabled),
	:global(.ledger-table footer button:disabled) {
		opacity: 0.25;
		cursor: default;
	}
	:global(.repository-inspector) {
		display: grid;
		align-content: start;
		gap: 0.85rem;
		min-height: 0;
		padding: 0;
		border-top: 2px solid var(--accent);
		background: var(--surface);
		overflow: hidden;
	}
	:global(.repository-inspector__header) {
		display: grid;
		grid-template-columns: 3.6rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-bottom: 1px solid var(--line);
		background: var(--high);
	}
	:global(.repository-inspector__image) {
		display: block;
		width: 3.6rem;
		height: 3.6rem;
		overflow: hidden;
		border-radius: 0.15rem 1rem 0.15rem 0.15rem;
		background: var(--surface);
	}
	:global(.repository-inspector__image img) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: saturate(0.58) contrast(1.08);
	}
	:global(.repository-inspector__header > div) {
		display: grid;
		min-width: 0;
		gap: 0.3rem;
	}
	:global(.repository-inspector__header > div > span),
	:global(.repository-inspector__header small) {
		overflow: hidden;
		font: 500 0.57rem/1.2 var(--mono);
		color: var(--muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.repository-inspector a) {
		color: var(--accent);
	}
	:global(.inspector-title) {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-width: 0;
	}
	:global(.repository-inspector h2) {
		overflow: hidden;
		margin: 0;
		font-size: clamp(1.35rem, 2.2vw, 2.25rem);
		font-weight: 560;
		line-height: 0.95;
		letter-spacing: -0.055em;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.repository-inspector > p),
	:global(.repository-inspector > .repository-inspector__activity),
	:global(.repository-inspector > .inspector-primary),
	:global(.repository-inspector > dl) {
		margin-inline: 1rem;
	}
	:global(.repository-inspector > p) {
		display: -webkit-box;
		overflow: hidden;
		margin-block: 0;
		color: var(--muted);
		font-size: 0.78rem;
		line-height: 1.45;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	:global(.repository-inspector__activity) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		padding-block: 0.65rem;
		border-block: 1px solid var(--line);
		font: 500 0.6rem/1.2 var(--mono);
		color: var(--muted);
	}
	:global(.repository-inspector__activity strong) {
		color: var(--ink);
	}
	:global(.inspector-primary) {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1px;
		background: var(--line);
	}
	:global(.inspector-primary div) {
		display: grid;
		gap: 0.25rem;
		padding: 0.7rem;
		background: var(--high);
	}
	:global(.inspector-primary span),
	:global(.repository-inspector dt) {
		font: 500 0.56rem/1.2 var(--mono);
		color: var(--muted);
	}
	:global(.inspector-primary strong) {
		font-size: 1.45rem;
		letter-spacing: -0.05em;
	}
	:global(.repository-inspector dl) {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
		margin-block: 0 1rem;
	}
	:global(.repository-inspector dl div) {
		display: grid;
		gap: 0.22rem;
	}
	:global(.repository-inspector dd) {
		margin: 0;
		font-size: 0.76rem;
		font-weight: 570;
	}
	:global(.repository-inspector__evidence) {
		display: grid;
		margin-top: auto;
		border-top: 1px solid var(--line);
	}
	:global(.repository-inspector__evidence > header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.65rem 1rem;
		font: 570 0.68rem/1.2 var(--sans);
	}
	:global(.repository-inspector__evidence > header small) {
		font: 500 0.54rem/1.2 var(--mono);
		color: var(--muted);
	}
	:global(.repository-inspector__checks) {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--line);
	}
	:global(.repository-inspector__checks > div) {
		display: grid;
		gap: 0.2rem;
		padding: 0.65rem 1rem;
		background: var(--high);
	}
	:global(.repository-inspector__checks strong) {
		font-size: 0.9rem;
	}
	:global(.repository-inspector__checks span),
	:global(.repository-inspector__evidence > p),
	:global(.repository-inspector__evidence > a span) {
		font: 500 0.56rem/1.25 var(--mono);
		color: var(--muted);
	}
	:global(.repository-inspector__evidence > p) {
		margin: 0;
		padding: 0.65rem 1rem;
		border-top: 1px solid var(--line);
	}
	:global(.repository-inspector__evidence > a) {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.6rem;
		padding: 0.65rem 1rem;
		border-top: 1px solid var(--line);
		color: var(--ink);
		text-decoration: none;
	}
	:global(.repository-inspector__evidence > a:hover) {
		background: var(--high);
	}
	:global(.repository-inspector__evidence > a strong) {
		overflow: hidden;
		font-size: 0.68rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.ledger-toolbar) {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 2rem;
	}
	:global(.ledger-toolbar nav) {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		border: 1px solid var(--line);
	}
	:global(.ledger-toolbar nav button) {
		display: grid;
		gap: 0.2rem;
		padding: 0.4rem;
		border: 0;
		border-right: 1px solid var(--line);
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		text-align: center;
	}
	:global(.ledger-toolbar nav button:last-child) {
		border-right: 0;
	}
	:global(.ledger-toolbar nav button.active) {
		background: var(--high);
		color: var(--ink);
		box-shadow: inset 0 -2px var(--accent);
	}
	:global(.ledger-toolbar nav button span) {
		font-size: 0.54rem;
	}
	:global(.ledger-toolbar nav button strong) {
		font-size: 0.74rem;
	}
	:global(.ledger-table) {
		display: grid;
		min-height: 0;
		grid-template-rows: auto auto minmax(0, 1fr) auto auto;
		border: 1px solid var(--line);
	}
	:global(.ledger-table > header) {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2rem;
		padding: 0.7rem;
		border-bottom: 1px solid var(--line);
		background: var(--surface);
	}
	:global(.ledger-table > header > div) {
		display: grid;
		gap: 0.2rem;
	}
	:global(.ledger-table > header span) {
		font: 500 0.56rem/1.2 var(--mono);
		color: var(--muted);
	}
	:global(.ledger-table > header strong) {
		font-size: 0.84rem;
	}
	:global(.commit-header),
	:global(.ledger-table li a) {
		display: grid;
		grid-template-columns: 4.5rem minmax(0, 1.6fr) minmax(7rem, 0.5fr) 6rem 1rem;
		align-items: center;
		gap: 0.6rem;
	}
	:global(.commit-header) {
		padding: 0.5rem 0.7rem;
		border-bottom: 1px solid var(--line);
		font: 500 0.54rem/1 var(--mono);
		color: var(--muted);
		text-transform: uppercase;
	}
	:global(.ledger-table ol) {
		display: grid;
		min-height: 0;
		grid-template-rows: repeat(10, minmax(0, 1fr));
		margin: 0;
		padding: 0;
		list-style: none;
	}
	:global(.ledger-table li) {
		min-height: 0;
		border-bottom: 1px solid var(--line);
	}
	:global(.ledger-table li a) {
		height: 100%;
		min-height: 0;
		padding: 0.35rem 0.7rem;
		color: var(--muted);
		text-decoration: none;
	}
	:global(.ledger-table li a:hover),
	:global(.ledger-table li a:focus-visible),
	:global(.ledger-table li.selected a) {
		background: var(--high);
		color: var(--ink);
	}
	:global(.ledger-table li.selected) {
		box-shadow: inset 2px 0 var(--accent);
	}
	:global(.ledger-table li span) {
		overflow: hidden;
		font: 500 0.56rem/1.2 var(--mono);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.ledger-table li strong) {
		overflow: hidden;
		color: var(--ink);
		font-size: 0.72rem;
		font-weight: 540;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.diff) {
		text-align: right;
	}
	:global(.diff b) {
		color: var(--positive);
	}
	:global(.diff i) {
		margin-left: 0.45rem;
		color: var(--negative);
		font-style: normal;
	}
	:global(.empty-ledger) {
		display: grid;
		place-items: center;
		color: var(--muted);
		font: 450 0.55rem/1 var(--mono);
	}
	:global(.commit-inspector) {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
		align-items: center;
		gap: 1rem;
		min-height: 3.15rem;
		padding: 0.5rem 0.7rem;
		border-top: 1px solid var(--strong);
		background: linear-gradient(90deg, rgb(216 165 74 / 7%), transparent 34%), var(--surface);
	}
	:global(.commit-inspector__identity) {
		display: grid;
		min-width: 0;
		grid-template-columns: auto auto minmax(0, 1fr);
		align-items: center;
		gap: 0.5rem;
	}
	:global(.commit-inspector__identity svg) {
		color: var(--accent);
	}
	:global(.commit-inspector__identity span),
	:global(.commit-inspector__facts),
	:global(.commit-inspector > a) {
		font: 500 0.55rem/1.25 var(--mono);
		color: var(--muted);
	}
	:global(.commit-inspector__identity strong) {
		overflow: hidden;
		font-size: 0.74rem;
		font-weight: 570;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.commit-inspector__facts) {
		display: flex;
		min-width: 0;
		align-items: center;
		justify-content: flex-end;
		gap: 0.8rem;
	}
	:global(.commit-inspector__facts span) {
		display: inline-flex;
		align-items: center;
		gap: 0.22rem;
		white-space: nowrap;
	}
	:global(.commit-inspector__facts span:first-child) {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	:global(.commit-inspector__facts b) {
		color: var(--ink);
	}
	:global(.commit-inspector > a) {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--accent);
		text-decoration: none;
		white-space: nowrap;
	}

	:global(.command-scrim) {
		position: fixed;
		inset: 0;
		z-index: 15;
		display: grid;
		place-items: start center;
		padding-top: 12dvh;
		background: rgba(3, 4, 3, 0.75);
		backdrop-filter: blur(8px);
	}
	:global(.command-backdrop) {
		position: absolute;
		inset: 0;
		border: 0;
		background: transparent;
	}
	:global(.command-palette) {
		position: relative;
		width: min(34rem, calc(100% - 2rem));
		border: 1px solid var(--strong);
		background: var(--high);
		box-shadow: 0 2rem 5rem rgba(0, 0, 0, 0.4);
	}
	:global(.command-palette > header) {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.6rem;
		padding: 0.8rem;
		border-bottom: 1px solid var(--line);
		color: var(--muted);
		font: 450 0.55rem/1 var(--mono);
	}
	:global(.command-palette > header button) {
		display: grid;
		width: 1.8rem;
		height: 1.8rem;
		place-items: center;
		border: 0;
		background: transparent;
		color: var(--ink);
	}
	:global(.command-list button) {
		display: grid;
		width: 100%;
		grid-template-columns: 1.7rem 1fr auto;
		align-items: center;
		gap: 0.7rem;
		padding: 0.75rem;
		border: 0;
		border-bottom: 1px solid var(--line);
		background: transparent;
		color: var(--ink);
		text-align: left;
		cursor: pointer;
	}
	:global(.command-list button:hover) {
		background: rgba(216, 165, 74, 0.1);
	}
	:global(.command-list kbd) {
		display: grid;
		width: 1.7rem;
		height: 1.7rem;
		place-items: center;
		border: 1px solid var(--line);
		font: 450 0.5rem/1 var(--mono);
	}
	:global(.command-list span) {
		display: grid;
		gap: 0.15rem;
	}
	:global(.command-list small),
	:global(.command-palette > footer) {
		font: 450 0.48rem/1.3 var(--mono);
		color: var(--muted);
	}
	:global(.command-palette > footer) {
		padding: 0.6rem 0.8rem;
	}
	:global(.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	@keyframes enter {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 1380px) and (min-width: 901px) {
		:global(.workspace-link) {
			min-width: 5.7rem;
			grid-template-columns: auto minmax(0, 1fr);
		}
		:global(.workspace-link__signal) {
			display: none;
		}
	}

	@media (max-width: 900px) {
		.app {
			grid-template-rows: 54px minmax(0, 1fr) 52px;
		}
		.topbar {
			grid-template-columns: 1fr auto;
			padding-inline: 0.7rem 0;
		}
		:global(.workspace-rail) {
			position: fixed;
			z-index: 10;
			right: 0.6rem;
			bottom: 0.35rem;
			left: 0.6rem;
			height: 45px;
			border: 1px solid var(--strong);
			background: rgba(17, 20, 22, 0.97);
		}
		:global(.workspace-link) {
			min-width: 0;
			flex: 1;
			grid-template-columns: auto minmax(0, 1fr);
			padding: 0 0.5rem;
		}
		:global(.workspace-link__signal) {
			display: none;
		}
		.connection {
			display: none;
		}
		.stage {
			padding: 0.55rem;
		}
		:global(.workspace-pages) {
			display: flex;
			grid-row: 1;
			grid-column: 1;
			min-width: 0;
			overflow-x: auto;
			border-bottom: 1px solid var(--line);
			background: var(--surface-deep);
			scrollbar-width: none;
		}
		:global(.workspace-pages::-webkit-scrollbar) {
			display: none;
		}
		:global(.workspace-pages button) {
			min-width: max-content;
			flex: 1;
			padding: 0.55rem 0.7rem;
			border: 0;
			border-right: 1px solid var(--line);
			background: transparent;
			color: var(--muted);
			font: 520 0.52rem/1 var(--mono);
			text-transform: uppercase;
			letter-spacing: 0.05em;
			cursor: pointer;
		}
		:global(.workspace-pages button.active) {
			background: var(--accent);
			color: var(--bg);
		}
		:global(.today-screen),
		:global(.week-screen),
		:global(.delivery-screen),
		:global(.craft-screen) {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: auto minmax(12.5rem, 0.62fr) minmax(0, 1fr);
		}
		:global(.today-summary),
		:global(.week-summary),
		:global(.delivery-summary),
		:global(.quality-summary) {
			grid-row: 2;
			grid-column: 1;
			min-height: 0;
			padding: 0.85rem;
		}
		:global(.today-screen > section:not(.today-summary)),
		:global(.week-screen > section:not(.week-summary)),
		:global(.week-screen > .signal-column),
		:global(.delivery-screen > section:not(.delivery-summary)),
		:global(.craft-screen > section:not(.quality-summary)) {
			display: none;
			grid-row: 3;
			grid-column: 1;
		}
		:global(.today-screen > section.panel-visible),
		:global(.week-screen > section.panel-visible),
		:global(.week-screen > div.panel-visible),
		:global(.delivery-screen > section.panel-visible),
		:global(.craft-screen > section.panel-visible) {
			display: grid !important;
		}
		:global(.today-summary > header),
		:global(.week-summary > header),
		:global(.delivery-summary > header),
		:global(.quality-summary > header) {
			padding-bottom: 0.5rem !important;
		}
		:global(.today-total),
		:global(.headline-metric),
		:global(.delivery-summary__value),
		:global(.quality-summary__value) {
			margin: auto 0;
		}
		:global(.today-total strong),
		:global(.today-total strong > span),
		:global(.headline-metric strong),
		:global(.delivery-summary__value strong),
		:global(.quality-summary__value strong) {
			font-size: clamp(4.6rem, 18vw, 7.2rem);
		}
		:global(.today-message),
		:global(.motivation-line),
		:global(.delivery-message),
		:global(.quality-summary article) {
			margin-bottom: 0.55rem;
		}
		:global(.today-summary-grid),
		:global(.summary-stats),
		:global(.delivery-summary__facts) {
			min-height: 3.5rem;
		}
		:global(.today-portrait),
		:global(.delivery-portrait),
		:global(.craft-portrait) {
			top: -10%;
			right: -8%;
			width: min(19rem, 72%);
			height: 120%;
			opacity: 0.28;
		}
		:global(.workstream-panel) {
			grid-template-rows: auto minmax(0, 1fr);
		}
		:global(.compact-workstreams button) {
			grid-template-columns: 1.7rem 2rem minmax(8rem, 1fr) minmax(4rem, 0.45fr) minmax(
					6.5rem,
					0.7fr
				);
		}
		:global(.compact-workstreams .workstream-value:nth-of-type(3)),
		:global(.compact-workstreams .workstream-share) {
			display: none;
		}
		:global(.repository-layout) {
			grid-template-columns: minmax(0, 1fr) minmax(14rem, 0.52fr);
		}
	}
	@media (max-width: 640px) {
		.actions kbd {
			display: none;
		}
		.brand__identity strong {
			font-size: 0.72rem;
		}
		:global(.workspace-link svg) {
			display: none;
		}
		:global(.workspace-link strong) {
			font-size: 0.5rem;
		}
		:global(.workspace-label-full) {
			display: none;
		}
		:global(.workspace-label-compact) {
			display: inline;
		}
		:global(.today-screen),
		:global(.week-screen),
		:global(.delivery-screen),
		:global(.craft-screen) {
			grid-template-rows: auto minmax(12rem, 0.58fr) minmax(0, 1fr);
		}
		:global(.week-summary header p),
		:global(.quality-summary footer) {
			display: none;
		}
		:global(.today-summary-grid > div),
		:global(.summary-stats > div),
		:global(.delivery-summary__facts > div) {
			padding: 0.55rem;
		}
		:global(.today-message p),
		:global(.motivation-line p),
		:global(.delivery-message p),
		:global(.quality-summary article p) {
			font-size: 0.7rem;
		}
		:global(.compact-workstreams button) {
			grid-template-columns: 1.5rem 2rem minmax(0, 1fr) 3.6rem;
			gap: 0.5rem;
		}
		:global(.compact-workstreams .workstream-diff),
		:global(.compact-workstreams .workstream-value:nth-of-type(3)),
		:global(.compact-workstreams .workstream-share) {
			display: none;
		}
		:global(.today-workstreams article) {
			grid-template-columns: minmax(0, 1fr) auto auto;
		}
		:global(.today-workstreams article > span:nth-of-type(2)),
		:global(.today-workstreams article > span:nth-of-type(3)),
		:global(.today-workstreams article > div) {
			display: none;
		}
		:global(.today-commits a) {
			grid-template-columns: 3.4rem minmax(0, 1fr) 4rem;
		}
		:global(.today-commits small) {
			display: none;
		}
		:global(.screen-toolbar) {
			grid-template-columns: 1fr auto;
			gap: 0.5rem;
		}
		:global(.screen-toolbar > div) {
			display: grid;
			grid-column: 1 / -1;
		}
		:global(.screen-toolbar > div > span),
		:global(.screen-toolbar > div > strong) {
			display: none;
		}
		:global(.screen-toolbar label) {
			min-width: 0;
		}
		:global(.screen-toolbar nav button) {
			padding: 0.55rem 0.45rem;
		}
		:global(.repository-layout) {
			grid-template-columns: 1fr;
		}
		:global(.repository-inspector) {
			display: none;
		}
		:global(.repository-table > header),
		:global(.repository-table .repository-rows button) {
			grid-template-columns: minmax(0, 1fr) 4rem 4rem;
		}
		:global(.repository-table > header span:nth-child(2)),
		:global(.repository-rows button > span:nth-child(2)) {
			display: none;
		}
		:global(.ledger-toolbar) {
			grid-template-columns: 1fr;
			gap: 0.4rem;
		}
		:global(.ledger-toolbar > div) {
			display: none;
		}
		:global(.commit-header),
		:global(.ledger-table li a) {
			grid-template-columns: 3.4rem minmax(0, 1fr) 4.4rem 0.8rem;
		}
		:global(.commit-header span:nth-child(3)),
		:global(.ledger-table li a > span:nth-child(3)) {
			display: none;
		}
		:global(.commit-inspector) {
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 0.55rem;
		}
		:global(.commit-inspector__facts) {
			display: none;
		}
	}
	@media (max-height: 650px) {
		.app {
			grid-template-rows: 50px minmax(0, 1fr);
		}
		.stage {
			padding: 0.45rem;
		}
		:global(.week-summary) {
			padding: 0.8rem;
		}
		:global(.headline-metric strong) {
			font-size: clamp(4rem, 9vw, 7rem);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.stage > section.active,
		:global(.spinning) {
			animation: none;
		}
		:global(*) {
			transition-duration: 0.01ms !important;
		}
	}
</style>
