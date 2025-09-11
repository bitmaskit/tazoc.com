<template>
  <div class="bg-gray-900">
    <!-- Header -->
    <header class="absolute inset-x-0 top-0 z-50">
      <nav class="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
        <div class="flex lg:flex-1">
          <NuxtLink to="/" class="-m-1.5 p-1.5">
            <span class="sr-only">LinkShort</span>
            <div class="h-8 w-auto text-indigo-400 font-bold text-xl">
              LinkShort
            </div>
          </NuxtLink>
        </div>
        <div class="hidden lg:flex lg:gap-x-12">
          <a href="#features" class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">Features</a>
          <a href="#pricing" class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">Pricing</a>
          <a href="#about" class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">About</a>
        </div>
        <div class="hidden lg:flex lg:flex-1 lg:justify-end">
          <NuxtLink to="/dashboard" class="text-sm/6 font-semibold text-white hover:text-indigo-400 transition-colors">
            Dashboard <span aria-hidden="true">&rarr;</span>
          </NuxtLink>
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
            class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
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
                      v-model="urlInput"
                      type="url"
                      placeholder="https://your-long-url.com/very/long/path"
                      class="w-full rounded-md border-0 px-4 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6"
                    />
                  </div>
                  <button
                    type="submit"
                    @click="shortenUrl"
                    class="rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition-colors whitespace-nowrap"
                  >
                    Shorten URL
                  </button>
                </form>
                <p class="mt-3 text-sm text-gray-500">
                  No sign-up required • Free forever • Unlimited short links
                </p>
                
                <!-- Result -->
                <div v-if="shortenedUrl" class="mt-6 p-4 bg-gray-800 rounded-lg">
                  <p class="text-sm text-gray-300 mb-2">Your shortened URL:</p>
                  <div class="flex items-center gap-2">
                    <input
                      :value="shortenedUrl"
                      readonly
                      class="flex-1 px-3 py-2 text-sm bg-gray-700 text-white rounded border border-gray-600"
                    />
                    <button
                      @click="copyToClipboard"
                      class="px-4 py-2 text-sm bg-indigo-500 hover:bg-indigo-400 text-white rounded transition-colors"
                    >
                      Copy
                    </button>
                  </div>
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
  </div>
</template>

<script setup>
const urlInput = ref('')
const shortenedUrl = ref('')

const shortenUrl = async (e) => {
  e.preventDefault()
  if (!urlInput.value) return
  
  try {
    // Mock API call - replace with actual API endpoint
    const response = await $fetch('/api/shorten', {
      method: 'POST',
      body: { url: urlInput.value }
    })
    
    shortenedUrl.value = response.shortUrl
  } catch (error) {
    // For demo purposes, create a mock shortened URL
    shortenedUrl.value = `https://tazoc.com/${Math.random().toString(36).substr(2, 8)}`
  }
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(shortenedUrl.value)
    // You could add a toast notification here
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}
</script>