<script lang="ts">
	import { ArrowRight, Command, MagnifyingGlass, X } from 'phosphor-svelte';
	import type { DashboardWorkspace, WorkspaceDefinition } from '$lib/domain/dashboard-workspace';

	type Props = {
		readonly open: boolean;
		readonly workspaces: ReadonlyArray<WorkspaceDefinition>;
		readonly onClose: () => void;
		readonly onWorkspace: (workspace: DashboardWorkspace) => void;
	};

	let { open, workspaces, onClose, onWorkspace }: Props = $props();
</script>

{#if open}
	<div class="command-scrim">
		<button
			class="command-backdrop"
			type="button"
			onclick={onClose}
			aria-label="Close command palette"
		></button>
		<div
			class="command-palette"
			role="dialog"
			aria-modal="true"
			aria-label="Dashboard command palette"
		>
			<header>
				<MagnifyingGlass size={18} weight="light" aria-hidden="true" />
				<span>Open a section</span>
				<button type="button" onclick={onClose} aria-label="Close command palette">
					<X size={17} weight="bold" aria-hidden="true" />
				</button>
			</header>
			<div class="command-list">
				{#each workspaces as workspace (workspace.id)}
					<button type="button" onclick={() => onWorkspace(workspace.id)}>
						<kbd>{workspace.shortcut}</kbd>
						<span>
							<strong>{workspace.label}</strong>
							<small>{workspace.description}</small>
						</span>
						<ArrowRight size={17} weight="light" aria-hidden="true" />
					</button>
				{/each}
			</div>
			<footer><Command size={15} weight="light" aria-hidden="true" /> Keyboard ready</footer>
		</div>
	</div>
{/if}
