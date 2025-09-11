<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Navigation -->
    <nav class="border-b border-gray-800">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 justify-between">
          <div class="flex items-center">
            <NuxtLink to="/" class="flex items-center">
              <div class="h-8 w-auto text-indigo-400 font-bold text-xl">
                LinkShort
              </div>
            </NuxtLink>
          </div>
          
          <div class="flex items-center space-x-4">
            <button
              @click="showCreateModal = true"
              class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Create Short Link
            </button>
            
            <div class="relative">
              <button
                @click="showUserMenu = !showUserMenu"
                class="flex items-center rounded-full bg-gray-800 text-sm text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <img
                  class="h-8 w-8 rounded-full"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt=""
                />
              </button>
              
              <!-- Dropdown menu -->
              <div
                v-if="showUserMenu"
                class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
              >
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Your Profile</a>
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</a>
                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Sign out</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Dashboard Content -->
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <!-- Stats -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div class="bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-400 truncate">Total Links</dt>
                  <dd class="text-lg font-medium text-white">{{ stats.totalLinks }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-400 truncate">Total Clicks</dt>
                  <dd class="text-lg font-medium text-white">{{ stats.totalClicks }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-400 truncate">Avg CTR</dt>
                  <dd class="text-lg font-medium text-white">{{ stats.avgCTR }}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-400 truncate">This Month</dt>
                  <dd class="text-lg font-medium text-white">{{ stats.monthlyClicks }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Links Table -->
      <div class="bg-gray-800 shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium leading-6 text-white mb-4">Your Short Links</h3>
          
          <div class="overflow-hidden">
            <table class="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Short Link
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Original URL
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Clicks
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                <tr v-for="link in links" :key="link.id" class="hover:bg-gray-700">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <a
                        :href="link.shortUrl"
                        target="_blank"
                        class="text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        {{ link.shortCode }}
                      </a>
                      <button
                        @click="copyLink(link.shortUrl)"
                        class="ml-2 text-gray-400 hover:text-white"
                      >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm text-gray-300 truncate max-w-xs">
                      {{ link.originalUrl }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {{ link.clicks }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {{ formatDate(link.createdAt) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      @click="viewAnalytics(link)"
                      class="text-indigo-400 hover:text-indigo-300 mr-4"
                    >
                      Analytics
                    </button>
                    <button
                      @click="deleteLink(link.id)"
                      class="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div v-if="links.length === 0" class="text-center py-8">
              <p class="text-gray-400">No short links created yet.</p>
              <button
                @click="showCreateModal = true"
                class="mt-4 text-indigo-400 hover:text-indigo-300"
              >
                Create your first link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Link Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showCreateModal = false"></div>
        
        <div class="inline-block transform overflow-hidden rounded-lg bg-gray-800 px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
          <div>
            <h3 class="text-lg font-medium leading-6 text-white">Create Short Link</h3>
            <div class="mt-4">
              <label for="original-url" class="block text-sm font-medium text-gray-300">
                Original URL
              </label>
              <input
                id="original-url"
                v-model="newLink.originalUrl"
                type="url"
                placeholder="https://example.com/very-long-url"
                class="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            
            <div class="mt-4">
              <label for="custom-code" class="block text-sm font-medium text-gray-300">
                Custom Code (Optional)
              </label>
              <input
                id="custom-code"
                v-model="newLink.customCode"
                type="text"
                placeholder="my-custom-link"
                class="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button
              @click="createLink"
              :disabled="!newLink.originalUrl"
              class="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-2 sm:text-sm"
            >
              Create
            </button>
            <button
              @click="showCreateModal = false"
              class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-base font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Mock data
const stats = ref({
  totalLinks: 12,
  totalClicks: 1247,
  avgCTR: 8.5,
  monthlyClicks: 342
})

const links = ref([
  {
    id: 1,
    shortCode: 'abc123',
    shortUrl: 'https://tazoc.com/abc123',
    originalUrl: 'https://example.com/very-long-url-that-needs-shortening',
    clicks: 156,
    createdAt: new Date('2024-01-15')
  },
  {
    id: 2,
    shortCode: 'xyz789',
    shortUrl: 'https://tazoc.com/xyz789',
    originalUrl: 'https://github.com/user/repository/issues/123',
    clicks: 89,
    createdAt: new Date('2024-01-10')
  },
  {
    id: 3,
    shortCode: 'demo',
    shortUrl: 'https://tazoc.com/demo',
    originalUrl: 'https://docs.example.com/getting-started/installation',
    clicks: 234,
    createdAt: new Date('2024-01-08')
  }
])

const showCreateModal = ref(false)
const showUserMenu = ref(false)
const newLink = ref({
  originalUrl: '',
  customCode: ''
})

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const copyLink = async (url) => {
  try {
    await navigator.clipboard.writeText(url)
    // You could add a toast notification here
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}

const createLink = async () => {
  if (!newLink.value.originalUrl) return
  
  try {
    // Mock API call - replace with actual API endpoint
    const response = await $fetch('/api/shorten', {
      method: 'POST',
      body: newLink.value
    })
    
    // Add to links list
    links.value.unshift({
      id: Date.now(),
      shortCode: response.shortCode || Math.random().toString(36).substr(2, 8),
      shortUrl: response.shortUrl || `https://tazoc.com/${Math.random().toString(36).substr(2, 8)}`,
      originalUrl: newLink.value.originalUrl,
      clicks: 0,
      createdAt: new Date()
    })
    
    // Reset form and close modal
    newLink.value = { originalUrl: '', customCode: '' }
    showCreateModal.value = false
    
    // Update stats
    stats.value.totalLinks++
    
  } catch (error) {
    console.error('Failed to create link:', error)
  }
}

const deleteLink = async (linkId) => {
  if (confirm('Are you sure you want to delete this link?')) {
    try {
      // Mock API call
      await $fetch(`/api/links/${linkId}`, { method: 'DELETE' })
      
      // Remove from list
      const index = links.value.findIndex(link => link.id === linkId)
      if (index > -1) {
        links.value.splice(index, 1)
        stats.value.totalLinks--
      }
    } catch (error) {
      console.error('Failed to delete link:', error)
    }
  }
}

const viewAnalytics = (link) => {
  // Navigate to analytics page or show analytics modal
  console.log('View analytics for:', link.shortCode)
}

// Close dropdown when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) {
      showUserMenu.value = false
    }
  })
})
</script>