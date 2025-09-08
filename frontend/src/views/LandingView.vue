<template>
  <div class="bg-gray-900">
    <!-- Header -->
    <header class="absolute inset-x-0 top-0 z-50">
      <nav class="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
        <div class="flex lg:flex-1">
          <a href="/" class="-m-1.5 p-1.5">
            <span class="sr-only">LinkShort</span>
            <div class="h-8 w-auto text-indigo-400 font-bold text-xl">
              LinkShort
            </div>
          </a>
        </div>
        <div class="hidden lg:flex lg:gap-x-12">
          <a href="#features" class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">Features</a>
          <a href="#pricing" class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">Pricing</a>
          <a href="#about" class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">About</a>
        </div>
        <div class="hidden lg:flex lg:flex-1 lg:justify-end">
          <RouterLink to="/app" class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">
            Sign in <span aria-hidden="true">&rarr;</span>
          </RouterLink>
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
          />
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
                    @click="openAuthModal"
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
          />
        </div>
      </div>

      <!-- Pricing section -->
      <div id="pricing" class="py-24 sm:pt-48">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="mx-auto max-w-4xl text-center">
            <h2 class="text-base/7 font-semibold text-indigo-400">
              Pricing
            </h2>
            <p class="mt-2 text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl">
              Choose the perfect plan for your needs
            </p>
          </div>
          <p class="mx-auto mt-6 max-w-2xl text-center text-lg/8 text-pretty text-gray-400 sm:text-xl/8">
            From small businesses to enterprise organizations, we have a plan that scales with your link shortening needs.
          </p>
          <div class="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <!-- Starter Plan -->
            <div class="flex flex-col justify-between rounded-3xl bg-gray-800/50 p-8 inset-ring inset-ring-gray-700 xl:p-10 lg:mt-8 -mr-px lg:rounded-r-none">
              <div>
                <div class="flex items-center justify-between gap-x-4">
                  <h3 class="text-lg/8 font-semibold text-white">
                    Starter
                  </h3>
                </div>
                <p class="mt-4 text-sm/6 text-gray-400">
                  Perfect for small businesses and content creators
                </p>
                <p class="mt-6 flex items-baseline gap-x-1">
                  <span class="text-4xl font-semibold tracking-tight text-white">$9</span>
                  <span class="text-sm/6 font-semibold text-gray-400">/month</span>
                </p>
                <ul role="list" class="mt-8 space-y-3 text-sm/6 text-gray-400">
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    1,000 tracked links/month
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    Basic analytics dashboard
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    Email notifications
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    Custom domains (1)
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    24/7 link monitoring
                  </li>
                </ul>
              </div>
              <a href="#" class="mt-8 block rounded-md px-3 py-2 text-center text-sm/6 font-semibold bg-white/10 text-white inset-ring inset-ring-white/5 hover:bg-white/20 focus-visible:outline-white/75 focus-visible:outline-2 focus-visible:outline-offset-2">
                Start Free Trial
              </a>
            </div>

            <!-- Professional Plan - Most Popular -->
            <div class="lg:z-10 lg:rounded-b-none flex flex-col justify-between rounded-3xl bg-gray-800/50 p-8 inset-ring inset-ring-gray-700 xl:p-10">
              <div>
                <div class="flex items-center justify-between gap-x-4">
                  <h3 class="text-lg/8 font-semibold text-indigo-400">
                    Professional
                  </h3>
                  <p class="rounded-full bg-indigo-400/10 px-2.5 py-1 text-xs/5 font-semibold text-indigo-400">
                    Most popular
                  </p>
                </div>
                <p class="mt-4 text-sm/6 text-gray-400">
                  For growing businesses that need advanced features
                </p>
                <p class="mt-6 flex items-baseline gap-x-1">
                  <span class="text-4xl font-semibold tracking-tight text-white">$29</span>
                  <span class="text-sm/6 font-semibold text-gray-400">/month</span>
                </p>
                <ul role="list" class="mt-8 space-y-3 text-sm/6 text-gray-400">
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    10,000 tracked links/month
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
                    Geo-based routing
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    Custom domains (5)
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    AI-powered monitoring
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    Backup routing
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    Slack/Teams integration
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    Priority support
                  </li>
                </ul>
              </div>
              <a href="#" class="mt-8 block rounded-md px-3 py-2 text-center text-sm/6 font-semibold bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
                Start Free Trial
              </a>
            </div>

            <!-- Enterprise Plan -->
            <div class="flex flex-col justify-between rounded-3xl bg-gray-800/50 p-8 inset-ring inset-ring-gray-700 xl:p-10 lg:mt-8 -ml-px lg:rounded-l-none">
              <div>
                <div class="flex items-center justify-between gap-x-4">
                  <h3 class="text-lg/8 font-semibold text-white">
                    Enterprise
                  </h3>
                </div>
                <p class="mt-4 text-sm/6 text-gray-400">
                  For large organizations with custom requirements
                </p>
                <p class="mt-6 flex items-baseline gap-x-1">
                  <span class="text-4xl font-semibold tracking-tight text-white">Custom</span>
                </p>
                <ul role="list" class="mt-8 space-y-3 text-sm/6 text-gray-400">
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    Unlimited tracked links
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    White-label solution
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    Advanced security features
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    Custom integrations
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
                    SLA guarantees
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    Custom reporting
                  </li>
                  <li class="flex gap-x-3">
                    <svg class="h-6 w-5 flex-none text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                    On-premise deployment
                  </li>
                </ul>
              </div>
              <a href="#" class="mt-8 block rounded-md px-3 py-2 text-center text-sm/6 font-semibold bg-white/10 text-white inset-ring inset-ring-white/5 hover:bg-white/20 focus-visible:outline-white/75 focus-visible:outline-2 focus-visible:outline-offset-2">
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA section -->
      <div class="relative -z-10 mt-32 px-6 lg:px-8">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl">
            Ready to start shortening?
          </h2>
          <p class="mx-auto mt-6 max-w-xl text-lg/8 text-pretty text-gray-300">
            Join thousands of users who trust LinkShort for their URL shortening needs. Get started today and see the difference.
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <button
              @click="openAuthModal"
              class="rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition-colors"
            >
              Get started for free
            </button>
            <a href="#features" class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="relative mx-auto mt-32 max-w-7xl px-6 lg:px-8">
      <div class="border-t border-white/10 py-16 sm:py-24">
        <div class="xl:grid xl:grid-cols-3 xl:gap-8">
          <div class="space-y-4">
            <div class="text-indigo-400 font-bold text-xl">LinkShort</div>
            <p class="text-sm text-gray-400 max-w-xs">
              Making the web more accessible, one short link at a time.
            </p>
          </div>
          <div class="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div>
              <h3 class="text-sm/6 font-semibold text-white">Product</h3>
              <ul role="list" class="mt-6 space-y-4">
                <li><a href="#" class="text-sm/6 text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#" class="text-sm/6 text-gray-400 hover:text-white transition-colors">Analytics</a></li>
                <li><a href="#" class="text-sm/6 text-gray-400 hover:text-white transition-colors">API</a></li>
                <li><a href="#" class="text-sm/6 text-gray-400 hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 class="text-sm/6 font-semibold text-white">Support</h3>
              <ul role="list" class="mt-6 space-y-4">
                <li><a href="#" class="text-sm/6 text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" class="text-sm/6 text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" class="text-sm/6 text-gray-400 hover:text-white transition-colors">Status</a></li>
                <li><a href="#" class="text-sm/6 text-gray-400 hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="mt-16 border-t border-white/10 pt-8">
          <p class="text-xs/5 text-gray-400 text-center">
            &copy; 2024 LinkShort. All rights reserved.
          </p>
        </div>
      </div>
    </footer>

    <!-- Authentication Modal -->
    <AuthModal 
      :open="showAuthModal" 
      @close="closeAuthModal"
      @switch-to-signup="handleSwitchToSignup"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AuthModal from '../components/AuthModal.vue'

const showAuthModal = ref(false)

const openAuthModal = () => {
  showAuthModal.value = true
}

const closeAuthModal = () => {
  showAuthModal.value = false
}

const handleSwitchToSignup = () => {
  // For now, just close the modal. Later this would switch to a signup modal
  console.log('Switch to signup')
  closeAuthModal()
}
</script>