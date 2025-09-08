<template>
  <div class="grid min-h-full grid-cols-1 grid-rows-[1fr_auto_1fr] bg-gray-900 lg:grid-cols-[max(50%,36rem)_1fr]">
    <header class="mx-auto w-full max-w-7xl px-6 pt-6 sm:pt-10 lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:px-8">
      <RouterLink to="/">
        <span class="sr-only">LinkShort</span>
        <div class="h-10 w-auto text-indigo-400 font-bold text-2xl sm:h-12 sm:text-3xl">
          LinkShort
        </div>
      </RouterLink>
    </header>
    <main class="mx-auto w-full max-w-7xl px-6 py-24 sm:py-32 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:px-8">
      <div class="max-w-lg">
        <p class="text-base/8 font-semibold text-indigo-400">404</p>
        <h1 class="mt-4 text-5xl font-semibold tracking-tight text-pretty text-white sm:text-6xl">
          Page not found
        </h1>
        <p class="mt-6 text-lg font-medium text-pretty text-gray-400 sm:text-xl/8">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <div class="mt-10">
          <RouterLink to="/" class="text-sm/7 font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            <span aria-hidden="true">&larr;</span> Back to home
          </RouterLink>
        </div>
      </div>
    </main>
    <footer class="self-end lg:col-span-2 lg:col-start-1 lg:row-start-3">
      <div class="border-t border-white/10 bg-gray-800/50 py-10">
        <nav class="mx-auto flex w-full max-w-7xl items-center gap-x-4 px-6 text-sm/7 text-gray-400 lg:px-8">
          <a href="#" class="hover:text-white transition-colors">Contact support</a>
          <svg viewBox="0 0 2 2" aria-hidden="true" class="size-0.5 fill-gray-600">
            <circle cx="1" cy="1" r="1" />
          </svg>
          <a href="#" class="hover:text-white transition-colors">Status</a>
          <svg viewBox="0 0 2 2" aria-hidden="true" class="size-0.5 fill-gray-600">
            <circle cx="1" cy="1" r="1" />
          </svg>
          <RouterLink to="/app" class="hover:text-white transition-colors">Dashboard</RouterLink>
        </nav>
      </div>
    </footer>
    <div class="hidden lg:relative lg:col-start-2 lg:row-start-1 lg:row-end-4 lg:block">
      <img
        src="https://images.unsplash.com/photo-1583585635793-0e1894c169bd?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1825&q=80"
        alt=""
        class="absolute inset-0 size-full object-cover"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>