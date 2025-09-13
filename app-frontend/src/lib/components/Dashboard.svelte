<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { links } from '$lib/stores/links';
	import { goto } from '$app/navigation';

	const authState = auth;
	const linksState = links;

	let sidebarOpen = $state(false);
	let urlInput = $state('');
	let isShortening = $state(false);
	let searchQuery = $state('');
	let userDropdownOpen = $state(false);
	let shortenedResult = $state(null);
	let shortenError = $state('');

	// Load user links when authenticated
	$effect(() => {
		if (!$authState.isLoading && $authState.isAuthenticated && $authState.user) {
			links.loadLinks($authState.user.login);
		}
	});

	// Close dropdown when clicking outside
	$effect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (userDropdownOpen && !(event.target as Element)?.closest('.relative')) {
				userDropdownOpen = false;
			}
		}

		if (userDropdownOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function toggleUserDropdown() {
		userDropdownOpen = !userDropdownOpen;
	}

	async function handleShorten(e: Event) {
		e.preventDefault();
		if (!urlInput.trim() || isShortening || !$authState.user) return;

		// Reset states
		shortenedResult = null;
		shortenError = '';

		isShortening = true;
		try {
			const result = await links.shortenUrl(urlInput.trim(), $authState.user.login);
			console.log('Shorten result:', result); // Debug log
			
			if (!result || !result.shortCode) {
				throw new Error('Invalid response: missing shortCode');
			}
			
			shortenedResult = {
				shortUrl: result.shortUrl, // Use the shortUrl from API response
				originalUrl: urlInput.trim(),
				shortCode: result.shortCode
			};
			urlInput = '';
		} catch (error) {
			console.error('Shorten error:', error); // Debug log
			shortenError = error.message || 'Failed to shorten URL. Please try again.';
		} finally {
			isShortening = false;
		}
	}

	async function handleDelete(shortCode: string) {
		if (!$authState.user) return;
		await links.deleteLink(shortCode, $authState.user.login);
	}

	function handleLogout() {
		auth.logout();
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		
		if (diffDays === 0) {
			return 'Today';
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else {
			return date.toLocaleDateString();
		}
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
		} catch (err) {
			console.error('Failed to copy to clipboard:', err);
		}
	}

	const filteredLinks = $derived(searchQuery 
		? $linksState.links.filter(link => 
			link.originalUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
			link.shortCode.toLowerCase().includes(searchQuery.toLowerCase())
		)
		: $linksState.links);
</script>

<div>
	<!-- Static sidebar for desktop -->
	<div class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
		<div class="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 after:pointer-events-none after:absolute after:inset-0 after:rounded-r-2xl after:border-r after:border-white/5">
			<div class="flex h-16 shrink-0 items-center">
				<div class="h-8 w-auto text-indigo-400 font-bold text-xl">Val.io</div>
			</div>
			<nav class="flex flex-1 flex-col">
				<ul role="list" class="flex flex-1 flex-col gap-y-7">
					<li>
						<ul role="list" class="flex flex-1 flex-col gap-y-7">
							<li>
								<ul role="list" class="-mx-2 space-y-1">
									<li>
										<button type="button" class="bg-white/5 text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left">
											<svg class="text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
												<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
											</svg>
											Dashboard
										</button>
									</li>
									<li>
										<button type="button" class="text-gray-400 hover:bg-white/5 hover:text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left">
											<svg class="text-gray-400 group-hover:text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
												<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
											</svg>
											Team
										</button>
									</li>
									<li>
										<button type="button" class="text-gray-400 hover:bg-white/5 hover:text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left">
											<svg class="text-gray-400 group-hover:text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
												<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
											</svg>
											Projects
										</button>
									</li>
									<li>
										<button type="button" class="text-gray-400 hover:bg-white/5 hover:text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left">
											<svg class="text-gray-400 group-hover:text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
												<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
											</svg>
											Calendar
										</button>
									</li>
									<li>
										<button type="button" class="text-gray-400 hover:bg-white/5 hover:text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left">
											<svg class="text-gray-400 group-hover:text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
												<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 0014.25 8.25h-1.875" />
											</svg>
											Documents
										</button>
									</li>
									<li>
										<button type="button" class="text-gray-400 hover:bg-white/5 hover:text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left">
											<svg class="text-gray-400 group-hover:text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
												<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
												<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
											</svg>
											About
										</button>
									</li>
								</ul>
							</li>
						</ul>
					</li>
					<li class="-mx-6 mt-auto">
						<div class="relative">
							<button 
								onclick={toggleUserDropdown}
								class="w-full flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-white hover:bg-white/5"
								aria-expanded={userDropdownOpen}
							>
								{#if $authState.user?.avatar_url}
									<img
										class="size-8 rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10"
										src={$authState.user.avatar_url}
										alt={$authState.user.name || $authState.user.login}
									/>
								{/if}
								<span class="sr-only">Your profile</span>
								<span aria-hidden="true">{$authState.user?.name || $authState.user?.login}</span>
								<svg class="ml-auto size-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
								</svg>
							</button>

							{#if userDropdownOpen}
								<div class="absolute left-0 bottom-full w-full z-10 mb-1 origin-bottom-left rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
									<button
										onclick={() => {/* TODO: Navigate to profile */}}
										class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
										role="menuitem"
									>
										Your profile
									</button>
									<button
										onclick={() => { userDropdownOpen = false; handleLogout(); }}
										class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
										role="menuitem"
									>
										Sign out
									</button>
								</div>
							{/if}
						</div>
					</li>
				</ul>
			</nav>
		</div>
	</div>

	<!-- Mobile sidebar overlay -->
	{#if sidebarOpen}
		<div class="relative z-50 lg:hidden" role="dialog" aria-modal="true">
			<div class="fixed inset-0 bg-gray-900/80" aria-hidden="true"></div>
			<div class="fixed inset-0 flex">
				<div class="relative mr-16 flex w-full max-w-xs flex-1">
					<div class="absolute left-full top-0 flex w-16 justify-center pt-5">
						<button type="button" class="-m-2.5 p-2.5" onclick={toggleSidebar}>
							<span class="sr-only">Close sidebar</span>
							<svg class="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					<div class="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-2">
						<div class="flex h-16 shrink-0 items-center">
							<div class="h-8 w-auto text-indigo-400 font-bold text-xl">Val.io</div>
						</div>
						<nav class="flex flex-1 flex-col">
							<ul role="list" class="flex flex-1 flex-col gap-y-7">
								<li>
									<ul role="list" class="-mx-2 space-y-1">
										<li>
											<button type="button" class="bg-white/5 text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold">
												<svg class="text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
													<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
												</svg>
												Dashboard
											</button>
										</li>
									</ul>
								</li>
								<li class="-mx-6 mt-auto">
									<div class="relative">
										<button 
											onclick={toggleUserDropdown}
											class="w-full flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-white hover:bg-white/5"
											aria-expanded={userDropdownOpen}
										>
											{#if $authState.user?.avatar_url}
												<img
													class="size-8 rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10"
													src={$authState.user.avatar_url}
													alt={$authState.user.name || $authState.user.login}
												/>
											{/if}
											<span class="sr-only">Your profile</span>
											<span aria-hidden="true">{$authState.user?.name || $authState.user?.login}</span>
											<svg class="ml-auto size-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
												<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
											</svg>
										</button>

										{#if userDropdownOpen}
											<div class="absolute left-0 bottom-full w-full z-10 mb-1 origin-bottom-left rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
												<button
													onclick={() => {/* TODO: Navigate to profile */}}
													class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
													role="menuitem"
												>
													Your profile
												</button>
												<button
													onclick={() => { userDropdownOpen = false; sidebarOpen = false; handleLogout(); }}
													class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
													role="menuitem"
												>
													Sign out
												</button>
											</div>
										{/if}
									</div>
								</li>
							</ul>
						</nav>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Mobile header -->
	<div class="sticky top-0 z-40 flex items-center gap-x-6 bg-gray-900 px-4 py-4 after:pointer-events-none after:absolute after:inset-0 after:border-b after:border-white/10 after:bg-black/10 sm:px-6 lg:hidden">
		<button
			type="button"
			class="-m-2.5 p-2.5 text-gray-400 hover:text-white lg:hidden"
			onclick={toggleSidebar}
		>
			<span class="sr-only">Open sidebar</span>
			<svg class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
			</svg>
		</button>
		<div class="flex-1 text-sm/6 font-semibold text-white">
			Dashboard
		</div>
		<div class="flex items-center gap-x-4">
			{#if $authState.user?.avatar_url}
				<img
					class="size-8 rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10"
					src={$authState.user.avatar_url}
					alt={$authState.user.name || $authState.user.login}
				/>
			{/if}
		</div>
	</div>

	<!-- Main content -->
	<main class="py-10 lg:pl-72">
		<div class="px-4 sm:px-6 lg:px-8">
			<div class="mb-8">
				<h1 class="text-2xl font-bold text-white mb-6">Dashboard</h1>
				
				<!-- URL Shortener Form -->
				<div class="mb-6">
					<div class="bg-white/5 backdrop-blur-sm rounded-lg p-6 ring-1 ring-white/10">
						<h2 class="text-lg font-semibold text-white mb-4">Shorten URL</h2>
						
						<form onsubmit={handleShorten} class="space-y-4">
							<div>
								<label for="url-input" class="block text-sm font-medium text-gray-300 mb-2">
									Enter URL to shorten
								</label>
								<div class="relative">
									<input
										id="url-input"
										bind:value={urlInput}
										type="url"
										required
										placeholder="https://example.com/very/long/url"
										class="w-full rounded-md border-0 px-4 py-3 bg-white/10 text-white shadow-sm ring-1 ring-inset ring-white/20 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-400 sm:text-sm/6"
									/>
									{#if isShortening}
										<div class="absolute inset-y-0 right-0 flex items-center pr-3">
											<svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
										</div>
									{/if}
								</div>
							</div>
							
							<button
								type="submit"
								disabled={isShortening}
								class="w-full rounded-md bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
							>
								{isShortening ? 'Shortening...' : 'Shorten URL'}
							</button>
						</form>

						<!-- Success Result -->
						{#if shortenedResult}
							<div class="mt-6 p-4 bg-green-900/20 border border-green-500/20 rounded-md">
								<div class="flex items-start">
									<div class="flex-shrink-0">
										<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
										</svg>
									</div>
									<div class="ml-3 flex-1">
										<h3 class="text-sm font-medium text-green-400">URL Shortened Successfully!</h3>
										<div class="mt-2">
											<p class="text-sm text-gray-300 mb-2">Your shortened URL:</p>
											<div class="flex items-center space-x-2 bg-gray-800/50 rounded-md p-3">
												<code class="flex-1 text-sm text-white font-mono break-all">{shortenedResult.shortUrl}</code>
												<button
													onclick={() => copyToClipboard(shortenedResult.shortUrl)}
													class="flex-shrink-0 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded transition-colors text-indigo-300 bg-indigo-900/20 hover:bg-indigo-900/30"
													aria-label="Copy shortened URL"
												>
													<svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.375a2.25 2.25 0 01-2.25-2.25V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
													</svg>
													Copy
												</button>
											</div>
											<p class="text-xs text-gray-400 mt-2">Original: {shortenedResult.originalUrl}</p>
										</div>
									</div>
								</div>
							</div>
						{/if}

						<!-- Error Display -->
						{#if shortenError}
							<div class="mt-4 p-4 bg-red-900/20 border border-red-500/20 rounded-md">
								<div class="flex">
									<div class="flex-shrink-0">
										<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
										</svg>
									</div>
									<div class="ml-3">
										<h3 class="text-sm font-medium text-red-400">Error</h3>
										<p class="mt-1 text-sm text-red-300">{shortenError}</p>
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
				
				<!-- Link Management Dashboard -->
				<div class="mb-6">
					<div class="bg-white/5 backdrop-blur-sm rounded-lg p-6 ring-1 ring-white/10">
						<div class="flex items-center justify-between mb-6">
							<h2 class="text-lg font-semibold text-white">Your Links</h2>
							<button
								onclick={() => links.loadLinks($authState.user?.login)}
								class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-300 bg-indigo-900/20 hover:bg-indigo-900/30 transition-colors"
							>
								<svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
								</svg>
								Refresh
							</button>
						</div>

						<!-- Search and Filter Controls -->
						<div class="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:space-x-4">
							<div class="flex-1">
								<label for="search-links" class="sr-only">Search links</label>
								<div class="relative">
									<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
										</svg>
									</div>
									<input
										bind:value={searchQuery}
										type="text"
										placeholder="Search by URL or short code..."
										class="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
									/>
								</div>
							</div>
						</div>

						<!-- Links List -->
						{#if $linksState.isLoading}
							<!-- Loading state -->
							<div class="text-center py-12">
								<svg class="animate-spin mx-auto h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								<p class="mt-2 text-sm text-gray-400">Loading your links...</p>
							</div>
						{:else if filteredLinks.length === 0}
							<!-- Empty state -->
							<div class="text-center py-12">
								<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
								</svg>
								<h3 class="mt-2 text-sm font-medium text-gray-300">
									{searchQuery ? 'No links found' : 'No links yet'}
								</h3>
								<p class="mt-1 text-sm text-gray-400">
									{searchQuery ? 'Try adjusting your search query.' : 'Start by shortening your first URL above.'}
								</p>
							</div>
						{:else}
							<!-- Links container -->
							<div class="space-y-4">
								{#each filteredLinks as link (link.shortCode)}
									<div class="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
										<div class="flex items-start justify-between">
											<div class="flex-1 min-w-0">
												<!-- Short URL -->
												<div class="flex items-center space-x-2 mb-2">
													<code class="text-sm font-mono text-indigo-400 bg-indigo-900/20 px-2 py-1 rounded">
														/{link.shortCode}
													</code>
													<button
														onclick={() => navigator.clipboard.writeText(`${window.location.origin}/${link.shortCode}`)}
														class="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-400 hover:text-white transition-colors"
														aria-label="Copy short URL to clipboard"
													>
														<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.375a2.25 2.25 0 01-2.25-2.25V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
														</svg>
													</button>
												</div>
												
												<!-- Original URL -->
												<p class="text-sm text-gray-300 truncate mb-2" title={link.originalUrl}>
													{link.originalUrl}
												</p>
												
												<!-- Stats and Meta -->
												<div class="flex items-center space-x-4 text-xs text-gray-400">
													<span class="flex items-center">
														<svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
														</svg>
														{link.clicks || 0} clicks
													</span>
													<span class="flex items-center">
														<svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
														</svg>
														{formatDate(link.createdAt)}
													</span>
												</div>
											</div>
											
											<!-- Actions -->
											<div class="flex items-center space-x-2 ml-4">
												<button
													onclick={() => {/* TODO: Analytics */}}
													class="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 transition-colors"
												>
													<svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
													</svg>
													Analytics
												</button>
												<button
													onclick={() => handleDelete(link.shortCode)}
													class="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-red-300 bg-red-900/20 hover:bg-red-900/30 transition-colors"
												>
													<svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
													</svg>
													Delete
												</button>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</main>
</div>