<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { links } from '$lib/stores/links';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const authState = auth;
	const linksState = links;

	let sidebarOpen = $state(false);
	let urlInput = $state('');
	let isShortening = $state(false);
	let searchQuery = $state('');

	// Redirect if not authenticated
	$effect(() => {
		if (!$authState.isLoading && !$authState.isAuthenticated) {
			goto('/');
		}
	});

	// Load user links when authenticated
	$effect(() => {
		if (!$authState.isLoading && $authState.isAuthenticated) {
			links.loadLinks();
		}
	});

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	async function handleShorten(e: Event) {
		e.preventDefault();
		if (!urlInput.trim() || isShortening) return;

		isShortening = true;
		try {
			await links.shortenUrl(urlInput.trim());
			urlInput = '';
		} finally {
			isShortening = false;
		}
	}

	async function handleDelete(shortCode: string) {
		await links.deleteLink(shortCode);
	}

	function handleLogout() {
		auth.logout();
	}

	const filteredLinks = $derived(searchQuery 
		? $linksState.links.filter(link => 
			link.originalUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
			link.shortCode.toLowerCase().includes(searchQuery.toLowerCase())
		)
		: $linksState.links);
</script>

{#if $authState.isLoading}
	<!-- Loading Screen -->
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
			<p class="text-lg font-medium text-white">Loading LinkShort...</p>
		</div>
	</div>
{:else if $authState.isAuthenticated}
	<!-- Authenticated Dashboard -->
	<div>
		<!-- Static sidebar for desktop -->
		<div class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
			<div class="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 after:pointer-events-none after:absolute after:inset-0 after:rounded-r-2xl after:border-r after:border-white/5">
				<div class="flex h-16 shrink-0 items-center">
					<div class="h-8 w-auto text-indigo-400 font-bold text-xl">LinkShort</div>
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
							<button 
								onclick={handleLogout}
								class="w-full flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-white hover:bg-white/5"
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
							</button>
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
								<div class="h-8 w-auto text-indigo-400 font-bold text-xl">LinkShort</div>
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
										<button 
											onclick={handleLogout}
											class="w-full flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-white hover:bg-white/5"
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
										</button>
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
		<main class="lg:pl-72">
			<div class="px-4 sm:px-6 lg:px-8 py-10">
				<!-- Page header -->
				<div class="sm:flex sm:items-center">
					<div class="sm:flex-auto">
						<h1 class="text-base/7 font-semibold text-white">URL Shortener</h1>
						<p class="mt-2 text-sm text-gray-400">Create and manage your shortened URLs</p>
					</div>
				</div>

				<!-- URL Shortening Form -->
				<div class="mt-8">
					<form onsubmit={handleShorten} class="flex flex-col sm:flex-row gap-4">
						<div class="flex-1">
							<label for="url-input" class="sr-only">URL to shorten</label>
							<input
								id="url-input"
								bind:value={urlInput}
								type="url"
								required
								placeholder="https://your-long-url.com/very/long/path"
								class="w-full rounded-md border-0 px-4 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6"
							/>
						</div>
						<button
							type="submit"
							disabled={isShortening}
							class="rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isShortening ? 'Shortening...' : 'Shorten URL'}
						</button>
					</form>
				</div>

				<!-- Links Management -->
				<div class="mt-8">
					<div class="sm:flex sm:items-center mb-4">
						<div class="sm:flex-auto">
							<h2 class="text-base/7 font-semibold text-white">Your Links</h2>
							<p class="mt-1 text-sm text-gray-400">
								{$linksState.links.length} link{$linksState.links.length !== 1 ? 's' : ''}
							</p>
						</div>
						<div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
							<input
								bind:value={searchQuery}
								type="text"
								placeholder="Search links..."
								class="rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6"
							/>
						</div>
					</div>

					{#if $linksState.isLoading}
						<div class="text-center py-8">
							<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
							<p class="text-sm text-gray-400">Loading links...</p>
						</div>
					{:else if filteredLinks.length === 0}
						<div class="text-center py-8">
							<svg class="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
							</svg>
							<h3 class="mt-2 text-sm font-medium text-white">No links found</h3>
							<p class="mt-1 text-sm text-gray-400">
								{searchQuery ? 'Try adjusting your search query.' : 'Get started by creating a short link.'}
							</p>
						</div>
					{:else}
						<div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
							<table class="min-w-full divide-y divide-gray-700">
								<thead class="bg-gray-800">
									<tr>
										<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
											Short URL
										</th>
										<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
											Original URL
										</th>
										<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
											Clicks
										</th>
										<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
											Created
										</th>
										<th scope="col" class="relative px-6 py-3">
											<span class="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody class="bg-gray-900 divide-y divide-gray-700">
									{#each filteredLinks as link (link.shortCode)}
										<tr>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="flex items-center">
													<code class="text-sm font-mono text-indigo-400">
														/{link.shortCode}
													</code>
													<button
														onclick={() => navigator.clipboard.writeText(`${window.location.origin}/${link.shortCode}`)}
														class="ml-2 text-gray-400 hover:text-white"
														title="Copy to clipboard"
														aria-label="Copy short URL to clipboard"
													>
														<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
														</svg>
													</button>
												</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm text-white max-w-xs truncate" title={link.originalUrl}>
													{link.originalUrl}
												</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
												{link.clicks || 0}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
												{new Date(link.createdAt).toLocaleDateString()}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
												<button
													onclick={() => handleDelete(link.shortCode)}
													class="text-red-400 hover:text-red-300"
												>
													Delete
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		</main>
	</div>
{/if}