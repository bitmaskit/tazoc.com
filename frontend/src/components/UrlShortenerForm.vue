<template>
  <div class="bg-white/5 backdrop-blur-sm rounded-lg p-6 ring-1 ring-white/10">
    <h2 class="text-lg font-semibold text-white mb-4">Shorten URL</h2>
    
    <!-- URL Input Form -->
    <form @submit.prevent="shortenUrl" class="space-y-4">
      <div>
        <label for="url" class="block text-sm font-medium text-gray-300 mb-2">
          Enter URL to shorten
        </label>
        <div class="relative">
          <input
            id="url"
            v-model="urlInput"
            type="url"
            placeholder="https://example.com/very/long/url"
            :disabled="isLoading"
            class="w-full rounded-md border-0 px-4 py-3 bg-white/10 text-white shadow-sm ring-1 ring-inset ring-white/20 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-400 disabled:bg-white/5 disabled:text-gray-400 disabled:cursor-not-allowed sm:text-sm/6"
            :class="{
              'ring-red-500 focus:ring-red-500': validationError,
              'ring-white/20 focus:ring-indigo-400': !validationError
            }"
          />
          <div v-if="isLoading" class="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
        <p v-if="validationError" class="mt-2 text-sm text-red-400">
          {{ validationError }}
        </p>
      </div>
      
      <button
        type="submit"
        :disabled="isLoading || !urlInput.trim()"
        class="w-full rounded-md bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        <span v-if="isLoading">Shortening...</span>
        <span v-else>Shorten URL</span>
      </button>
    </form>

    <!-- Error Display -->
    <div v-if="error" class="mt-4 p-4 bg-red-900/20 border border-red-500/20 rounded-md">
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

    <!-- Success Result -->
    <div v-if="shortenedUrl" class="mt-6 p-4 bg-green-900/20 border border-green-500/20 rounded-md">
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
              <code class="flex-1 text-sm text-white font-mono break-all">{{ shortenedUrl.shortUrl }}</code>
              <button
                @click="copyToClipboard"
                :class="[
                  'flex-shrink-0 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded transition-colors',
                  copied 
                    ? 'text-green-300 bg-green-900/20 hover:bg-green-900/30' 
                    : 'text-indigo-300 bg-indigo-900/20 hover:bg-indigo-900/30'
                ]"
              >
                <svg v-if="copied" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <svg v-else class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.375a2.25 2.25 0 01-2.25-2.25V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                {{ copied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
            <p class="text-xs text-gray-400 mt-2">
              Original: {{ shortenedUrl.originalUrl }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface ShortenedUrlResult {
  shortCode: string
  shortUrl: string
  originalUrl: string
}

const urlInput = ref('')
const isLoading = ref(false)
const error = ref('')
const validationError = ref('')
const shortenedUrl = ref<ShortenedUrlResult | null>(null)
const copied = ref(false)

const validateUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

const shortenUrl = async () => {
  // Reset states
  error.value = ''
  validationError.value = ''
  shortenedUrl.value = null
  
  // Validate URL format
  if (!urlInput.value.trim()) {
    validationError.value = 'Please enter a URL'
    return
  }
  
  if (!validateUrl(urlInput.value.trim())) {
    validationError.value = 'Please enter a valid URL (must start with http:// or https://)'
    return
  }
  
  isLoading.value = true
  
  try {
    const response = await fetch('/api/shorten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({
        url: urlInput.value.trim()
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    shortenedUrl.value = data
    urlInput.value = '' // Clear input on success
    
  } catch (err) {
    console.error('URL shortening error:', err)
    error.value = err instanceof Error ? err.message : 'Failed to shorten URL. Please try again.'
  } finally {
    isLoading.value = false
  }
}

const copyToClipboard = async () => {
  if (!shortenedUrl.value) return
  
  try {
    await navigator.clipboard.writeText(shortenedUrl.value.shortUrl)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = shortenedUrl.value.shortUrl
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}
</script>