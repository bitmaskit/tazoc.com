<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import AuthModal from '$lib/components/AuthModal.svelte';

	const authState = auth;
	let showAuthModal = $state(false);

	function openAuthModal() {
		showAuthModal = true;
	}

	function closeAuthModal() {
		showAuthModal = false;
	}

	// Redirect to app if already authenticated
	$effect(() => {
		if ($authState.isAuthenticated) {
			window.location.href = 'https://app.val.io';
		}
	});
</script>

{#if $authState.isLoading}
	<!-- Loading Screen -->
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
			<p class="text-lg font-medium text-white">Loading Val.io...</p>
		</div>
	</div>
{:else if !$authState.isAuthenticated}
	<!-- Anonymous Landing Page -->
	<div>
		<!-- Header -->
		<header class="absolute inset-x-0 top-0 z-50">
			<nav class="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
				<div class="flex lg:flex-1">
					<a href="/" class="-m-1.5 p-1.5">
						<span class="sr-only">Val.io</span>
						<div class="h-8 w-auto text-indigo-400 font-bold text-xl">
							Val.io
						</div>
					</a>
				</div>
				<div class="hidden lg:flex lg:gap-x-12">
					<a href="#features" class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">Features</a>
					<a href="#pricing" class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">Pricing</a>
					<a href="#about" class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">About</a>
				</div>
				<div class="hidden lg:flex lg:flex-1 lg:justify-end">
					<button onclick={openAuthModal} class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">
						Sign in <span aria-hidden="true">&rarr;</span>
					</button>
				</div>
			</nav>
		</header>

		<main class="isolate">
			<!-- Hero section -->
			<div class="relative pt-14">
				<div
					class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
					aria-hidden="true"
				>
					<div
						class="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-288.75"
						style="
							clip-path: polygon(
								74.1% 44.1%,
								100% 61.6%,
								97.5% 26.9%,
								85.5% 0.1%,
								80.7% 2%,
								72.5% 32.5%,
								60.2% 62.4%,
								52.4% 68.1%,
								47.5% 58.3%,
								45.2% 34.5%,
								27.5% 76.7%,
								0.1% 64.9%,
								17.9% 100%,
								27.6% 76.8%,
								76.1% 97.7%,
								74.1% 44.1%
							);
						"
					></div>
				</div>
				<div class="py-24 sm:py-32 lg:pb-40">
					<div class="mx-auto max-w-7xl px-6 lg:px-8">
						<div class="mx-auto max-w-2xl text-center">
							<h1 class="text-5xl font-semibold tracking-tight text-balance text-white sm:text-7xl">
								Shorten your links, expand your reach
							</h1>
							<p class="mt-8 text-lg font-medium text-pretty text-gray-400 sm:text-xl/8">
								Transform long, complex URLs into short, memorable links. Track clicks, analyze performance, and boost your online presence.
							</p>
							
							<!-- URL Input Form -->
							<div class="mt-10 mx-auto max-w-xl">
								<!-- Show placeholder form for non-authenticated users -->
								<div>
									<form class="flex flex-col sm:flex-row gap-4">
										<div class="flex-1">
											<input
												type="url"
												disabled
												placeholder="https://your-long-url.com/very/long/path"
												class="w-full rounded-md border-0 px-4 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed sm:text-sm/6"
											/>
										</div>
										<button
											type="button"
											onclick={openAuthModal}
											class="rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition-colors whitespace-nowrap"
										>
											Get started for free
										</button>
									</form>
									<p class="mt-3 text-sm text-gray-500">
										No sign-up required • Free forever • Unlimited short links
									</p>
								</div>
							</div>
						</div>
						
						<!-- Feature Preview Cards -->
						<div id="features" class="mt-16 flow-root sm:mt-24">
							<div class="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:gap-8">
								<div class="rounded-xl bg-white/5 p-6 ring-1 ring-white/10">
									<div class="flex items-center">
										<div class="flex-shrink-0">
											<svg class="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
											</svg>
										</div>
										<div class="ml-4">
											<h3 class="text-lg font-medium text-white">Instant Shortening</h3>
											<p class="text-sm text-gray-400 mt-1">Create short links in seconds</p>
										</div>
									</div>
								</div>
								
								<div class="rounded-xl bg-white/5 p-6 ring-1 ring-white/10">
									<div class="flex items-center">
										<div class="flex-shrink-0">
											<svg class="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
											</svg>
										</div>
										<div class="ml-4">
											<h3 class="text-lg font-medium text-white">Analytics</h3>
											<p class="text-sm text-gray-400 mt-1">Track clicks and performance</p>
										</div>
									</div>
								</div>
								
								<div class="rounded-xl bg-white/5 p-6 ring-1 ring-white/10">
									<div class="flex items-center">
										<div class="flex-shrink-0">
											<svg class="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
											</svg>
										</div>
										<div class="ml-4">
											<h3 class="text-lg font-medium text-white">Secure & Reliable</h3>
											<p class="text-sm text-gray-400 mt-1">Enterprise-grade security</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div
					class="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
					aria-hidden="true"
				>
					<div
						class="relative left-[calc(50%+3rem)] aspect-1155/678 w-144.5 -translate-x-1/2 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%+36rem)] sm:w-288.75"
						style="
							clip-path: polygon(
								74.1% 44.1%,
								100% 61.6%,
								97.5% 26.9%,
								85.5% 0.1%,
								80.7% 2%,
								72.5% 32.5%,
								60.2% 62.4%,
								52.4% 68.1%,
								47.5% 58.3%,
								45.2% 34.5%,
								27.5% 76.7%,
								0.1% 64.9%,
								17.9% 100%,
								27.6% 76.8%,
								76.1% 97.7%,
								74.1% 44.1%
							);
						"
					></div>
				</div>
			</div>
		</main>

		<!-- Pricing Section -->
		<section id="pricing" class="py-24 sm:py-32">
			<div class="mx-auto max-w-7xl px-6 lg:px-8">
				<div class="mx-auto max-w-4xl text-center">
					<h2 class="text-base/7 font-semibold text-indigo-400">Pricing</h2>
					<p class="mt-2 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
						Choose your plan
					</p>
					<p class="mt-6 text-lg/8 text-gray-300">
						Start for free, scale as you grow. All plans include unlimited short links and basic analytics.
					</p>
				</div>
				
				<div class="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 xl:gap-x-12">
					<!-- Free Plan -->
					<div class="rounded-3xl bg-white/5 ring-1 ring-white/10 p-8 xl:p-10">
						<div class="flex items-center justify-between gap-x-4">
							<h3 class="text-lg/8 font-semibold text-white">Free</h3>
						</div>
						<p class="mt-4 text-sm/6 text-gray-300">Perfect for personal use and trying out our service.</p>
						<p class="mt-6 flex items-baseline gap-x-1">
							<span class="text-5xl font-semibold tracking-tight text-white">$0</span>
							<span class="text-sm/6 font-semibold text-gray-300">/month</span>
						</p>
						<button onclick={openAuthModal} class="mt-6 block w-full rounded-md bg-indigo-500 px-3 py-2 text-center text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
							Get started for free
						</button>
						<ul role="list" class="mt-8 space-y-3 text-sm/6 text-gray-300">
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								1,000 short links per month
							</li>
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								Basic analytics
							</li>
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								GitHub authentication
							</li>
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								Community support
							</li>
						</ul>
					</div>
					
					<!-- Pro Plan -->
					<div class="rounded-3xl bg-white/5 ring-1 ring-white/10 p-8 xl:p-10 lg:mt-8 xl:mt-0">
						<div class="flex items-center justify-between gap-x-4">
							<h3 class="text-lg/8 font-semibold text-white">Pro</h3>
							<p class="rounded-full bg-indigo-500 px-2.5 py-1 text-xs/5 font-semibold text-white">Most popular</p>
						</div>
						<p class="mt-4 text-sm/6 text-gray-300">For professionals and small teams who need more features.</p>
						<p class="mt-6 flex items-baseline gap-x-1">
							<span class="text-5xl font-semibold tracking-tight text-white">$9</span>
							<span class="text-sm/6 font-semibold text-gray-300">/month</span>
						</p>
						<button onclick={openAuthModal} class="mt-6 block w-full rounded-md bg-indigo-500 px-3 py-2 text-center text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
							Start free trial
						</button>
						<ul role="list" class="mt-8 space-y-3 text-sm/6 text-gray-300">
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								50,000 short links per month
							</li>
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								Advanced analytics & insights
							</li>
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								Custom short domains
							</li>
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								Team collaboration
							</li>
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								Priority support
							</li>
						</ul>
					</div>
					
					<!-- Enterprise Plan -->
					<div class="rounded-3xl bg-white/5 ring-1 ring-white/10 p-8 xl:p-10">
						<div class="flex items-center justify-between gap-x-4">
							<h3 class="text-lg/8 font-semibold text-white">Enterprise</h3>
						</div>
						<p class="mt-4 text-sm/6 text-gray-300">For large organizations with advanced security and compliance needs.</p>
						<p class="mt-6 flex items-baseline gap-x-1">
							<span class="text-5xl font-semibold tracking-tight text-white">$99</span>
							<span class="text-sm/6 font-semibold text-gray-300">/month</span>
						</p>
						<button onclick={openAuthModal} class="mt-6 block w-full rounded-md bg-white/10 px-3 py-2 text-center text-sm/6 font-semibold text-white ring-1 ring-inset ring-white/20 hover:ring-white/30">
							Contact sales
						</button>
						<ul role="list" class="mt-8 space-y-3 text-sm/6 text-gray-300">
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								Unlimited short links
							</li>
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								Enterprise-grade security
							</li>
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								SSO & SAML integration
							</li>
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								Dedicated account manager
							</li>
							<li class="flex gap-x-3">
								<svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
								</svg>
								24/7 phone support
							</li>
						</ul>
					</div>
				</div>
			</div>
		</section>

		<!-- Footer -->
		<footer class="bg-black/20 border-t border-white/10">
			<div class="mx-auto max-w-7xl px-6 py-12 lg:px-8">
				<div class="xl:grid xl:grid-cols-3 xl:gap-8">
					<div class="space-y-8">
						<div class="h-8 w-auto text-indigo-400 font-bold text-xl">Val.io</div>
						<p class="text-sm/6 text-gray-300">
							Transform long, complex URLs into short, memorable links. Track clicks, analyze performance, and boost your online presence.
						</p>
						<div class="flex space-x-6">
							<a href="#" class="text-gray-500 hover:text-gray-400">
								<span class="sr-only">GitHub</span>
								<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
								</svg>
							</a>
							<a href="#" class="text-gray-500 hover:text-gray-400">
								<span class="sr-only">Twitter</span>
								<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
								</svg>
							</a>
						</div>
					</div>
					<div class="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
						<div class="md:grid md:grid-cols-2 md:gap-8">
							<div>
								<h3 class="text-sm/6 font-semibold text-white">Product</h3>
								<ul role="list" class="mt-6 space-y-4">
									<li>
										<a href="#features" class="text-sm/6 text-gray-300 hover:text-white">Features</a>
									</li>
									<li>
										<a href="#pricing" class="text-sm/6 text-gray-300 hover:text-white">Pricing</a>
									</li>
									<li>
										<a href="/api/security/stats?key=valentinofx" class="text-sm/6 text-gray-300 hover:text-white">Security</a>
									</li>
								</ul>
							</div>
							<div class="mt-10 md:mt-0">
								<h3 class="text-sm/6 font-semibold text-white">Support</h3>
								<ul role="list" class="mt-6 space-y-4">
									<li>
										<a href="#" class="text-sm/6 text-gray-300 hover:text-white">Documentation</a>
									</li>
									<li>
										<a href="#" class="text-sm/6 text-gray-300 hover:text-white">API Reference</a>
									</li>
									<li>
										<a href="#" class="text-sm/6 text-gray-300 hover:text-white">Contact</a>
									</li>
								</ul>
							</div>
						</div>
						<div class="md:grid md:grid-cols-2 md:gap-8">
							<div>
								<h3 class="text-sm/6 font-semibold text-white">Company</h3>
								<ul role="list" class="mt-6 space-y-4">
									<li>
										<a href="#" class="text-sm/6 text-gray-300 hover:text-white">About</a>
									</li>
									<li>
										<a href="#" class="text-sm/6 text-gray-300 hover:text-white">Blog</a>
									</li>
									<li>
										<a href="#" class="text-sm/6 text-gray-300 hover:text-white">Careers</a>
									</li>
								</ul>
							</div>
							<div class="mt-10 md:mt-0">
								<h3 class="text-sm/6 font-semibold text-white">Legal</h3>
								<ul role="list" class="mt-6 space-y-4">
									<li>
										<a href="#" class="text-sm/6 text-gray-300 hover:text-white">Privacy</a>
									</li>
									<li>
										<a href="#" class="text-sm/6 text-gray-300 hover:text-white">Terms</a>
									</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
				<div class="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24">
					<div class="flex items-center justify-between">
						<p class="text-xs/5 text-gray-400">
							&copy; {new Date().getFullYear()} Val.io. All rights reserved.
						</p>
						<p class="text-xs/5 text-gray-500">
							Built with SvelteKit on Cloudflare Workers
						</p>
					</div>
				</div>
			</div>
		</footer>
	</div>

	<!-- Authentication Modal -->
	<AuthModal open={showAuthModal} onClose={closeAuthModal} />
{/if}
