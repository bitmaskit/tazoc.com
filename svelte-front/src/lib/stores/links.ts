import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface Link {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  createdBy: string;
  clicks: number;
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
    loadLinks: async () => {
      if (!browser) return;
      
      try {
        update(state => ({ ...state, isLoading: true }));
        
        const response = await fetch('/api/links', {
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
          const links = data.links || [];
          update(state => ({
            ...state,
            links,
            filteredLinks: links,
            isLoading: false
          }));
        } else {
          throw new Error(data.error?.message || 'Failed to load links');
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
    shortenUrl: async (url: string) => {
      if (!browser) return null;
      
      try {
        const response = await fetch('/api/shorten', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Add new link to the beginning of the list
          update(state => {
            const newLinks = [data, ...state.links];
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
          
          return data;
        } else {
          throw new Error(data.error?.message || 'Failed to shorten URL');
        }
      } catch (error) {
        console.error('Failed to shorten URL:', error);
        throw error;
      }
    },

    // Delete link
    deleteLink: async (shortCode: string) => {
      if (!browser) return;
      
      try {
        const response = await fetch(`/api/links/${shortCode}`, {
          method: 'DELETE',
          credentials: 'include'
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
          const data = await response.json();
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