import { F as store_get, G as ensure_array_like, I as unsubscribe_stores, B as pop, z as push } from "../../../chunks/index2.js";
import { a as attr, b as auth } from "../../../chunks/auth.js";
import { l as links } from "../../../chunks/links.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "../../../chunks/state.svelte.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  const authState = auth;
  const linksState = links;
  let urlInput = "";
  let isShortening = false;
  let searchQuery = "";
  let userDropdownOpen = false;
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
  const filteredLinks = store_get($$store_subs ??= {}, "$linksState", linksState).links;
  if (store_get($$store_subs ??= {}, "$authState", authState).isLoading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="min-h-screen flex items-center justify-center"><div class="text-center"><div class="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div> <p class="text-lg font-medium text-white">Loading Val.io...</p></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (store_get($$store_subs ??= {}, "$authState", authState).isAuthenticated) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div><div class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col"><div class="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 after:pointer-events-none after:absolute after:inset-0 after:rounded-r-2xl after:border-r after:border-white/5"><div class="flex h-16 shrink-0 items-center"><div class="h-8 w-auto text-indigo-400 font-bold text-xl">Val.io</div></div> <nav class="flex flex-1 flex-col"><ul role="list" class="flex flex-1 flex-col gap-y-7"><li><ul role="list" class="flex flex-1 flex-col gap-y-7"><li><ul role="list" class="-mx-2 space-y-1"><li><button type="button" class="bg-white/5 text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left"><svg class="text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"></path></svg> Dashboard</button></li> <li><button type="button" class="text-gray-400 hover:bg-white/5 hover:text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left"><svg class="text-gray-400 group-hover:text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"></path></svg> Team</button></li> <li><button type="button" class="text-gray-400 hover:bg-white/5 hover:text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left"><svg class="text-gray-400 group-hover:text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"></path></svg> Projects</button></li> <li><button type="button" class="text-gray-400 hover:bg-white/5 hover:text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left"><svg class="text-gray-400 group-hover:text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5"></path></svg> Calendar</button></li> <li><button type="button" class="text-gray-400 hover:bg-white/5 hover:text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left"><svg class="text-gray-400 group-hover:text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 0014.25 8.25h-1.875"></path></svg> Documents</button></li> <li><button type="button" class="text-gray-400 hover:bg-white/5 hover:text-white group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold w-full text-left"><svg class="text-gray-400 group-hover:text-white size-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"></path></svg> About</button></li></ul></li></ul></li> <li class="-mx-6 mt-auto"><div class="relative"><button class="w-full flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-white hover:bg-white/5"${attr("aria-expanded", userDropdownOpen)}>`);
      if (store_get($$store_subs ??= {}, "$authState", authState).user?.avatar_url) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<img class="size-8 rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10"${attr("src", store_get($$store_subs ??= {}, "$authState", authState).user.avatar_url)}${attr("alt", store_get($$store_subs ??= {}, "$authState", authState).user.name || store_get($$store_subs ??= {}, "$authState", authState).user.login)}/>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--> <span class="sr-only">Your profile</span> <span aria-hidden="true">${escape_html(store_get($$store_subs ??= {}, "$authState", authState).user?.name || store_get($$store_subs ??= {}, "$authState", authState).user?.login)}</span> <svg class="ml-auto size-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"></path></svg></button> `);
      {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--></div></li></ul></nav></div></div> `);
      {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--> <div class="sticky top-0 z-40 flex items-center gap-x-6 bg-gray-900 px-4 py-4 after:pointer-events-none after:absolute after:inset-0 after:border-b after:border-white/10 after:bg-black/10 sm:px-6 lg:hidden"><button type="button" class="-m-2.5 p-2.5 text-gray-400 hover:text-white lg:hidden"><span class="sr-only">Open sidebar</span> <svg class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"></path></svg></button> <div class="flex-1 text-sm/6 font-semibold text-white">Dashboard</div> <div class="flex items-center gap-x-4">`);
      if (store_get($$store_subs ??= {}, "$authState", authState).user?.avatar_url) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<img class="size-8 rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10"${attr("src", store_get($$store_subs ??= {}, "$authState", authState).user.avatar_url)}${attr("alt", store_get($$store_subs ??= {}, "$authState", authState).user.name || store_get($$store_subs ??= {}, "$authState", authState).user.login)}/>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--></div></div> <main class="py-10 lg:pl-72"><div class="px-4 sm:px-6 lg:px-8"><div class="mb-8"><h1 class="text-2xl font-bold text-white mb-6">Dashboard</h1> <div class="mb-6"><div class="bg-white/5 backdrop-blur-sm rounded-lg p-6 ring-1 ring-white/10"><h2 class="text-lg font-semibold text-white mb-4">Shorten URL</h2> <form class="space-y-4"><div><label for="url-input" class="block text-sm font-medium text-gray-300 mb-2">Enter URL to shorten</label> <div class="relative"><input id="url-input"${attr("value", urlInput)} type="url" required placeholder="https://example.com/very/long/url" class="w-full rounded-md border-0 px-4 py-3 bg-white/10 text-white shadow-sm ring-1 ring-inset ring-white/20 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-400 sm:text-sm/6"/> `);
      {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--></div></div> <button type="submit"${attr("disabled", isShortening, true)} class="w-full rounded-md bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">${escape_html("Shorten URL")}</button></form> `);
      {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--> `);
      {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--></div></div> <div class="mb-6"><div class="bg-white/5 backdrop-blur-sm rounded-lg p-6 ring-1 ring-white/10"><div class="flex items-center justify-between mb-6"><h2 class="text-lg font-semibold text-white">Your Links</h2> <button class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-300 bg-indigo-900/20 hover:bg-indigo-900/30 transition-colors"><svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"></path></svg> Refresh</button></div> <div class="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:space-x-4"><div class="flex-1"><label for="search-links" class="sr-only">Search links</label> <div class="relative"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"></path></svg></div> <input${attr("value", searchQuery)} type="text" placeholder="Search by URL or short code..." class="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/></div></div></div> `);
      if (store_get($$store_subs ??= {}, "$linksState", linksState).isLoading) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<div class="text-center py-12"><svg class="animate-spin mx-auto h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <p class="mt-2 text-sm text-gray-400">Loading your links...</p></div>`);
      } else {
        $$payload.out.push("<!--[!-->");
        if (filteredLinks.length === 0) {
          $$payload.out.push("<!--[-->");
          $$payload.out.push(`<div class="text-center py-12"><svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"></path></svg> <h3 class="mt-2 text-sm font-medium text-gray-300">${escape_html("No links yet")}</h3> <p class="mt-1 text-sm text-gray-400">${escape_html("Start by shortening your first URL above.")}</p></div>`);
        } else {
          $$payload.out.push("<!--[!-->");
          const each_array = ensure_array_like(filteredLinks);
          $$payload.out.push(`<div class="space-y-4"><!--[-->`);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let link = each_array[$$index];
            $$payload.out.push(`<div class="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors"><div class="flex items-start justify-between"><div class="flex-1 min-w-0"><div class="flex items-center space-x-2 mb-2"><code class="text-sm font-mono text-indigo-400 bg-indigo-900/20 px-2 py-1 rounded">/${escape_html(link.shortCode)}</code> <button class="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-400 hover:text-white transition-colors" aria-label="Copy short URL to clipboard"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.375a2.25 2.25 0 01-2.25-2.25V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"></path></svg></button></div> <p class="text-sm text-gray-300 truncate mb-2"${attr("title", link.originalUrl)}>${escape_html(link.originalUrl)}</p> <div class="flex items-center space-x-4 text-xs text-gray-400"><span class="flex items-center"><svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"></path></svg> ${escape_html(link.clicks || 0)} clicks</span> <span class="flex items-center"><svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5"></path></svg> ${escape_html(formatDate(link.createdAt))}</span></div></div> <div class="flex items-center space-x-2 ml-4"><button class="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 transition-colors"><svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg> Analytics</button> <button class="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-red-300 bg-red-900/20 hover:bg-red-900/30 transition-colors"><svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"></path></svg> Delete</button></div></div></div>`);
          }
          $$payload.out.push(`<!--]--></div>`);
        }
        $$payload.out.push(`<!--]-->`);
      }
      $$payload.out.push(`<!--]--></div></div></div></div></main></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
