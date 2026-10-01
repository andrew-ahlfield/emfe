<script lang="ts">
	import type { Allocation, LicenseRank } from '$lib/data/types';
	import { inspectorPinned, togglePinned } from '$lib/state/inspector';
	import Drawer from './Drawer.svelte';
	import Inspector from './Inspector.svelte';

	let {
		allocation,
		license,
		open,
		onclose
	}: {
		allocation: Allocation;
		license: LicenseRank;
		open: boolean;
		onclose: () => void;
	} = $props();
</script>

<!-- The marker inspector: the shared drawer shell plus the pin/dock affordance (unique to it,
     since pinning docks the panel beside the number line; the page shifts left in +page.svelte). -->
<Drawer {open} label="Allocation details" {onclose} pinned={$inspectorPinned} onpin={togglePinned}>
	<Inspector {allocation} {license} />
</Drawer>
