<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { page } from '$app/stores';
	import Dashboard from '$lib/components/Dashboard.svelte';

	const authState = auth;

	// Redirect unauthenticated users to main domain
	$effect(() => {
		if (!$authState.isLoading && !$authState.isAuthenticated) {
			// Redirect to main domain for authentication
			window.location.href = `https://val.io/?redirect=${encodeURIComponent($page.url.href)}`;
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
	<!-- Authentication required message -->
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<h1 class="text-2xl font-bold text-white mb-4">Authentication Required</h1>
			<p class="text-gray-400 mb-6">Redirecting to sign in...</p>
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
		</div>
	</div>
{/if}
