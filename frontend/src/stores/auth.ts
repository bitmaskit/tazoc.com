import { ref, computed } from 'vue'

export interface User {
  id: number
  login: string
  name: string
  email: string
  avatar_url: string
}

// Global authentication state
const currentUser = ref<User | null>(null)
const isAuthenticated = computed(() => currentUser.value !== null)
const isLoading = ref(false)

// Authentication functions
export const useAuth = () => {
  const login = async (credentials: { email: string; password: string }) => {
    isLoading.value = true
    try {
      // TODO: Implement email/password login
      console.log('Login with email/password:', credentials)
      throw new Error('Email/password login not implemented yet')
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    isLoading.value = true
    try {
      // Clear mock user data
      localStorage.removeItem('mockUser')
      
      // Clear session cookie
      document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      
      await fetch('/api/auth/logout', { method: 'POST' })
      currentUser.value = null
      // Redirect to landing page
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      isLoading.value = false
    }
  }

  const fetchCurrentUser = async () => {
    isLoading.value = true
    try {
      // First check for mock user in localStorage (for development)
      const mockUserData = localStorage.getItem('mockUser')
      if (mockUserData) {
        try {
          const mockUser = JSON.parse(mockUserData)
          currentUser.value = mockUser
          console.log("Mock user loaded from localStorage:", mockUser.login);
          isLoading.value = false
          return
        } catch (e) {
          console.warn('Failed to parse mock user data:', e)
          localStorage.removeItem('mockUser')
        }
      }
      
      console.log("Fetching current user from /api/auth/user");
      const response = await fetch('/api/auth/user', {
        credentials: 'include' // Include cookies in the request
      })
      const data = await response.json()
      
      console.log("Auth response:", {
        status: response.status,
        authenticated: data.authenticated,
        user: data.user ? `✓ ${data.user.login}` : "✗ None"
      });
      
      if (data.authenticated && data.user) {
        currentUser.value = data.user
        console.log("User authenticated and set:", data.user.login);
      } else {
        currentUser.value = null
        console.log("User not authenticated or no user data");
      }
    } catch (error) {
      console.error('Fetch user error:', error)
      currentUser.value = null
    } finally {
      isLoading.value = false
    }
  }

  const setUser = (user: User | null) => {
    currentUser.value = user
  }

  // Check for authentication state from backend (replaces URL param checking)
  const checkAuthParams = async () => {
    console.log("=== Frontend Auth Check ===");
    
    // Clean up URL params if present (legacy)
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('auth') === 'success' || urlParams.get('user')) {
      console.log("Legacy URL params detected, cleaning up...");
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
    }
    
    // Fetch current user from backend
    await fetchCurrentUser()
  }

  return {
    currentUser: computed(() => currentUser.value),
    isAuthenticated,
    isLoading: computed(() => isLoading.value),
    login,
    logout,
    fetchCurrentUser,
    setUser,
    checkAuthParams,
  }
}