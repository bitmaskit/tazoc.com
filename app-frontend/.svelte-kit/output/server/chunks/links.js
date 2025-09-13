import { w as writable } from "./index.js";
const createLinksStore = () => {
  const { subscribe, set, update } = writable({
    links: [],
    filteredLinks: [],
    isLoading: false,
    searchQuery: ""
  });
  return {
    subscribe,
    // Load user's links
    loadLinks: async (userId) => {
      return;
    },
    // Shorten URL
    shortenUrl: async (url, userId) => {
      return null;
    },
    // Delete link
    deleteLink: async (shortCode, userId) => {
      return;
    },
    // Search links
    searchLinks: (query) => {
      update((state) => {
        const filteredLinks = query ? state.links.filter(
          (link) => link.originalUrl.toLowerCase().includes(query.toLowerCase()) || link.shortCode.toLowerCase().includes(query.toLowerCase()) || link.shortUrl && link.shortUrl.toLowerCase().includes(query.toLowerCase())
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
        searchQuery: ""
      });
    }
  };
};
const links = createLinksStore();
export {
  links as l
};
