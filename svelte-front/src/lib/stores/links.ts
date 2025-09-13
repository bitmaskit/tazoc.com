import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface Link {
  id?: number;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  clicks: number; // Frontend uses 'clicks', will transform from API's 'clickCount'
}

// API Link interface (what the shortener worker returns)
interface ApiLink {
  id?: number;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  clickCount: number; // API returns 'clickCount'
}

// API Response interfaces matching shortener worker responses
interface ApiLinksResponse {
  links: ApiLink[];
  total?: number;
  limit?: number;
  offset?: number;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

interface ApiShortenResponse extends ApiLink {
  // Inherits all ApiLink properties
}

// Helper function to transform API link to frontend link
function transformApiLink(apiLink: ApiLink): Link {
  return {
    ...apiLink,
    clicks: apiLink.clickCount // Transform clickCount to clicks
  };
}

interface LinksState {
  links: Link[];
  filteredLinks: Link[];
  isLoading: boolean;
  searchQuery: string;
}

const createLinksStore = () => {
  const { subscribe, set, update } = writable<LinksState>({
    links: [],
    filteredLinks: [],
    isLoading: false,
    searchQuery: ''
  });

  return {
    subscribe,

    // Load user's links
    loadLinks: async (userId?: string) => {
      if (!browser || !userId) return;
      
      try {
        update(state => ({ ...state, isLoading: true }));
        
        const response = await fetch('/api/links', {
          credentials: 'include',
          headers: {
            'X-User-ID': userId
          }
        });
        
        const data = await response.json() as ApiLinksResponse | ErrorResponse;
        
        if (response.ok) {
          const apiResponse = data as ApiLinksResponse;
          const links = (apiResponse.links || []).map(transformApiLink);
          update(state => ({
            ...state,
            links,
            filteredLinks: links,
            isLoading: false
          }));
        } else {
          const errorResponse = data as ErrorResponse;
          throw new Error(errorResponse.error?.message || 'Failed to load links');
        }
      } catch (error) {
        console.error('Failed to load links:', error);
        update(state => ({
          ...state,
          links: [],
          filteredLinks: [],
          isLoading: false
        }));
      }
    },

    // Shorten URL
    shortenUrl: async (url: string, userId?: string) => {
      if (!browser || !userId) return null;
      
      try {
        const response = await fetch('/api/shorten', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': userId
          },
          credentials: 'include',
          body: JSON.stringify({ url })
        });
        
        const data = await response.json() as ApiShortenResponse | ErrorResponse;
        
        if (response.ok) {
          const apiResponse = data as ApiShortenResponse;
          const newLink = transformApiLink(apiResponse);
          
          // Add new link to the beginning of the list
          update(state => {
            const newLinks = [newLink, ...state.links];
            return {
              ...state,
              links: newLinks,
              filteredLinks: state.searchQuery ? 
                newLinks.filter(link => 
                  link.originalUrl.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                  link.shortCode.toLowerCase().includes(state.searchQuery.toLowerCase())
                ) : newLinks
            };
          });
          
          return newLink;
        } else {
          const errorResponse = data as ErrorResponse;
          throw new Error(errorResponse.error?.message || 'Failed to shorten URL');
        }
      } catch (error) {
        console.error('Failed to shorten URL:', error);
        throw error;
      }
    },

    // Delete link
    deleteLink: async (shortCode: string, userId?: string) => {
      if (!browser || !userId) return;
      
      try {
        const response = await fetch(`/api/links/${shortCode}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'X-User-ID': userId
          }
        });
        
        if (response.ok) {
          // Remove link from both arrays
          update(state => {
            const newLinks = state.links.filter(link => link.shortCode !== shortCode);
            return {
              ...state,
              links: newLinks,
              filteredLinks: newLinks.filter(link => 
                state.searchQuery ? 
                  link.originalUrl.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                  link.shortCode.toLowerCase().includes(state.searchQuery.toLowerCase())
                : true
              )
            };
          });
        } else {
          const data = await response.json() as ErrorResponse;
          throw new Error(data.error?.message || 'Failed to delete link');
        }
      } catch (error) {
        console.error('Failed to delete link:', error);
        throw error;
      }
    },

    // Search links
    searchLinks: (query: string) => {
      update(state => {
        const filteredLinks = query ? 
          state.links.filter(link =>
            link.originalUrl.toLowerCase().includes(query.toLowerCase()) ||
            link.shortCode.toLowerCase().includes(query.toLowerCase()) ||
            (link.shortUrl && link.shortUrl.toLowerCase().includes(query.toLowerCase()))
          ) : state.links;
        
        return {
          ...state,
          searchQuery: query,
          filteredLinks
        };
      });
    },

    // Clear all data
    clear: () => {
      set({
        links: [],
        filteredLinks: [],
        isLoading: false,
        searchQuery: ''
      });
    }
  };
};

export const links = createLinksStore();