<template>
  <div class="bg-white/5 backdrop-blur-sm rounded-lg p-6 ring-1 ring-white/10">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-white">Your Links</h2>
      <button
        @click="refreshLinks"
        :disabled="isLoading"
        class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-300 bg-indigo-900/20 hover:bg-indigo-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg v-else class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        Refresh
      </button>
    </div>

    <!-- Search and Filter Controls -->
    <div class="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:space-x-4">
      <div class="flex-1">
        <label for="search" class="sr-only">Search links</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
            </svg>
          </div>
          <input
            id="search"
            v-model="searchQuery"
            type="text"
            placeholder="Search by URL or short code..."
            class="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>
      <div class="flex space-x-2">
        <select
          v-model="sortBy"
          class="block w-full pl-3 pr-10 py-2 text-base border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="createdAt">Sort by Date</option>
          <option value="clicks">Sort by Clicks</option>
          <option value="originalUrl">Sort by URL</option>
        </select>
        <button
          @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
          class="inline-flex items-center px-3 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <svg v-if="sortOrder === 'asc'" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
          </svg>
          <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m5.25-4.5L17.25 15M17.25 15L21 11.25M17.25 15V3" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mb-4 p-4 bg-red-900/20 border border-red-500/20 rounded-md">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-400">Error</h3>
          <p class="mt-1 text-sm text-red-300">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && links.length === 0" class="text-center py-12">
      <svg class="animate-spin mx-auto h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="mt-2 text-sm text-gray-400">Loading your links...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredLinks.length === 0 && !isLoading" class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-300">
        {{ searchQuery ? 'No links found' : 'No links yet' }}
      </h3>
      <p class="mt-1 text-sm text-gray-400">
        {{ searchQuery ? 'Try adjusting your search terms.' : 'Start by shortening your first URL above.' }}
      </p>
    </div>

    <!-- Links List -->
    <div v-else class="space-y-4">
      <div
        v-for="link in paginatedLinks"
        :key="link.shortCode"
        class="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <!-- Short URL -->
            <div class="flex items-center space-x-2 mb-2">
              <code class="text-sm font-mono text-indigo-400 bg-indigo-900/20 px-2 py-1 rounded">
                {{ link.shortUrl }}
              </code>
              <button
                @click="copyToClipboard(link.shortUrl)"
                class="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-400 hover:text-white transition-colors"
              >
                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.375a2.25 2.25 0 01-2.25-2.25V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
              </button>
            </div>
            
            <!-- Original URL -->
            <p class="text-sm text-gray-300 truncate mb-2" :title="link.originalUrl">
              {{ link.originalUrl }}
            </p>
            
            <!-- Stats and Meta -->
            <div class="flex items-center space-x-4 text-xs text-gray-400">
              <span class="flex items-center">
                <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                </svg>
                {{ link.clicks || 0 }} clicks
              </span>
              <span class="flex items-center">
                <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
                </svg>
                {{ formatDate(link.createdAt) }}
              </span>
              <span v-if="link.expiresAt" class="flex items-center text-yellow-400">
                <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Expires {{ formatDate(link.expiresAt) }}
              </span>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex items-center space-x-2 ml-4">
            <button
              @click="viewAnalytics(link)"
              class="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 transition-colors"
            >
              <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              Analytics
            </button>
            <button
              @click="deleteLink(link)"
              :disabled="deletingLinks.has(link.shortCode)"
              class="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-red-300 bg-red-900/20 hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg v-if="deletingLinks.has(link.shortCode)" class="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-6 flex items-center justify-between">
      <div class="text-sm text-gray-400">
        Showing {{ ((currentPage - 1) * pageSize) + 1 }} to {{ Math.min(currentPage * pageSize, filteredLinks.length) }} of {{ filteredLinks.length }} links
      </div>
      <div class="flex items-center space-x-2">
        <button
          @click="currentPage = Math.max(1, currentPage - 1)"
          :disabled="currentPage === 1"
          class="inline-flex items-center px-3 py-1.5 border border-gray-600 rounded-md text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span class="text-sm text-gray-400">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="inline-flex items-center px-3 py-1.5 border border-gray-600 rounded-md text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

interface Link {
  shortCode: string
  shortUrl: string
  originalUrl: string
  clicks?: number
  createdAt: string
  expiresAt?: string
}

const links = ref<Link[]>([])
const isLoading = ref(false)
const error = ref('')
const searchQuery = ref('')
const sortBy = ref<'createdAt' | 'clicks' | 'originalUrl'>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const currentPage = ref(1)
const pageSize = ref(10)
const deletingLinks = ref(new Set<string>())

// Computed properties
const filteredLinks = computed(() => {
  let filtered = links.value

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(link =>
      link.originalUrl.toLowerCase().includes(query) ||
      link.shortCode.toLowerCase().includes(query) ||
      link.shortUrl.toLowerCase().includes(query)
    )
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let aVal: any, bVal: any
    
    switch (sortBy.value) {
      case 'clicks':
        aVal = a.clicks || 0
        bVal = b.clicks || 0
        break
      case 'originalUrl':
        aVal = a.originalUrl.toLowerCase()
        bVal = b.originalUrl.toLowerCase()
        break
      case 'createdAt':
      default:
        aVal = new Date(a.createdAt).getTime()
        bVal = new Date(b.createdAt).getTime()
        break
    }

    if (sortOrder.value === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    }
  })

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredLinks.value.length / pageSize.value))

const paginatedLinks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredLinks.value.slice(start, end)
})

// Watch for search changes to reset pagination
watch([searchQuery, sortBy, sortOrder], () => {
  currentPage.value = 1
})

// Methods
const fetchLinks = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const response = await fetch('/api/links', {
      credentials: 'include'
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    links.value = data.links || []
    
  } catch (err) {
    console.error('Failed to fetch links:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load links'
  } finally {
    isLoading.value = false
  }
}

const refreshLinks = () => {
  fetchLinks()
}

const deleteLink = async (link: Link) => {
  if (!confirm(`Are you sure you want to delete the link ${link.shortUrl}?`)) {
    return
  }
  
  deletingLinks.value.add(link.shortCode)
  
  try {
    const response = await fetch(`/api/links/${link.shortCode}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    // Remove from local list
    links.value = links.value.filter(l => l.shortCode !== link.shortCode)
    
  } catch (err) {
    console.error('Failed to delete link:', err)
    error.value = err instanceof Error ? err.message : 'Failed to delete link'
  } finally {
    deletingLinks.value.delete(link.shortCode)
  }
}

const viewAnalytics = (link: Link) => {
  // TODO: Implement analytics modal or navigation
  console.log('View analytics for:', link.shortCode)
  alert(`Analytics for ${link.shortUrl} - ${link.clicks || 0} clicks\n\nDetailed analytics coming soon!`)
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    // TODO: Show toast notification
    console.log('Copied to clipboard:', text)
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Lifecycle
onMounted(() => {
  fetchLinks()
})
</script>