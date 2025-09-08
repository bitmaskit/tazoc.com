<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '../stores/auth'

const name = ref('Unknown')
const { currentUser, isAuthenticated, checkAuthParams, logout } = useAuth()

const getName = async () => {
  const res = await fetch('/api/')
  const data = await res.json()
  name.value = data.name
}

const handleLogout = async () => {
  try {
    await logout()
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

// Simple mount without auth
onMounted(() => {
  console.log('Dashboard mounted - no auth required')
})
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-white mb-6">Dashboard</h1>
      
      <!-- API Test Section -->
      <div class="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6 ring-1 ring-white/10">
        <h2 class="text-lg font-semibold text-white mb-4">API Connection Test</h2>
        <button 
          @click="getName" 
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Get Name from API
        </button>
        <p class="mt-2 text-sm text-gray-300">
          Name from API: <span class="font-medium text-white">{{ name }}</span>
        </p>
        <p class="mt-1 text-xs text-gray-400">
          Edit <code class="bg-gray-800 px-1 py-0.5 rounded text-gray-200">server/index.ts</code> to change what the API returns
        </p>
      </div>
      
      <!-- Authentication Status -->
      <div class="bg-white/5 backdrop-blur-sm rounded-lg p-6 ring-1 ring-white/10">
        <h2 class="text-lg font-semibold text-white mb-4">Authentication Status</h2>
        <div v-if="isAuthenticated" class="space-y-3">
          <div class="flex items-center space-x-3">
            <img 
              :src="currentUser?.avatar_url" 
              :alt="currentUser?.name"
              class="w-10 h-10 rounded-full ring-2 ring-indigo-500"
            />
            <div>
              <p class="text-white font-medium">{{ currentUser?.name || currentUser?.login }}</p>
              <p class="text-gray-400 text-sm">{{ currentUser?.email }}</p>
            </div>
          </div>
          <button 
            @click="handleLogout"
            class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-300 bg-red-900/20 hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Sign out
          </button>
        </div>
        <div v-else class="text-gray-400">
          <p>Not authenticated. Please sign in to access your dashboard.</p>
        </div>
      </div>

      <!-- Welcome Section -->
      <div class="bg-white/5 backdrop-blur-sm rounded-lg p-6 ring-1 ring-white/10 mt-6">
        <h2 class="text-lg font-semibold text-white mb-2">Welcome to your Dashboard</h2>
        <p class="text-gray-300">
          This is a modern Vue 3 application with TailwindUI dark theme layout. 
          The sidebar navigation is fully responsive and includes team management features.
        </p>
      </div>
    </div>
  </div>
</template>
