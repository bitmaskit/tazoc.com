<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Check authentication status on app load
	onMount(() => {
		auth.checkAuth();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Val.io - URL Shortener</title>
</svelte:head>

<div class="bg-gray-900 min-h-screen">
	{@render children?.()}
</div>
