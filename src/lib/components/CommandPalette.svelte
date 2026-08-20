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
	let dialog = $state<HTMLDialogElement>();

	$effect(() => {
		if (dialog === undefined) return;
		if (open && !dialog.open) {
			dialog.showModal();
			dialog.querySelector<HTMLButtonElement>('.command-list button')?.focus();
		}
		if (!open && dialog.open) dialog.close();
	});

	function closeFromDialog(): void {
		if (open) onClose();
	}

	function closeFromBackdrop(event: MouseEvent): void {
		if (event.target === event.currentTarget) onClose();
	}
</script>

<dialog
	bind:this={dialog}
	class="command-palette"
	aria-label="Dashboard command palette"
	onclose={closeFromDialog}
	onclick={closeFromBackdrop}
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
</dialog>
