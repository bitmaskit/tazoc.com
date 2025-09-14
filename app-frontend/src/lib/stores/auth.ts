import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface User {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  email?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface MeResponse {
  authenticated: boolean;
  user?: User;
}

const createAuthStore = () => {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  return {
    subscribe,
    
    // Check authentication status
    checkAuth: async () => {
      if (!browser) return;
      
      try {
        update(state => ({ ...state, isLoading: true }));
        
        const response = await fetch('/api/me', {
          credentials: 'include'
        });
        
        const data = await response.json() as MeResponse;
        
        if (data.authenticated && data.user) {
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false
          });
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    },

    // Login with GitHub
    login: () => {
      if (!browser) return;
      const currentUrl = window.location.href;
      window.location.href = `https://val.io/api/login?redirect=${encodeURIComponent(currentUrl)}`;
    },

    // Logout
    logout: async () => {
      if (!browser) return;
      
      try {
        await fetch('/api/logout', {
          method: 'POST',
          credentials: 'include'
        });
        
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      } catch (error) {
        console.error('Logout failed:', error);
      }
    },

    // Set loading state
    setLoading: (loading: boolean) => {
      update(state => ({ ...state, isLoading: loading }));
    }
  };
};

export const auth = createAuthStore();