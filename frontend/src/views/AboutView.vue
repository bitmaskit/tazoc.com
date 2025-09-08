<template>
  <div>
    <h1 class="text-2xl font-bold text-white mb-6">About</h1>
    
    <div class="bg-white/5 backdrop-blur-sm rounded-lg p-6 ring-1 ring-white/10">
      <h2 class="text-lg font-semibold text-white mb-4">Project Overview</h2>
      <p class="text-gray-300 mb-4">
        This is a modern web application built with cutting-edge technologies:
      </p>
      
      <ul class="space-y-2 text-gray-300">
        <li class="flex items-center">
          <div class="w-2 h-2 bg-indigo-400 rounded-full mr-3"></div>
          <span><strong class="text-white">Vue 3</strong> with Composition API</span>
        </li>
        <li class="flex items-center">
          <div class="w-2 h-2 bg-indigo-400 rounded-full mr-3"></div>
          <span><strong class="text-white">TypeScript</strong> for type safety</span>
        </li>
        <li class="flex items-center">
          <div class="w-2 h-2 bg-indigo-400 rounded-full mr-3"></div>
          <span><strong class="text-white">TailwindCSS</strong> with dark theme</span>
        </li>
        <li class="flex items-center">
          <div class="w-2 h-2 bg-indigo-400 rounded-full mr-3"></div>
          <span><strong class="text-white">HeadlessUI</strong> for accessible components</span>
        </li>
        <li class="flex items-center">
          <div class="w-2 h-2 bg-indigo-400 rounded-full mr-3"></div>
          <span><strong class="text-white">Cloudflare Workers</strong> for deployment</span>
        </li>
      </ul>
      
      <div class="mt-6 pt-6 border-t border-white/10">
        <p class="text-sm text-gray-400">
          The layout is based on TailwindUI components with a responsive sidebar navigation
          that adapts beautifully to both desktop and mobile viewports.
        </p>
      </div>
    </div>
  </div>
</template>
