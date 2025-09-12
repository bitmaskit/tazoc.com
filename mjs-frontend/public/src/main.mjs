// Application State
let currentUser = null;
let links = [];
let filteredLinks = [];

// DOM Elements
const elements = {
  loading: document.getElementById('loading'),
  landing: document.getElementById('landing'),
  dashboard: document.getElementById('dashboard'),
  
  // URL Shortener Form
  shortenForm: document.getElementById('shorten-form'),
  urlInput: document.getElementById('url-input'),
  urlLoading: document.getElementById('url-loading'),
  urlError: document.getElementById('url-error'),
  shortenBtn: document.getElementById('shorten-btn'),
  
  // Results
  successResult: document.getElementById('success-result'),
  shortUrl: document.getElementById('short-url'),
  copyBtn: document.getElementById('copy-btn'),
  originalUrl: document.getElementById('original-url'),
  errorResult: document.getElementById('error-result'),
  errorMessage: document.getElementById('error-message'),
  
  // Links Dashboard
  refreshLinks: document.getElementById('refresh-links'),
  searchLinks: document.getElementById('search-links'),
  linksLoading: document.getElementById('links-loading'),
  linksEmpty: document.getElementById('links-empty'),
  linksContainer: document.getElementById('links-container')
};

// Utility Functions
function showElement(element) {
  element.classList.remove('hidden');
}

function hideElement(element) {
  element.classList.add('hidden');
}

function showLoading(loadingElement) {
  showElement(loadingElement);
}

function hideLoading(loadingElement) {
  hideElement(loadingElement);
}

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showCopySuccess();
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showCopySuccess();
  }
}

function showCopySuccess() {
  const copyBtn = elements.copyBtn;
  const originalHTML = copyBtn.innerHTML;
  
  copyBtn.innerHTML = `
    <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
    Copied!
  `;
  copyBtn.classList.remove('text-indigo-300', 'bg-indigo-900/20', 'hover:bg-indigo-900/30');
  copyBtn.classList.add('text-green-300', 'bg-green-900/20');
  
  setTimeout(() => {
    copyBtn.innerHTML = originalHTML;
    copyBtn.classList.remove('text-green-300', 'bg-green-900/20');
    copyBtn.classList.add('text-indigo-300', 'bg-indigo-900/20', 'hover:bg-indigo-900/30');
  }, 2000);
}

// Authentication Functions
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/me', { credentials: 'include' });
    const data = await response.json();
    
    if (data.authenticated && data.user) {
      currentUser = data.user;
      showAuthenticatedView();
    } else {
      currentUser = null;
      showAnonymousView();
    }
  } catch (err) {
    console.error('Failed to check auth status:', err);
    currentUser = null;
    showAnonymousView();
  }
}

function showAuthenticatedView() {
  hideElement(elements.loading);
  hideElement(elements.landing);
  showElement(elements.dashboard);
  
  // Update user info in sidebar and mobile nav
  const sidebarAvatar = document.getElementById('user-avatar-sidebar');
  const sidebarName = document.getElementById('user-name-sidebar');
  const mobileAvatar = document.getElementById('user-avatar-mobile');
  
  console.log('Setting avatar:', currentUser.avatar_url); // Debug log
  
  if (sidebarAvatar && currentUser.avatar_url) {
    sidebarAvatar.src = currentUser.avatar_url;
    console.log('Sidebar avatar src set to:', sidebarAvatar.src); // Debug log
  }
  if (sidebarName) sidebarName.textContent = currentUser.name || currentUser.login;
  if (mobileAvatar && currentUser.avatar_url) {
    mobileAvatar.src = currentUser.avatar_url;
    console.log('Mobile avatar src set to:', mobileAvatar.src); // Debug log
  }
  
  // Load user's links
  loadLinks();
}

function showAnonymousView() {
  hideElement(elements.loading);
  hideElement(elements.dashboard);
  showElement(elements.landing);
}

async function handleLogin() {
  window.location.href = '/api/login';
}

async function handleLogout() {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    currentUser = null;
    links = [];
    filteredLinks = [];
    showAnonymousView();
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

// URL Shortener Functions
async function handleShortenUrl(event) {
  event.preventDefault();
  
  // Reset states
  hideElement(elements.successResult);
  hideElement(elements.errorResult);
  hideElement(elements.urlError);
  
  const url = elements.urlInput.value.trim();
  
  // Validate URL
  if (!url) {
    showUrlError('Please enter a URL');
    return;
  }
  
  if (!validateUrl(url)) {
    showUrlError('Please enter a valid URL (must start with http:// or https://)');
    return;
  }
  
  // Show loading state
  showLoading(elements.urlLoading);
  elements.shortenBtn.disabled = true;
  elements.shortenBtn.textContent = 'Shortening...';
  
  try {
    const response = await fetch('/api/shorten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Show success
    showShortenSuccess(data);
    elements.urlInput.value = '';
    
    // Refresh links list
    loadLinks();
    
  } catch (err) {
    console.error('URL shortening error:', err);
    showShortenError(err.message || 'Failed to shorten URL. Please try again.');
  } finally {
    hideLoading(elements.urlLoading);
    elements.shortenBtn.disabled = false;
    elements.shortenBtn.textContent = 'Shorten URL';
  }
}

function showUrlError(message) {
  elements.urlError.textContent = message;
  showElement(elements.urlError);
  elements.urlInput.classList.add('ring-red-500', 'focus:ring-red-500');
  elements.urlInput.classList.remove('ring-white/20', 'focus:ring-indigo-400');
}

function showShortenSuccess(data) {
  elements.shortUrl.textContent = data.shortUrl;
  elements.originalUrl.textContent = `Original: ${data.originalUrl}`;
  showElement(elements.successResult);
  
  // Reset input styling
  elements.urlInput.classList.remove('ring-red-500', 'focus:ring-red-500');
  elements.urlInput.classList.add('ring-white/20', 'focus:ring-indigo-400');
}

function showShortenError(message) {
  elements.errorMessage.textContent = message;
  showElement(elements.errorResult);
}

// Links Dashboard Functions
async function loadLinks() {
  showLoading(elements.linksLoading);
  hideElement(elements.linksEmpty);
  hideElement(elements.linksContainer);
  
  try {
    const response = await fetch('/api/links', {
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    links = data.links || [];
    filteredLinks = [...links];
    renderLinks();
    
  } catch (err) {
    console.error('Failed to fetch links:', err);
    // Show empty state on error
    links = [];
    filteredLinks = [];
    showElement(elements.linksEmpty);
    elements.linksEmpty.querySelector('h3').textContent = 'Failed to load links';
    elements.linksEmpty.querySelector('p').textContent = 'Please try refreshing the page.';
  } finally {
    hideLoading(elements.linksLoading);
  }
}

function renderLinks() {
  const container = elements.linksContainer;
  
  if (filteredLinks.length === 0) {
    showElement(elements.linksEmpty);
    hideElement(container);
    return;
  }
  
  hideElement(elements.linksEmpty);
  showElement(container);
  
  container.innerHTML = '';
  
  filteredLinks.forEach(link => {
    const linkElement = createLinkElement(link);
    container.appendChild(linkElement);
  });
}

function createLinkElement(link) {
  const div = document.createElement('div');
  div.className = 'bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors';
  
  div.innerHTML = `
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <!-- Short URL -->
        <div class="flex items-center space-x-2 mb-2">
          <code class="text-sm font-mono text-indigo-400 bg-indigo-900/20 px-2 py-1 rounded">
            ${link.shortUrl || `${window.location.origin}/${link.shortCode}`}
          </code>
          <button
            onclick="copyLinkUrl('${link.shortUrl || `${window.location.origin}/${link.shortCode}`}')"
            class="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-400 hover:text-white transition-colors"
          >
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.375a2.25 2.25 0 01-2.25-2.25V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
          </button>
        </div>
        
        <!-- Original URL -->
        <p class="text-sm text-gray-300 truncate mb-2" title="${link.originalUrl}">
          ${link.originalUrl}
        </p>
        
        <!-- Stats and Meta -->
        <div class="flex items-center space-x-4 text-xs text-gray-400">
          <span class="flex items-center">
            <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
            </svg>
            ${link.clicks || 0} clicks
          </span>
          <span class="flex items-center">
            <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
            </svg>
            ${formatDate(link.createdAt)}
          </span>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex items-center space-x-2 ml-4">
        <button
          onclick="viewAnalytics('${link.shortCode}')"
          class="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 transition-colors"
        >
          <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          Analytics
        </button>
        <button
          onclick="deleteLink('${link.shortCode}')"
          class="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-red-300 bg-red-900/20 hover:bg-red-900/30 transition-colors"
        >
          <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  `;
  
  return div;
}

function filterLinks(searchQuery) {
  if (!searchQuery.trim()) {
    filteredLinks = [...links];
  } else {
    const query = searchQuery.toLowerCase();
    filteredLinks = links.filter(link =>
      link.originalUrl.toLowerCase().includes(query) ||
      link.shortCode.toLowerCase().includes(query) ||
      (link.shortUrl && link.shortUrl.toLowerCase().includes(query))
    );
  }
  renderLinks();
}

// Global functions for onclick handlers
window.copyLinkUrl = async function(url) {
  await copyToClipboard(url);
};

window.viewAnalytics = function(shortCode) {
  const link = links.find(l => l.shortCode === shortCode);
  if (link) {
    alert(`Analytics for ${link.shortUrl || shortCode}\n\n${link.clicks || 0} clicks\n\nDetailed analytics coming soon!`);
  }
};

window.deleteLink = async function(shortCode) {
  const link = links.find(l => l.shortCode === shortCode);
  if (!link) return;
  
  if (!confirm(`Are you sure you want to delete the link ${link.shortUrl || shortCode}?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/links/${shortCode}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Remove from local arrays
    links = links.filter(l => l.shortCode !== shortCode);
    filteredLinks = filteredLinks.filter(l => l.shortCode !== shortCode);
    renderLinks();
    
  } catch (err) {
    console.error('Failed to delete link:', err);
    alert(`Failed to delete link: ${err.message}`);
  }
};

// Event Listeners
document.getElementById('login-btn').addEventListener('click', handleLogin);
document.getElementById('login-btn-header').addEventListener('click', handleLogin);
document.getElementById('logout-btn-mobile').addEventListener('click', handleLogout);
elements.shortenForm.addEventListener('submit', handleShortenUrl);
elements.copyBtn.addEventListener('click', () => {
  const url = elements.shortUrl.textContent;
  if (url) {
    copyToClipboard(url);
  }
});
elements.refreshLinks.addEventListener('click', loadLinks);
elements.searchLinks.addEventListener('input', (e) => {
  filterLinks(e.target.value);
});

// URL input validation
elements.urlInput.addEventListener('input', () => {
  hideElement(elements.urlError);
  elements.urlInput.classList.remove('ring-red-500', 'focus:ring-red-500');
  elements.urlInput.classList.add('ring-white/20', 'focus:ring-indigo-400');
});

// Initialize the application
checkAuthStatus();

// Add test function for avatar display (temporary)
window.testAvatarDisplay = function() {
  currentUser = {
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    name: 'Test User',
    login: 'testuser'
  };
  showAuthenticatedView();
};
