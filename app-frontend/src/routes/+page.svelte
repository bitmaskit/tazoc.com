<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AuthModal from '$lib/components/AuthModal.svelte';
	import Dashboard from '$lib/components/Dashboard.svelte';

	const authState = auth;
	let showAuthModal = $state(false);

	function openAuthModal() {
		showAuthModal = true;
	}

	function closeAuthModal() {
		showAuthModal = false;
	}

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
			<p class="text-gray-400 mb-6">Please sign in to access your dashboard.</p>
			<button onclick={openAuthModal} class="rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition-colors">
				Sign in to continue
			</button>
		</div>
	</div>

	<!-- Authentication Modal -->
	<AuthModal open={showAuthModal} onClose={closeAuthModal} />
{/if}
