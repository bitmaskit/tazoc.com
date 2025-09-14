<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { page } from '$app/stores';
	import Dashboard from '$lib/components/Dashboard.svelte';

	const authState = auth;

	// Return 404 for unauthenticated users instead of redirecting
	$effect(() => {
		if (!$authState.isLoading && !$authState.isAuthenticated) {
			// Return 404 to break redirect loops - let the template handle this
		}
	});
</script>

{#if $authState.isLoading}
	<!-- Loading Screen -->
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
			<p class="text-lg font-medium text-white">Loading Val.io Dashboard...</p>
		</div>
	</div>
{:else if $authState.isAuthenticated}
	<!-- Dashboard -->
	<Dashboard />
{:else}
	<!-- Return 404 for unauthenticated users -->
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<h1 class="text-9xl font-bold text-white mb-4">404</h1>
			<p class="text-gray-400 text-xl">Page Not Found</p>
		</div>
	</div>
{/if}
